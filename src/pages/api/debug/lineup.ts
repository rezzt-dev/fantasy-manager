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
      // Orden que usa la app móvil / LaLigaApp: primero el endpoint de equipo por semana.
      { name: 'lineup-week', path: `${CMP}/teams/${teamId}/lineup/week/${currentWeek}` },
      { name: 'lineup-week-prev', path: `${CMP}/teams/${teamId}/lineup/week/${currentWeek - 1}` },
      { name: 'lineup-week-next', path: `${CMP}/teams/${teamId}/lineup/week/${currentWeek + 1}` },
      { name: 'lineup-generic', path: `${CMP}/teams/${teamId}/lineup` },
      // Fallbacks de liga (a veces devuelven datos distintos/incompletos).
      { name: 'lineup-league', path: `${CMP}/leagues/${leagueId}/teams/${teamId}/lineup` },
      { name: 'lineup-league-week', path: `${CMP}/leagues/${leagueId}/teams/${teamId}/lineup/week/${currentWeek}` },
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

    // Cruzar conteos y nombres de jugadores de cada respuesta tipo TeamLineup
    const counts: Record<string, { field: number; coach: number } | null> = {};
    const names: Record<string, string[]> = {};
    for (const [name, result] of Object.entries(results)) {
      const body = result.body as any;
      if (body && typeof body === 'object' && 'formation' in body) {
        const normalized = normalizeFormation(body as TeamLineup);
        const f = normalized.formation || {};
        const entries = [
          ...(f.goalkeeper || []),
          ...(f.defender || []),
          ...(f.midfielder || []),
          ...(f.attacker || []),
        ];
        const coachEntries = f.coach || [];
        counts[name] = { field: entries.length, coach: coachEntries.length };
        names[name] = entries.map((e: any) => e.playerMaster?.nickname || e.playerMaster?.name || 'unknown');
      } else {
        counts[name] = null;
        names[name] = [];
      }
    }

    return new Response(
      JSON.stringify({
        teamId,
        leagueId,
        currentWeek,
        weekRaw: week,
        counts,
        names,
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
