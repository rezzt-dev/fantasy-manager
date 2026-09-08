import type { APIRoute } from 'astro';
import { getToken, fetchOfficialAPI, fetchCurrentLineup, CMP } from '../../lib/fantasy/api-proxy';
import { buildLeagueAnalysis } from '../../lib/analysis/league-analysis';
import { buildClauseMarket } from '../../lib/analysis/clause-market';
import { computeAvailableBudget } from '../../lib/analysis/tactical-scheme';
import { fetchExternalSignals } from '../../lib/recommendations/external-intelligence';
import { fetchStarterInfo, type PlayerDetail } from '../../lib/analysis/starter-status';
import { buildPositionAverages, buildTeamStrength, type EstimatorContext } from '../../lib/recommendations/points-estimator';
import { buildShrinkagePriors, buildTeamTiers } from '../../lib/engine/features/shrinkage';
import { buildFixtureSharesFromStats } from '../../lib/engine/features/fixture-components';
import { fetchAvailableFormations } from '../../lib/fantasy/formations';
import { fetchLeagueActivity } from '../../lib/fantasy/activity';
import { fetchTeamsMaster } from '../../lib/fantasy/teams';
import { enrichMarketPlayers } from '../../lib/fantasy/market-enrich';
import { fetchPlayerStats } from '../../lib/engine/player-stats';
import { fetchTeamElos } from '../../lib/engine/sources/clubelo';
import { fetchProbableLineups } from '../../lib/engine/sources/jornadaperfecta';
import { fetchConfirmedLineups } from '../../lib/engine/sources/sofascore';
import { fetchEuropeanFixtures } from '../../lib/engine/sources/uefa';
import { fetchValueTrends } from '../../lib/engine/sources/futbolfantasy';
import { buildTeamMatcher } from '../../lib/engine/team-names';
import { getClauseProtection } from '../../lib/clause-availability';
import { loadEngineParams } from '../../lib/engine/params';
import type { ProbableLineup } from '../../lib/engine/sources/types';
import type { FantasyLeague, TeamData, TeamMoney, MarketPlayer, StandingEntry, Match, PlayerMaster, WeekInfo } from '../../types/fantasy';

/**
 * Sección Clausulazos: jugadores de los rivales con la cláusula libre,
 * ordenados por lo que aportarían a tu once. Reutiliza el mismo pipeline de
 * datos y el mismo estimador que /api/recommendations, sin la persistencia de
 * track record ni el planificador multi-jornada (esta vista es interactiva).
 */

/** Candidatos a clausulazo que precalientan `playerStats` (acota peticiones). */
const CLAUSE_STATS_UNIVERSE = 30;
/** Candidatos para los que se buscan noticias externas. */
const CLAUSE_NEWS_UNIVERSE = 40;
/** Margen sobre el presupuesto para incluir objetivos financiables vendiendo. */
const AFFORDABILITY_MARGIN = 1.6;

const cache = new Map<string, { expiresAt: number; payload: unknown }>();
const CACHE_TTL_MS = 3 * 60 * 1000;

/** Proxy de rendimiento por partido para pre-rankear candidatos sin stats. */
function recentPointsPerGame(player: PlayerMaster): number {
  return Math.max(Number(player.averagePoints) || 0, (Number(player.lastSeasonPoints) || 0) / 38);
}

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

    await loadEngineParams();

    const week = await fetchOfficialAPI<WeekInfo>(`${CMP}/week/current`, token);
    const currentWeek = week?.number ?? week?.weekNumber ?? 1;

    const [leagues, teamData, lineup, money, rawMarket, standing, allPlayers] = await Promise.all([
      fetchOfficialAPI<FantasyLeague[]>(`${CMP}/leagues`, token),
      fetchOfficialAPI<TeamData>(`${CMP}/leagues/${leagueId}/teams/${teamId}`, token),
      fetchCurrentLineup(token, teamId, currentWeek, leagueId),
      fetchOfficialAPI<TeamMoney>(`${CMP}/teams/${teamId}/money`, token),
      fetchOfficialAPI<MarketPlayer[]>(`${CMP}/league/${leagueId}/market`, token),
      fetchOfficialAPI<StandingEntry[]>(`${CMP}/leagues/${leagueId}/standing`, token),
      fetchOfficialAPI<PlayerMaster[]>(`${CMP}/players`, token),
    ]);

    const market = enrichMarketPlayers(rawMarket, allPlayers);
    const calendar = await fetchOfficialAPI<Match[]>(`${CMP}/calendar`, token, { weekNumber: String(currentWeek) });

    const league = leagues.find((l) => l.id === leagueId);
    if (!league) {
      return new Response(JSON.stringify({ error: 'League not found' }), { status: 404 });
    }

    // Plantillas rivales (imprescindibles: son el catálogo de clausulables).
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

    const budget = computeAvailableBudget(money, league.team?.teamValue ?? 0);
    const ownPlayerIds = new Set(teamData.players.map((p) => p.playerMaster.id));

    // Universo de clausulables: rivales con la cláusula libre y un precio
    // alcanzable hoy o vendiendo (margen), ordenados por rendimiento.
    const clauseCandidates = analysis.rivals
      .flatMap((rival) => rival.players)
      .filter((tp) => {
        if (ownPlayerIds.has(tp.playerMaster.id)) return false;
        if (!(tp.buyoutClause > 0)) return false;
        if (tp.buyoutClause > budget.available * AFFORDABILITY_MARGIN) return false;
        return getClauseProtection(tp).status === 'available';
      })
      .map((tp) => tp.playerMaster)
      .sort((a, b) => recentPointsPerGame(b) - recentPointsPerGame(a));

    // Noticias: plantilla propia + mejores clausulables.
    const newsUniverse = [
      ...teamData.players.map((p) => p.playerMaster),
      ...clauseCandidates.slice(0, CLAUSE_NEWS_UNIVERSE),
    ].map((p) => ({ id: p.id, name: p.name, nickname: p.nickname, teamName: p.team?.name }));
    const externalResult = await fetchExternalSignals(newsUniverse);
    analysis.externalSignals = externalResult.signals;

    const leagueActivity = await fetchLeagueActivity(leagueId, token);
    analysis.leagueActivity = leagueActivity;

    const detailFetcher = (playerId: string) =>
      fetchOfficialAPI<PlayerDetail>(`${CMP}/player/${playerId}/league/${leagueId}`, token);

    const statsUniverse = [
      ...teamData.players.map((p) => p.playerMaster),
      ...clauseCandidates.slice(0, CLAUSE_STATS_UNIVERSE),
    ];
    const statsMap = await fetchPlayerStats(statsUniverse, detailFetcher);

    analysis.starterInfo = await fetchStarterInfo(
      teamData.players.map((p) => p.playerMaster),
      detailFetcher,
    );

    // Fuentes externas: Elo, onces probables/bajas, alineaciones confirmadas y
    // tendencias de valor. Ninguna es obligatoria: si falla, se sigue sin ella.
    const officialTeams = await fetchTeamsMaster(token);
    const teamElos = officialTeams.length > 0 ? await fetchTeamElos(officialTeams) : null;
    const probableData = officialTeams.length > 0 ? await fetchProbableLineups(officialTeams) : null;
    const probableLineups = new Map<number, ProbableLineup>();
    if (probableData) {
      const matchTeam = buildTeamMatcher(officialTeams);
      for (const match of probableData.matches) {
        for (const probable of match.lineups) {
          const lineupTeamId = matchTeam(probable.sourceTeamName);
          if (lineupTeamId !== null) probableLineups.set(lineupTeamId, probable);
        }
      }
    }

    const confirmedList = await fetchConfirmedLineups();
    const confirmedLineups = new Map<number, (typeof confirmedList)[number]>();
    if (confirmedList.length > 0 && officialTeams.length > 0) {
      const matchTeam = buildTeamMatcher(officialTeams);
      for (const confirmed of confirmedList) {
        const lineupTeamId = matchTeam(confirmed.sourceTeamName);
        if (lineupTeamId !== null) confirmedLineups.set(lineupTeamId, confirmed);
      }
    }

    const valueTrends = officialTeams.length > 0 ? await fetchValueTrends(allPlayers, officialTeams) : null;

    // Calendario europeo: un clausulazo es dinero irreversible, así que el
    // aviso de rotación por Champions tiene que llegar ANTES de pagarlo.
    const europeanData = officialTeams.length > 0 ? await fetchEuropeanFixtures(officialTeams) : null;

    const teamTiers = buildTeamTiers(teamElos?.eloByTeamId ?? new Map());
    const estimatorContext: EstimatorContext = {
      teamStrength: buildTeamStrength(allPlayers),
      starterInfo: analysis.starterInfo,
      externalSignals: analysis.externalSignals,
      playerStats: statsMap,
      positionAverages: buildPositionAverages(allPlayers),
      weekNumber: currentWeek,
      teamElos: teamElos?.eloByTeamId,
      probableLineups,
      injuryReport: probableData?.injuries,
      shrinkagePriors: buildShrinkagePriors(allPlayers, teamTiers),
      teamTiers,
      fixtureShares: buildFixtureSharesFromStats(
        statsUniverse.map((player) => ({ positionId: Number(player.positionId), playerStats: statsMap[player.id] || [] })),
        currentWeek,
      ),
      newsCoverage: {
        feedsOk: externalResult.coverage.feedsOk.length,
        feedsTotal: externalResult.coverage.feedsOk.length + externalResult.coverage.feedsFailed.length,
      },
      confirmedLineups,
      europeanFixtures: europeanData?.fixtures,
    };

    const formations = await fetchAvailableFormations(token, league.config?.premiumFeatures?.formations === true);

    const clauseMarket = buildClauseMarket({
      squad: teamData.players,
      rivals: analysis.rivals,
      market,
      calendar,
      formations,
      budget,
      ownNeeds: analysis.ownNeeds,
      externalSignals: analysis.externalSignals,
      buyoutClauseEnabled: league.config?.features?.buyoutClause !== false,
      captainEnabled: league.config?.premiumFeatures?.captain === true,
      coachEnabled: league.config?.premiumFeatures?.coach === true,
      context: estimatorContext,
      leagueActivity,
      valueTrends: valueTrends?.trendsByPlayerId,
    });

    console.log(
      `[clause-market] ${clauseMarket.targets.length} clausulables (${clauseMarket.stats.affordable} a tu alcance) ` +
        `de ${analysis.rivals.length} rivales · presupuesto ${budget.available}`,
    );

    const payload = {
      generatedAt: new Date().toISOString(),
      week: currentWeek,
      leagueId,
      clauseMarket,
      league,
      money,
    };

    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[clause-market] Error:', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
