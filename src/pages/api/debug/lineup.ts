import type { APIRoute } from 'astro';
import { getToken, fetchOfficialAPI, normalizeFormation, CMP } from '../../../lib/fantasy/api-proxy';
import type { TeamLineup, WeekInfo } from '../../../types/fantasy';

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

    const week = await fetchOfficialAPI<WeekInfo>(`${CMP}/week/current`, token);
    const currentWeek = week?.number ?? week?.weekNumber ?? 1;

    const endpoints = [
      { name: 'lineup-generic', path: `${CMP}/teams/${teamId}/lineup` },
      { name: 'lineup-week', path: `${CMP}/teams/${teamId}/lineup/week/${currentWeek}` },
      { name: 'lineup-week-next', path: `${CMP}/teams/${teamId}/lineup/week/${currentWeek + 1}` },
      { name: 'lineup-league', path: `${CMP}/leagues/${leagueId}/teams/${teamId}/lineup` },
    ];

    const results: Record<string, { status: number; body: unknown; error?: string }> = {};

    for (const { name, path } of endpoints) {
      try {
        const res = await fetchOfficialAPI<unknown>(path, token);
        results[name] = { status: 200, body: res };
      } catch (error) {
        results[name] = {
          status: 0,
          body: null,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    // Cruzar conteos de jugadores de cada respuesta tipo TeamLineup
    const counts: Record<string, number | null> = {};
    for (const [name, result] of Object.entries(results)) {
      const body = result.body as any;
      if (body && typeof body === 'object' && 'formation' in body) {
        const normalized = normalizeFormation(body as TeamLineup);
        const f = normalized.formation || {};
        counts[name] = [
          ...(f.goalkeeper || []),
          ...(f.defender || []),
          ...(f.midfielder || []),
          ...(f.attacker || []),
        ].length;
      } else {
        counts[name] = null;
      }
    }

    return new Response(
      JSON.stringify({
        teamId,
        leagueId,
        currentWeek,
        weekRaw: week,
        counts,
        results,
      }, null, 2),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
