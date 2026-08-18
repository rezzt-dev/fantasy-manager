import type { APIRoute } from 'astro';
import { getToken, fetchOfficialAPI, fetchCurrentLineup, CMP } from '../../lib/fantasy/api-proxy';
import { buildLeagueAnalysis } from '../../lib/analysis/league-analysis';
import { analyzeClauseRisks } from '../../lib/recommendations/clause-risk';
import { recommendCaptain } from '../../lib/recommendations/captain';
import { fetchExternalSignals } from '../../lib/recommendations/external-intelligence';
import { fetchStarterInfo, type PlayerDetail } from '../../lib/analysis/starter-status';
import { buildPositionAverages, buildTeamStrength } from '../../lib/recommendations/points-estimator';
import { buildShrinkagePriors, buildTeamTiers } from '../../lib/engine/features/shrinkage';
import { computeOptimalLineup } from '../../lib/analysis/lineup-optimizer';
import { fetchAvailableFormations } from '../../lib/fantasy/formations';
import { fetchLeagueActivity } from '../../lib/fantasy/activity';
import { fetchTeamsMaster } from '../../lib/fantasy/teams';
import { enrichMarketPlayers } from '../../lib/fantasy/market-enrich';
import { fetchTeamElos } from '../../lib/engine/sources/clubelo';
import { fetchProbableLineups } from '../../lib/engine/sources/jornadaperfecta';
import { buildTeamMatcher } from '../../lib/engine/team-names';
import type { ProbableLineup } from '../../lib/engine/sources/types';
import type { FantasyLeague, TeamData, TeamLineup, TeamMoney, MarketPlayer, StandingEntry, Match, PlayerMaster, WeekInfo } from '../../types/fantasy';

// Cache simple en memoria del servidor para no saturar la API oficial.
const cache = new Map<string, { expiresAt: number; payload: unknown }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export const GET: APIRoute = async ({ url, cookies, session }) => {
  try {
    const leagueId = url.searchParams.get('leagueId');
    const teamIdParam = url.searchParams.get('teamId');

    if (!leagueId || !teamIdParam) {
      return new Response(JSON.stringify({ error: 'leagueId and teamId required' }), { status: 400 });
    }

    const teamId = parseInt(teamIdParam, 10);
    const token = await getToken(cookies, session);
    if (!token) {
      return new Response(JSON.stringify({ error: 'No token configured' }), { status: 401 });
    }

    const cacheKey = `${leagueId}:${teamId}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return new Response(JSON.stringify(cached.payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // La jornada actual la necesitamos para pedir la alineación completa por
    // semana; si falla, fetchCurrentLineup vuelve al endpoint genérico.
    const week = await fetchOfficialAPI<WeekInfo>(`${CMP}/week/current`, token);
    const currentWeek = week?.number ?? week?.weekNumber ?? 1;

    const [leagues, teamData, lineup, money, rawMarket, standing, allPlayers] = await Promise.all([
      fetchOfficialAPI<FantasyLeague[]>(`${CMP}/leagues`, token),
      fetchOfficialAPI<TeamData>(`${CMP}/leagues/${leagueId}/teams/${teamId}`, token),
      fetchCurrentLineup(token, teamId, currentWeek),
      fetchOfficialAPI<TeamMoney>(`${CMP}/teams/${teamId}/money`, token),
      fetchOfficialAPI<MarketPlayer[]>(`${CMP}/league/${leagueId}/market`, token),
      fetchOfficialAPI<StandingEntry[]>(`${CMP}/leagues/${leagueId}/standing`, token),
      fetchOfficialAPI<PlayerMaster[]>(`${CMP}/players`, token),
    ]);

    // Repara jugadores de mercado que vienen sin equipo; los cruzamos con el
    // catálogo global para mostrar siempre el club al que pertenecen.
    const market = enrichMarketPlayers(rawMarket, allPlayers);
    const calendar = await fetchOfficialAPI<Match[]>(`${CMP}/calendar`, token, { weekNumber: String(currentWeek) });

    const league = leagues.find((l) => l.id === leagueId);
    if (!league) {
      return new Response(JSON.stringify({ error: 'League not found' }), { status: 404 });
    }

    const analysis = await buildLeagueAnalysis(
      league,
      teamData,
      lineup,
      money,
      market,
      standing,
      week,
      calendar,
      allPlayers,
      {
        fetchTeamData: (lid, tid) => fetchOfficialAPI<TeamData>(`${CMP}/leagues/${lid}/teams/${tid}`, token),
        fetchTeamMoney: (tid) => fetchOfficialAPI<TeamMoney>(`${CMP}/teams/${tid}/money`, token),
      },
    );

    const ownPlayerIds = new Set(teamData.players.map((p) => p.playerMaster.id));
    const interestingPlayers = [
      ...teamData.players.map((p) => p.playerMaster),
      ...market.filter((m) => !ownPlayerIds.has(m.playerMaster.id)).map((m) => m.playerMaster),
    ].map((p) => ({ id: p.id, name: p.name, nickname: p.nickname, teamName: p.team?.name }));
    const externalResult = await fetchExternalSignals(interestingPlayers);
    analysis.externalSignals = externalResult.signals;
    analysis.leagueActivity = await fetchLeagueActivity(leagueId, token);
    analysis.starterInfo = await fetchStarterInfo(
      teamData.players.map((p) => p.playerMaster),
      (playerId) => fetchOfficialAPI<PlayerDetail>(`${CMP}/player/${playerId}/league/${leagueId}`, token),
    );

    // Mismas fuentes externas que /api/recommendations: Elo (ClubElo) y onces
    // probables/bajas (Jornada Perfecta) para un estimador coherente.
    const officialTeams = await fetchTeamsMaster(token);
    const teamElos = officialTeams.length > 0 ? await fetchTeamElos(officialTeams) : null;
    const probableData = officialTeams.length > 0 ? await fetchProbableLineups(officialTeams) : null;
    const probableLineups = new Map<number, ProbableLineup>();
    if (probableData) {
      const matchTeam = buildTeamMatcher(officialTeams);
      for (const match of probableData.matches) {
        for (const lineup of match.lineups) {
          const lineupTeamId = matchTeam(lineup.sourceTeamName);
          if (lineupTeamId !== null) probableLineups.set(lineupTeamId, lineup);
        }
      }
    }

    const teamTiers = buildTeamTiers(teamElos?.eloByTeamId ?? new Map());

    const estimatorContext = {
      teamStrength: buildTeamStrength(allPlayers),
      starterInfo: analysis.starterInfo,
      externalSignals: analysis.externalSignals,
      teamElos: teamElos?.eloByTeamId,
      probableLineups,
      injuryReport: probableData?.injuries,
      shrinkagePriors: buildShrinkagePriors(allPlayers, teamTiers),
      teamTiers,
      positionAverages: buildPositionAverages(allPlayers),
      newsCoverage: {
        feedsOk: externalResult.coverage.feedsOk.length,
        feedsTotal: externalResult.coverage.feedsOk.length + externalResult.coverage.feedsFailed.length,
      },
    };
    analysis.clauseRisks = analyzeClauseRisks(analysis, estimatorContext);
    analysis.captain = recommendCaptain(analysis, estimatorContext);

    const formations = await fetchAvailableFormations(token, league.config?.premiumFeatures?.formations === true);
    analysis.optimalLineup = computeOptimalLineup({
      squad: teamData.players,
      currentLineup: lineup,
      calendar,
      formations,
      context: estimatorContext,
      captainEnabled: league.config?.premiumFeatures?.captain === true,
    });

    const payload = {
      analysis,
      league,
      money,
      week,
      marketCount: market.length,
    };

    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[league-analysis] Error:', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
