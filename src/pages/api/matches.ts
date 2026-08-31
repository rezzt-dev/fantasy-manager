import type { APIRoute } from 'astro';
import { getToken, fetchOfficialAPI, CMP } from '../../lib/fantasy/api-proxy';
import { buildMatchesForWeek, sortMatches } from '../../lib/engine/matches';
import type { TeamData, WeekInfo, Match, MatchesResponse } from '../../types/fantasy';

export const GET: APIRoute = async ({ url, cookies, session }) => {
  try {
    const leagueId = url.searchParams.get('leagueId');
    const teamIdParam = url.searchParams.get('teamId');

    if (!leagueId || !teamIdParam) {
      return new Response(JSON.stringify({ error: 'leagueId and teamId required' }), { status: 400 });
    }

    const teamId = parseInt(teamIdParam, 10);
    if (!Number.isFinite(teamId)) {
      return new Response(JSON.stringify({ error: 'teamId must be a number' }), { status: 400 });
    }

    const weekParam = url.searchParams.get('week');
    const requestedWeek = weekParam !== null ? parseInt(weekParam, 10) : null;
    if (weekParam !== null && !Number.isFinite(requestedWeek)) {
      return new Response(JSON.stringify({ error: 'week must be a number' }), { status: 400 });
    }

    const token = await getToken(cookies, session);
    if (!token) {
      return new Response(JSON.stringify({ error: 'No token configured' }), { status: 401 });
    }

    const [teamData, week] = await Promise.all([
      fetchOfficialAPI<TeamData>(`${CMP}/leagues/${leagueId}/teams/${teamId}`, token),
      fetchOfficialAPI<WeekInfo>(`${CMP}/week/current`, token),
    ]);

    const currentWeek = week?.number ?? week?.weekNumber ?? 1;
    // La jornada pedida se acota a [1, jornada actual]: el calendario de
    // jornadas futuras no aporta datos y evita peticiones inútiles.
    const selectedWeek = requestedWeek === null ? currentWeek : Math.min(Math.max(requestedWeek, 1), currentWeek);

    const calendar = await fetchOfficialAPI<Match[]>(`${CMP}/calendar`, token, {
      weekNumber: String(selectedWeek),
    });

    const { matches, notes } = await buildMatchesForWeek({
      token,
      teamId,
      week: selectedWeek,
      calendar,
      teamData,
    });

    const sorted = sortMatches(matches);
    const important = sorted.filter((m) => m.important);
    const normal = sorted.filter((m) => !m.important);

    const response: MatchesResponse = {
      week: selectedWeek,
      currentWeek,
      availableWeeks: Array.from({ length: currentWeek }, (_, i) => i + 1),
      generatedAt: new Date().toISOString(),
      matches: sorted,
      important,
      normal,
      notes,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[matches] Error:', message);
    const status = message.includes('HTTP 401') ? 401 : 500;
    return new Response(JSON.stringify({ error: message }), { status });
  }
};
