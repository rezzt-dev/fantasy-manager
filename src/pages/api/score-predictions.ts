import type { APIRoute } from 'astro';
import { getToken, fetchOfficialAPI, CMP } from '../../lib/fantasy/api-proxy';
import { fetchTeamsMaster } from '../../lib/fantasy/teams';
import { fetchTeamElos } from '../../lib/engine/sources/clubelo';
import { fetchProbableLineups } from '../../lib/engine/sources/jornadaperfecta';
import { fetchConfirmedLineups } from '../../lib/engine/sources/sofascore';
import { buildTeamMatcher } from '../../lib/engine/team-names';
import { buildTeamStrength, buildPositionAverages } from '../../lib/recommendations/points-estimator';
import { buildShrinkagePriors, buildTeamTiers } from '../../lib/engine/features/shrinkage';
import type { EstimatorContext } from '../../lib/recommendations/points-estimator';
import type { ProbableLineup } from '../../lib/engine/sources/types';
import { fetchAvailableFormations } from '../../lib/fantasy/formations';
import { predictTeamScore } from '../../lib/analysis/team-score-predictor';
import {
  appendScorePredictionHistory,
  loadScorePredictionHistory,
  saveScorePredictions,
} from '../../lib/engine/score-predictions-persistence';
import type {
  FantasyLeague,
  TeamData,
  TeamLineup,
  TeamMoney,
  StandingEntry,
  WeekInfo,
  Match,
  PlayerMaster,
} from '../../types/fantasy';
import type { ScorePredictionsResponse, TeamScorePrediction } from '../../types/analysis';

async function withConcurrency<T>(items: T[], fn: (item: T) => Promise<void>, concurrency = 5) {
  const queue = [...items];
  const running = new Set<Promise<void>>();
  while (queue.length > 0 || running.size > 0) {
    while (running.size < concurrency && queue.length > 0) {
      const item = queue.shift()!;
      const promise = fn(item).finally(() => running.delete(promise));
      running.add(promise);
    }
    if (running.size > 0) await Promise.race(running);
  }
}

async function fetchWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return fn();
  }
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

    const [leagues, teamData, ownLineup, money, standing, week, allPlayers] = await Promise.all([
      fetchOfficialAPI<FantasyLeague[]>(`${CMP}/leagues`, token),
      fetchOfficialAPI<TeamData>(`${CMP}/leagues/${leagueId}/teams/${teamId}`, token),
      fetchOfficialAPI<TeamLineup>(`${CMP}/teams/${teamId}/lineup`, token),
      fetchOfficialAPI<TeamMoney>(`${CMP}/teams/${teamId}/money`, token),
      fetchOfficialAPI<StandingEntry[]>(`${CMP}/leagues/${leagueId}/standing`, token),
      fetchOfficialAPI<WeekInfo>(`${CMP}/week/current`, token),
      fetchOfficialAPI<PlayerMaster[]>(`${CMP}/players`, token),
    ]);

    const league = leagues.find((l) => l.id === leagueId);
    if (!league) {
      return new Response(JSON.stringify({ error: 'League not found' }), { status: 404 });
    }

    const currentWeek = week?.number ?? week?.weekNumber ?? 1;
    const calendar = await fetchOfficialAPI<Match[]>(`${CMP}/calendar`, token, { weekNumber: String(currentWeek) });

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

    const confirmedList = await fetchConfirmedLineups();
    const confirmedLineups = new Map<number, (typeof confirmedList)[number]>();
    if (confirmedList.length > 0 && officialTeams.length > 0) {
      const matchTeam = buildTeamMatcher(officialTeams);
      for (const lineup of confirmedList) {
        const lineupTeamId = matchTeam(lineup.sourceTeamName);
        if (lineupTeamId !== null) confirmedLineups.set(lineupTeamId, lineup);
      }
    }

    const formations = await fetchAvailableFormations(token, league.config?.premiumFeatures?.formations === true);
    const captainEnabled = league.config?.premiumFeatures?.captain === true;
    const coachEnabled = league.config?.premiumFeatures?.coach === true;

    const teamTiers = buildTeamTiers(teamElos?.eloByTeamId ?? new Map());

    const estimatorContext: EstimatorContext = {
      teamStrength: buildTeamStrength(allPlayers),
      positionAverages: buildPositionAverages(allPlayers),
      weekNumber: currentWeek,
      teamElos: teamElos?.eloByTeamId,
      probableLineups,
      injuryReport: probableData?.injuries,
      shrinkagePriors: buildShrinkagePriors(allPlayers, teamTiers),
      teamTiers,
      confirmedLineups,
    };

    // Cargar plantillas de todos los equipos de la clasificación.
    const teamDataById = new Map<number, TeamData>();
    teamDataById.set(teamId, teamData);

    const lineupsById = new Map<number, TeamLineup>();
    lineupsById.set(teamId, ownLineup);

    const rivalEntries = standing.filter((entry) => Number(entry.team.id) !== teamId);

    await withConcurrency(
      rivalEntries,
      async (entry) => {
        const rivalTeamId = Number(entry.team.id);
        try {
          const data = await fetchWithRetry(() => fetchOfficialAPI<TeamData>(`${CMP}/leagues/${leagueId}/teams/${rivalTeamId}`, token));
          teamDataById.set(rivalTeamId, data);

          // Intentamos cargar la alineación real; normalmente fallará con 403
          // para rivales, pero si algún día la API la expone, la aprovechamos.
          try {
            const lineup = await fetchOfficialAPI<TeamLineup>(`${CMP}/teams/${rivalTeamId}/lineup`, token);
            lineupsById.set(rivalTeamId, lineup);
          } catch {
            // Alineación de rival no disponible: se inferirá desde la plantilla.
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'unknown';
          console.warn(`[score-predictions] Failed to load rival ${rivalTeamId}: ${message}`);
        }
      },
      5,
    );

    const notes: string[] = [];
    if (!teamElos) notes.push('Sin ratings Elo: las predicciones de entrenador y fixture usan fallback.');
    if (!probableData) notes.push('Sin onces probables de Jornada Perfecta: los minutos esperados usan histórico o valores por defecto.');

    const predictions: TeamScorePrediction[] = [];
    for (const entry of standing) {
      const id = Number(entry.team.id);
      const data = teamDataById.get(id);
      if (!data) {
        notes.push(`No se pudo cargar la plantilla de ${entry.team.manager?.managerName ?? id}.`);
        continue;
      }

      const isOwn = id === teamId;
      const prediction = predictTeamScore({
        teamId: id,
        managerId: entry.team.managerId,
        managerName: entry.team.manager?.managerName ?? `Equipo ${id}`,
        teamValue: entry.team.teamValue,
        players: data.players,
        currentLineup: lineupsById.get(id),
        calendar,
        formations,
        context: estimatorContext,
        captainEnabled,
        coachEnabled,
        teamElos: teamElos?.eloByTeamId,
      });
      predictions.push(prediction);

      if (!isOwn && !lineupsById.has(id)) {
        notes.push(`Alineación de ${prediction.managerName} inferida desde la plantilla.`);
      }
    }

    predictions.sort((a, b) => b.predictedLineup.totalExpected - a.predictedLineup.totalExpected);

    const response: ScorePredictionsResponse = {
      week: currentWeek,
      leagueId,
      generatedAt: new Date().toISOString(),
      coachEnabled,
      captainEnabled,
      benchEnabled: true,
      predictions,
      notes: [...new Set(notes)],
    };

    try {
      await saveScorePredictions(leagueId, currentWeek, response);
      await appendScorePredictionHistory(response);
    } catch (persistError) {
      console.warn('[score-predictions] persist failed:', persistError instanceof Error ? persistError.message : persistError);
    }

    const history = await loadScorePredictionHistory(leagueId);

    return new Response(JSON.stringify({ ...response, history }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[score-predictions] Error:', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
