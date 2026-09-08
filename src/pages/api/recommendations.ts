import { buildStrategyReport } from '../../lib/engine/strategy';
import { fetchApiFootballAbsences } from '../../lib/engine/sources/api-football';
import type { APIRoute } from 'astro';
import { generateRecommendations, computeBestMoves } from '../../lib/recommendations/engine';
import { getToken, fetchOfficialAPI, fetchCurrentLineup, CMP } from '../../lib/fantasy/api-proxy';
import { buildLeagueAnalysis } from '../../lib/analysis/league-analysis';
import { analyzeClauseRisks } from '../../lib/recommendations/clause-risk';
import { recommendCaptain } from '../../lib/recommendations/captain';
import { fetchExternalSignals } from '../../lib/recommendations/external-intelligence';
import { fetchStarterInfo, type PlayerDetail } from '../../lib/analysis/starter-status';
import {
  buildPositionAverages,
  buildTeamStrength,
  estimatePointsDetailed,
  estimatePointsLegacy,
  type EstimatorContext,
} from '../../lib/recommendations/points-estimator';
import { computeOptimalLineup } from '../../lib/analysis/lineup-optimizer';
import { computeAvailableBudget, computeTacticalScheme } from '../../lib/analysis/tactical-scheme';
import { fetchAvailableFormations } from '../../lib/fantasy/formations';
import { getClauseProtection } from '../../lib/clause-availability';
import { fetchPlayerStats } from '../../lib/engine/player-stats';
import { resolveTeamId } from '../../lib/engine/model';
import { fetchTeamsMaster } from '../../lib/fantasy/teams';
import { fetchTeamElos } from '../../lib/engine/sources/clubelo';
import { fetchLeagueActivity } from '../../lib/fantasy/activity';
import { fetchProbableLineups } from '../../lib/engine/sources/jornadaperfecta';
import { fetchConfirmedLineups } from '../../lib/engine/sources/sofascore';
import { fetchEuropeanFixtures } from '../../lib/engine/sources/uefa';
import { fetchValueTrends } from '../../lib/engine/sources/futbolfantasy';
import { buildShrinkagePriors, buildTeamTiers } from '../../lib/engine/features/shrinkage';
import { buildFixtureSharesFromStats } from '../../lib/engine/features/fixture-components';
import { buildFixtureOutlooks } from '../../lib/engine/features/fixture';
import { buildEuropeanOutlooks } from '../../lib/engine/features/european-load';
import { buildTeamMatcher } from '../../lib/engine/team-names';
import type { ProbableLineup } from '../../lib/engine/sources/types';
import {
  MODEL_VERSION,
  evaluateTrackRecord,
  evaluateWalkForward,
  persistLineup,
  persistMetrics,
  persistPredictions,
  persistRecommendations,
  persistScoringTable,
  settleTrackRecord,
  type PredictionRecord,
  type RecommendationRecord,
} from '../../lib/engine/track-record';
import { deriveScoringTable } from '../../lib/engine/scoring-table';
import { maybeWriteDailySnapshot } from '../../lib/engine/snapshots';
import { planMultiWeek } from '../../lib/engine/optimize';
import { loadEngineParams } from '../../lib/engine/params';
import { calibrateEngine, persistCalibration } from '../../lib/engine/calibrate';
import { fetchCalendarCached } from '../../lib/fantasy/calendar-cache';
import { enrichMarketPlayers } from '../../lib/fantasy/market-enrich';
import type { EuropeanOutlook, FantasyLeague, FixtureOutlook, TeamData, TeamLineup, TeamMoney, MarketPlayer, StandingEntry, Match, PlayerMaster, WeekInfo } from '../../types/fantasy';

/** Plantilla + mejores candidatos de mercado y clausulables (acotado para no multiplicar peticiones). */
const MARKET_STATS_UNIVERSE = 20;
const CLAUSE_STATS_UNIVERSE = 15;

/** Proxy de rendimiento por partido para pre-rankear candidatos sin stats. */
function recentPointsPerGame(player: PlayerMaster): number {
  return Math.max(Number(player.averagePoints) || 0, (Number(player.lastSeasonPoints) || 0) / 38);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
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

    // Parámetros calibrados del motor (data/engine-params.json, Fase 3).
    await loadEngineParams();

    // La jornada actual la necesitamos para pedir la alineación completa por
    // semana; si falla, fetchCurrentLineup vuelve al endpoint genérico.
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

    // La API de mercado suele devolver los jugadores sin equipo; los cruzamos
    // con el catálogo global para que siempre aparezca el club al que pertenecen.
    const market = enrichMarketPlayers(rawMarket, allPlayers);
    const calendar = await fetchOfficialAPI<Match[]>(`${CMP}/calendar`, token, { weekNumber: String(currentWeek) });

    const league = leagues.find((l) => l.id === leagueId);
    if (!league) {
      return new Response(JSON.stringify({ error: 'League not found' }), { status: 404 });
    }

    // Fuentes externas: Elo de equipos (ClubElo) para la dificultad del fixture.
    const officialTeams = await fetchTeamsMaster(token);
    const teamElos = officialTeams.length > 0 ? await fetchTeamElos(officialTeams) : null;
    if (teamElos && teamElos.origin === 'stale') {
      console.warn('[recommendations] ClubElo en modo stale (caché caducada).');
    }

    // Actividad reciente de la liga (liquidez y comportamiento de los rivales).
    const leagueActivity = await fetchLeagueActivity(leagueId, token);

    // Onces probables y bajas de la jornada (Jornada Perfecta) → xMins.
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

    // Tendencias de valor (FútbolFantasy Analytics) para el timing de mercado.
    const valueTrends = officialTeams.length > 0 ? await fetchValueTrends(allPlayers, officialTeams) : null;
    if (valueTrends) {
      console.log(`[recommendations] tendencias FF: ${valueTrends.matched} cruzadas, ${valueTrends.unmatched} sin cruzar (${valueTrends.origin})`);
    }

    // Calendario europeo (Champions, Europa League y Conference). Es lo que
    // permite anticipar a quién va a reservar cada equipo: el compromiso
    // europeo se conoce con semanas de antelación, así que la coordinación se
    // puede hacer ANTES de gastar el dinero, no después.
    const europeanData = officialTeams.length > 0 ? await fetchEuropeanFixtures(officialTeams) : null;
    if (europeanData && europeanData.fixtures.length > 0) {
      console.log(
        `[recommendations] carga europea: ${europeanData.fixtures.length} partidos de ` +
          `${europeanData.teamsInvolved.size} equipos de LaLiga (${europeanData.competitions.join(', ')})`,
      );
    }

    // Alineaciones confirmadas (Sofascore): solo existen ~1 h antes de cada
    // partido; fuera de ese margen la lista viene vacía y no cambia nada.
    const confirmedList = await fetchConfirmedLineups();
    const confirmedLineups = new Map<number, (typeof confirmedList)[number]>();
    if (confirmedList.length > 0 && officialTeams.length > 0) {
      const matchTeam = buildTeamMatcher(officialTeams);
      for (const lineup of confirmedList) {
        const lineupTeamId = matchTeam(lineup.sourceTeamName);
        if (lineupTeamId !== null) confirmedLineups.set(lineupTeamId, lineup);
      }
      console.log(`[recommendations] alineaciones confirmadas (Sofascore): ${confirmedLineups.size} equipos`);
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
    analysis.leagueActivity = leagueActivity;

    const detailFetcher = (playerId: string) =>
      fetchOfficialAPI<PlayerDetail>(`${CMP}/player/${playerId}/league/${leagueId}`, token);

    // Presupuesto unificado (efectivo + 20% del valor de plantilla) para
    // pre-seleccionar el universo de stats y para todo el motor.
    const budget = computeAvailableBudget(money, league.team?.teamValue ?? 0);

    // Universo acotado para precalentar playerStats (forma y componentes):
    // plantilla + mejores candidatos asequibles de mercado y clausulables.
    const marketCandidates = market
      .filter((m) => m.salePrice <= budget.available && !ownPlayerIds.has(m.playerMaster.id) && m.playerMaster.playerStatus === 'ok')
      .map((m) => m.playerMaster)
      .sort((a, b) => recentPointsPerGame(b) - recentPointsPerGame(a))
      .slice(0, MARKET_STATS_UNIVERSE);

    const clauseCandidates = analysis.rivals
      .flatMap((rival) => rival.players)
      .filter((tp) => {
        const player = tp.playerMaster;
        if (ownPlayerIds.has(player.id) || player.playerStatus !== 'ok') return false;
        if (!(tp.buyoutClause > 0) || tp.buyoutClause > budget.available) return false;
        return getClauseProtection(tp).status === 'available';
      })
      .map((tp) => tp.playerMaster)
      .sort((a, b) => recentPointsPerGame(b) - recentPointsPerGame(a))
      .slice(0, CLAUSE_STATS_UNIVERSE);

    const statsUniverse = [...teamData.players.map((p) => p.playerMaster), ...marketCandidates, ...clauseCandidates];
    const statsMap = await fetchPlayerStats(statsUniverse, detailFetcher);

    analysis.starterInfo = await fetchStarterInfo(
      teamData.players.map((p) => p.playerMaster),
      detailFetcher,
    );

    // Priors de shrinkage (§4.5): posición×tier con tiers desde Elo.
    const teamTiers = buildTeamTiers(teamElos?.eloByTeamId ?? new Map());

    // Reparto observado de puntos por componente y posición: es el prior hacia
    // el que se encoge el de cada jugador al ajustar el emparejamiento (§4.3).
    const fixtureShares = buildFixtureSharesFromStats(
      statsUniverse.map((player) => ({ positionId: Number(player.positionId), playerStats: statsMap[player.id] || [] })),
      currentWeek,
    );

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
      fixtureShares,
      newsCoverage: {
        feedsOk: externalResult.coverage.feedsOk.length,
        feedsTotal: externalResult.coverage.feedsOk.length + externalResult.coverage.feedsFailed.length,
      },
      confirmedLineups,
      europeanFixtures: europeanData?.fixtures,
    };
    const supplemental = await fetchApiFootballAbsences(statsUniverse, officialTeams, calendar);
    const strategy = buildStrategyReport({
      players: statsUniverse,
      ownPlayerIds,
      calendar,
      context: estimatorContext,
      additionalAbsences: supplemental.absences,
      sources: [
        { name: 'LaLiga Fantasy', status: 'available', detail: `${Object.values(statsMap).filter((stats) => stats.length > 0).length}/${new Set(statsUniverse.map((p) => p.id)).size} jugadores con histórico. Plantilla y mercado oficiales.` },
        { name: 'ClubElo', status: !teamElos ? 'unavailable' : teamElos.origin === 'stale' ? 'stale' : 'available', detail: `${teamElos?.eloByTeamId.size ?? 0} equipos con Elo.` },
        { name: 'Jornada Perfecta', status: !probableData ? 'unavailable' : probableData.origin === 'stale' ? 'stale' : 'available', detail: `${probableLineups.size} onces probables; ${probableData?.injuries.length ?? 0} avisos de bajas y dudas.` },
        { name: 'Sofascore', status: confirmedLineups.size ? 'available' : 'unavailable', detail: `${confirmedLineups.size} onces confirmados cruzados. Sin once puede significar que aún no se ha publicado o que la consulta falló.` },
        { name: 'FútbolFantasy', status: !valueTrends ? 'unavailable' : valueTrends.origin === 'stale' ? 'stale' : 'available', detail: `${valueTrends?.matched ?? 0} tendencias de valor cruzadas.` },
        {
          name: 'Competiciones europeas',
          status: europeanData && europeanData.fixtures.length > 0 ? 'available' : 'unavailable',
          detail: europeanData && europeanData.fixtures.length > 0
            ? `${europeanData.fixtures.length} partidos de ${europeanData.teamsInvolved.size} equipos de LaLiga en ${europeanData.competitions.length} competición(es).`
            : 'Sin calendario europeo: el motor no ajusta rotación ni fatiga por Champions.',
        },
        { name: 'Noticias', status: externalResult.coverage.feedsOk.length ? 'available' : 'unavailable', detail: `${externalResult.coverage.feedsOk.length} feeds disponibles; ${externalResult.coverage.feedsFailed.length} fallidos.` },
        supplemental.source,
      ],
    });
    analysis.clauseRisks = analyzeClauseRisks(analysis, estimatorContext);

    // Pronóstico de la jornada por equipo: la dificultad del emparejamiento y
    // su efecto por demarcación, calculado una vez y reutilizado en la
    // respuesta para explicar cada recomendación sin recalcular nada.
    const fixtureOutlooks = buildFixtureOutlooks({
      calendar,
      eloByTeamId: teamElos?.eloByTeamId ?? new Map(),
      sharesByPosition: fixtureShares,
    });
    // Carga europea por equipo de la jornada: se calcula una vez y se adjunta
    // a cada recomendación para que la interfaz pueda avisar sin recalcular.
    const europeanOutlooks = buildEuropeanOutlooks({
      calendar,
      fixtures: europeanData?.fixtures ?? [],
      teamTiers,
    });
    const europeanOfPlayer = (player: PlayerMaster): EuropeanOutlook | null => {
      const playerTeamId = resolveTeamId(player);
      return playerTeamId === undefined ? null : europeanOutlooks.get(playerTeamId) ?? null;
    };

    const fixtureOfPlayer = (player: PlayerMaster): FixtureOutlook | null => {
      const playerTeamId = resolveTeamId(player);
      if (playerTeamId === undefined) return null;
      const outlook = fixtureOutlooks.get(playerTeamId);
      if (!outlook) return null;
      const positionMultiplier = outlook.multiplierByPosition?.[Number(player.positionId)];
      return positionMultiplier === undefined ? outlook : { ...outlook, multiplier: positionMultiplier };
    };

    const formations = await fetchAvailableFormations(token, league.config?.premiumFeatures?.formations === true);
    const captainEnabled = league.config?.premiumFeatures?.captain === true;
    analysis.optimalLineup = computeOptimalLineup({
      squad: teamData.players,
      currentLineup: lineup,
      calendar,
      formations,
      context: estimatorContext,
      captainEnabled,
    });

    // El capitán se calcula después del once óptimo para poder proponer también
    // el brazalete del "mejor once". Solo se omite si la liga lo desactiva.
    analysis.captain =
      league.config?.premiumFeatures?.captain === false
        ? undefined
        : recommendCaptain(analysis, estimatorContext, { optimalLineup: analysis.optimalLineup, enabled: captainEnabled });

    // Esquema táctico con presupuesto: mejor once alcanzable combinando
    // plantilla, mercado y cláusulas de rivales.
    const schemeInput = {
      squad: teamData.players,
      market,
      rivals: analysis.rivals,
      money,
      teamValue: league.team?.teamValue ?? 0,
      buyoutClauseEnabled: league.config?.features?.buyoutClause ?? false,
      calendar,
      formations,
      context: estimatorContext,
      captainEnabled,
    };
    const tacticalScheme = computeTacticalScheme(schemeInput);

    // Planificador multi-jornada (§5.3): DP sobre los frentes de Pareto de
    // las próximas 3 jornadas con presupuesto dinámico y fricción de
    // movimientos. Nunca debe romper la respuesta si falla.
    let multiWeekPlan;
    try {
      const futureCalendars = await Promise.all(
        [currentWeek + 1, currentWeek + 2].map((w) =>
          fetchOfficialAPI<Match[]>(`${CMP}/calendar`, token, { weekNumber: String(w) }).catch(() => [] as Match[]),
        ),
      );
      const calendars = [
        { week: currentWeek, matches: calendar },
        ...futureCalendars.map((matches, i) => ({ week: currentWeek + 1 + i, matches })),
      ].filter((c) => c.matches.length > 0);
      if (calendars.length > 1) {
        multiWeekPlan = planMultiWeek(schemeInput, calendars, budget.available) ?? undefined;
      }
    } catch (planError) {
      console.warn('[recommendations] multi-week plan failed:', planError instanceof Error ? planError.message : planError);
    }

    const recommendations = generateRecommendations({ analysis, estimatorContext, valueTrends: valueTrends?.trendsByPlayerId }).map(
      (recommendation) => ({
        ...recommendation,
        fixture: fixtureOfPlayer(recommendation.player),
        european: europeanOfPlayer(recommendation.player),
      }),
    );
    const bestMoves = computeBestMoves(recommendations);

    // Track record + snapshot diario (§6.1, §7.2): persistencia local que no
    // debe romper nunca la respuesta de la API.
    try {
      await maybeWriteDailySnapshot({ leagueId, week: currentWeek, allPlayers, market });

      const recordedAt = new Date().toISOString();
      const predictionRecords: PredictionRecord[] = statsUniverse.map((player) => {
        const prediction = estimatePointsDetailed(player, calendar, estimatorContext);
        const playerTeamId = resolveTeamId(player);
        const homeMatch = playerTeamId !== undefined ? calendar.find((m) => m.localId === playerTeamId) : undefined;
        const awayMatch = playerTeamId !== undefined ? calendar.find((m) => m.visitorId === playerTeamId) : undefined;
        return {
          playerId: player.id,
          week: currentWeek,
          leagueId,
          recordedAt,
          modelVersion: MODEL_VERSION,
          xp: round2(prediction.xp),
          xpLegacy: round2(estimatePointsLegacy(player, calendar, estimatorContext)),
          expectedMinutes: prediction.expectedMinutes !== null ? Math.round(prediction.expectedMinutes) : null,
          pStarter: prediction.pStarter !== null ? round2(prediction.pStarter) : null,
          source: prediction.source,
          dataQuality: prediction.dataQuality.level,
          context: {
            positionId: player.positionId,
            teamId: playerTeamId,
            opponentTeamId: homeMatch ? homeMatch.visitorId : awayMatch ? awayMatch.localId : undefined,
            isHome: homeMatch ? true : awayMatch ? false : undefined,
            fixtureDifficulty: prediction.fixture?.difficulty,
            fixtureMultiplier: prediction.fixture?.multiplier,
          },
          actualPoints: null,
          settledAt: null,
        };
      });
      const predictionsResult = await persistPredictions(currentWeek, predictionRecords);

      const recommendationRecords: RecommendationRecord[] = recommendations.map((rec) => ({
        playerId: rec.player.id,
        week: currentWeek,
        leagueId,
        teamId,
        recordedAt,
        modelVersion: MODEL_VERSION,
        type: rec.type,
        deltaXp: round2(rec.impactScore ?? 0),
        price: rec.estimatedValue,
        actualPoints: null,
        settledAt: null,
      }));
      const recommendationsResult = await persistRecommendations(currentWeek, recommendationRecords);

      // Liquidación de jornadas cerradas con los puntos reales de playerStats.
      const resolveOutcome = async (playerId: string, weekNumber: number): Promise<{ points: number; idealXi: boolean } | null> => {
        let stats = statsMap[playerId];
        if (!stats) {
          stats = (await fetchPlayerStats([{ id: playerId }], detailFetcher))[playerId] || [];
        }
        const entry = stats.find((s) => s.weekNumber === weekNumber);
        return typeof entry?.totalPoints === 'number' ? { points: entry.totalPoints, idealXi: entry.isInIdealFormation === true } : null;
      };
      const settle = await settleTrackRecord(currentWeek, resolveOutcome);

      // Once recomendado de la jornada (§6.1): base del top-11 hit rate.
      if (analysis.optimalLineup) {
        await persistLineup({
          week: currentWeek,
          leagueId,
          teamId,
          recordedAt,
          modelVersion: MODEL_VERSION,
          formation: analysis.optimalLineup.formation,
          starters: analysis.optimalLineup.starters.map((e) => ({ playerId: e.player.id, xp: round2(e.expectedPoints) })),
          captainId: analysis.optimalLineup.captain?.player.id,
          source: 'recommended',
        });
      }

      // Métricas walk-forward (vacías en pretemporada), MAE sobre lo ya
      // liquidado, y tabla de puntuación derivada cuando haya jornadas.
      const metrics = evaluateWalkForward(statsMap);
      const trackRecordMetrics = await evaluateTrackRecord(currentWeek);
      await persistMetrics({ leagueId, week: currentWeek, ...metrics, trackRecord: trackRecordMetrics });
      const scoringTable = deriveScoringTable(
        statsUniverse.map((player) => ({ positionId: player.positionId, playerStats: statsMap[player.id] || [] })),
      );
      if (scoringTable) await persistScoringTable(scoringTable);

      // Calibración walk-forward de pesos (Fase 3): se activa con ≥30
      // muestras jugador-jornada liquidadas; si no, solo anota el estado.
      const statsWeeks = new Set<number>();
      for (const stats of Object.values(statsMap)) {
        for (const s of stats) statsWeeks.add(s.weekNumber);
      }
      const pastWeeks = [...statsWeeks].filter((w) => w < currentWeek);
      const calendarsByWeek = new Map<number, Match[]>();
      await Promise.all(pastWeeks.map(async (w) => calendarsByWeek.set(w, await fetchCalendarCached(w, currentWeek, token))));
      const calibration = await calibrateEngine({
        statsByPlayer: statsMap,
        playersById: new Map(statsUniverse.map((p) => [p.id, p])),
        calendarsByWeek,
        context: estimatorContext,
        currentParams: await loadEngineParams(),
      });
      await persistCalibration(calibration);

      console.log(
        `[track-record] predicciones +${predictionsResult.appended} (${predictionsResult.skipped} ya estaban), ` +
          `recomendaciones +${recommendationsResult.appended}, liquidados ${settle.recordsSettled}, ` +
          `MAE legacy=${metrics.maeLegacy} v1=${metrics.maeV1} (n=${metrics.samples})`,
      );
    } catch (persistError) {
      console.warn('[track-record] persist failed:', persistError instanceof Error ? persistError.message : persistError);
    }

    return new Response(JSON.stringify({ recommendations, bestMoves, strategy, optimalLineup: analysis.optimalLineup, captain: analysis.captain ?? null, captainEnabled, tacticalScheme, multiWeekPlan: multiWeekPlan ?? null, fixtures: [...fixtureOutlooks.values()], european: [...europeanOutlooks.values()], league, money, week, marketCount: market.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[recommendations] Error:', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
