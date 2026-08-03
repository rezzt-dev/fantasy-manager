import type { APIRoute, AstroSession } from 'astro';
import { getEnv, getEnvOptional } from '../../../lib/env';
import type { AuthTokens } from '../../../types/fantasy';

const TARGET = getEnv('PROXY_FANTASY_TARGET', 'https://fantasy-api.llt-services.com');
const X_APP = getEnv('PROXY_DEFAULT_X_APP', '2');
const X_LANG = getEnv('PROXY_DEFAULT_X_LANG', 'es');
const TIMEOUT_MS = parseInt(getEnv('PROXY_TIMEOUT_MS', '15000'), 10);

async function getToken(
  cookies: { get: (name: string) => { value?: string } | undefined },
  session?: AstroSession,
): Promise<string | undefined> {
  if (session) {
    const tokens = await session.get<AuthTokens>('fantasy_tokens');
    if (tokens?.access_token) return tokens.access_token;
  }
  const tokensRaw = cookies.get('fantasy_tokens')?.value;
  if (tokensRaw) {
    try {
      const tokens = JSON.parse(decodeURIComponent(tokensRaw)) as { access_token?: string };
      if (tokens.access_token) return tokens.access_token;
    } catch {
      // ignore invalid cookie
    }
  }
  return getEnvOptional('LALIGA_FANTASY_TOKEN');
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

    const responseBody = await upstream.arrayBuffer();
    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) return;
      responseHeaders.set(key, value);
    });
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(responseBody, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
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
