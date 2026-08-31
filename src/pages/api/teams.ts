import type { APIRoute } from 'astro';
import { getToken } from '../../lib/fantasy/api-proxy';
import { fetchTeamsCatalog } from '../../lib/fantasy/teams';

/**
 * Catálogo de equipos de la competición (id, nombre, nombre corto, escudos).
 * La UI lo usa para resolver los `localId`/`visitorId` que devuelve `/calendar`
 * a escudos y nombres legibles.
 */
export const GET: APIRoute = async ({ cookies, session }) => {
  try {
    // `teams-master` no exige token válido, pero lo enviamos si lo hay.
    const token = (await getToken(cookies, session)) ?? '';
    const teams = await fetchTeamsCatalog(token);

    return new Response(JSON.stringify({ teams }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[teams] Error:', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
