import type { APIRoute } from 'astro';
import { getEnv, getEnvOptional } from '../../../lib/env';
import type { MarketPlayer, PlayerMaster } from '../../../types/fantasy';
import { enrichMarketPlayers } from '../../../lib/fantasy/market-enrich';
import { enrichResponseTeams, fetchTeamNameMap, mayNeedTeamEnrichment } from '../../../lib/fantasy/player-team-enrich';
import { getToken } from '../../../lib/fantasy/api-proxy';

const TARGET = getEnv('PROXY_FANTASY_TARGET', 'https://fantasy-api.llt-services.com');
const X_APP = getEnv('PROXY_DEFAULT_X_APP', '2');
const X_LANG = getEnv('PROXY_DEFAULT_X_LANG', 'es');
const TIMEOUT_MS = parseInt(getEnv('PROXY_TIMEOUT_MS', '15000'), 10);

const ALL_PLAYERS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutos
let allPlayersCache: { expiresAt: number; players: PlayerMaster[] } | null = null;

async function fetchAllPlayersCached(token: string): Promise<PlayerMaster[]> {
  if (allPlayersCache && allPlayersCache.expiresAt > Date.now()) {
    return allPlayersCache.players;
  }

  const res = await fetch(`${TARGET}/api/v1/competition/1/players?x-lang=${X_LANG}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-app': X_APP,
      'x-lang': X_LANG,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`players fetch failed: ${res.status}`);

  const players = (await res.json()) as PlayerMaster[];
  allPlayersCache = { expiresAt: Date.now() + ALL_PLAYERS_CACHE_TTL_MS, players };
  return players;
}

function isMarketPath(path: string): boolean {
  // /v1/competition/1/league/{leagueId}/market (con o sin barra final)
  return /^v1\/competition\/1\/league\/[^\/]+\/market\/?$/.test(path);
}

function buildResponseHeaders(upstream: Response): Headers {
  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) return;
    responseHeaders.set(key, value);
  });
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  return responseHeaders;
}

function jsonResponse(upstream: Response, body: string): Response {
  const headers = buildResponseHeaders(upstream);
  headers.set('Content-Type', 'application/json');
  return new Response(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

function rawResponse(upstream: Response, body: BodyInit): Response {
  return new Response(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: buildResponseHeaders(upstream),
  });
}

async function proxyHandler({ request, params, cookies, session }: Parameters<APIRoute>[0]) {
  const token = await getToken(cookies, session);
  if (!token) {
    return new Response(JSON.stringify({ error: 'No token configured. Login or set LALIGA_FANTASY_TOKEN.' }), { status: 401 });
  }

  const path = Array.isArray(params.path) ? params.path.join('/') : params.path;
  const query = new URL(request.url).search;
  const targetUrl = `${TARGET}/api/${path}${query}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'x-app': X_APP,
    'x-lang': X_LANG,
    'Accept': 'application/json',
    'User-Agent': getEnvOptional('PROXY_DEFAULT_USER_AGENT') || 'fantasy-manager/0.1',
  };

  let body: BodyInit | undefined;
  if (request.body) {
    const contentType = request.headers.get('content-type') || 'application/json';
    headers['Content-Type'] = contentType;
    body = await request.arrayBuffer();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const contentType = upstream.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    // El endpoint de mercado a veces omite el equipo en playerMaster. Lo
    // enriquecemos con el catálogo global para que el dashboard siempre muestre
    // el club al que pertenece el jugador.
    if (path && request.method === 'GET' && upstream.ok && isMarketPath(path) && isJson) {
      try {
        const market = (await upstream.clone().json()) as MarketPlayer[];
        const allPlayers = await fetchAllPlayersCached(token);
        const enriched = enrichMarketPlayers(market, allPlayers);
        return jsonResponse(upstream, JSON.stringify(enriched));
      } catch (enrichError) {
        console.warn('[proxy] market enrichment failed:', enrichError instanceof Error ? enrichError.message : enrichError);
        // Fallthrough: devuelve la respuesta original o con enriquecimiento general.
      }
    }

    // Para cualquier respuesta JSON que contenga jugadores, enriquecemos el
    // campo `team` usando el listado oficial de equipos. Esto cubre plantillas,
    // alineaciones, detalle de jugador y el propio catálogo global.
    if (request.method === 'GET' && upstream.ok && isJson) {
      try {
        const data = (await upstream.clone().json()) as unknown;
        if (mayNeedTeamEnrichment(data)) {
          const teamNames = await fetchTeamNameMap(token);
          enrichResponseTeams(data, teamNames);
          return jsonResponse(upstream, JSON.stringify(data));
        }
      } catch (enrichError) {
        console.warn('[proxy] team enrichment failed:', enrichError instanceof Error ? enrichError.message : enrichError);
        // Fallthrough: devuelve la respuesta original tal cual.
      }
    }

    const responseBody = await upstream.arrayBuffer();
    return rawResponse(upstream, responseBody);
  } catch (error) {
    clearTimeout(timeout);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 502 });
  }
}

export const GET: APIRoute = proxyHandler;
export const POST: APIRoute = proxyHandler;
export const PUT: APIRoute = proxyHandler;
export const DELETE: APIRoute = proxyHandler;
export const PATCH: APIRoute = proxyHandler;

export const OPTIONS: APIRoute = () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
