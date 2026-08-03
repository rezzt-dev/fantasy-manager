import type { AstroSession } from 'astro';
import { getEnv, getEnvOptional } from '../env';
import type { AuthTokens } from '../../types/fantasy';

const TARGET = getEnv('PROXY_FANTASY_TARGET', 'https://fantasy-api.llt-services.com');
const X_APP = getEnv('PROXY_DEFAULT_X_APP', '2');
const X_LANG = getEnv('PROXY_DEFAULT_X_LANG', 'es');

export const CMP = '/v1/competition/1';

export async function getToken(
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
    } catch {}
  }
  return getEnvOptional('LALIGA_FANTASY_TOKEN');
}

export async function fetchOfficialAPI<T>(path: string, token: string, query?: Record<string, string>): Promise<T> {
  const usp = new URLSearchParams(query);
  usp.set('x-lang', X_LANG);
  const url = `${TARGET}/api${path}?${usp.toString()}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-app': X_APP,
      'x-lang': X_LANG,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}
