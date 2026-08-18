import type { AstroSession } from 'astro';
import { getEnv, getEnvOptional } from '../env';
import type { AuthTokens } from '../../types/fantasy';

const TARGET = getEnv('PROXY_FANTASY_TARGET', 'https://fantasy-api.llt-services.com');
const X_APP = getEnv('PROXY_DEFAULT_X_APP', '2');
const X_LANG = getEnv('PROXY_DEFAULT_X_LANG', 'es');

export const CMP = '/v1/competition/1';

export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    if (!payload.exp) return true;
    // Consider expired if it expires in less than 5 minutes (300 seconds)
    return payload.exp * 1000 - Date.now() < 5 * 60 * 1000;
  } catch {
    return true;
  }
}

export async function performTokenRefresh(refreshTokenValue: string): Promise<AuthTokens> {
  const AUTH_BASE_URL = getEnv('LALIGA_AUTH_BASE_URL', 'https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token');
  const CLIENT_ID = getEnv('LALIGA_CLIENT_ID', 'af88bcff-1157-40a0-b579-030728aacf0b');

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshTokenValue,
    client_id: CLIENT_ID,
    scope: 'openid offline_access',
  });

  const res = await fetch(`${AUTH_BASE_URL}?p=B2C_1A_5ULAIP_PARAMETRIZED_SIGNIN`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} - ${text}`);
  }

  const data = await res.json() as any;
  if (!data.id_token && !data.access_token) {
    throw new Error('Refresh token response missing access tokens');
  }

  return {
    access_token: data.id_token || data.access_token,
    refresh_token: data.refresh_token || refreshTokenValue,
    id_token: data.id_token || '',
    token_type: data.token_type || 'Bearer',
    expires_in: data.expires_in || 86400,
  };
}

export async function getOrRefreshTokens(
  cookies: {
    get: (name: string) => { value?: string } | undefined;
    set?: (name: string, value: string, options?: any) => void;
  },
  session?: AstroSession,
): Promise<string | undefined> {
  let tokens: AuthTokens | undefined;

  if (session) {
    tokens = await session.get<AuthTokens>('fantasy_tokens');
  }

  if (!tokens) {
    const tokensRaw = cookies.get('fantasy_tokens')?.value;
    if (tokensRaw) {
      try {
        tokens = JSON.parse(decodeURIComponent(tokensRaw)) as AuthTokens;
      } catch {}
    }
  }

  if (!tokens) {
    return getEnvOptional('LALIGA_FANTASY_TOKEN');
  }

  // Check if token is expired or close to it
  if (tokens.access_token && isTokenExpired(tokens.access_token)) {
    if (tokens.refresh_token) {
      try {
        console.log('[Token Refresh] Token is expired or expiring soon, attempting refresh...');
        const newTokens = await performTokenRefresh(tokens.refresh_token);

        if (session) {
          await session.set('fantasy_tokens', newTokens);
        }

        if (cookies.set) {
          cookies.set('fantasy_tokens', encodeURIComponent(JSON.stringify(newTokens)), {
            httpOnly: true,
            path: '/',
            maxAge: newTokens.expires_in,
            sameSite: 'lax',
          });
        }

        return newTokens.access_token;
      } catch (err) {
        console.error('[Token Refresh] Automatic token refresh failed:', err);
      }
    }
  }

  return tokens.access_token;
}

export async function getToken(
  cookies: { get: (name: string) => { value?: string } | undefined; set?: (name: string, value: string, options?: any) => void },
  session?: AstroSession,
): Promise<string | undefined> {
  return getOrRefreshTokens(cookies, session);
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
