import type { AstroSession } from 'astro';
import { getEnv, getEnvOptional } from '../env';
import type { AuthTokens, TeamLineup } from '../../types/fantasy';

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

/** Lectura tolerante a fallos del store de sesión. */
export async function readSession(session: AstroSession): Promise<AuthTokens | undefined> {
  try {
    return await session.get<AuthTokens>('fantasy_tokens');
  } catch (error) {
    console.warn('[session] read failed:', error instanceof Error ? error.message : error);
    return undefined;
  }
}

/** Escritura tolerante a fallos: devuelve false si el store no ha aceptado. */
export async function writeSession(session: AstroSession, tokens: AuthTokens): Promise<boolean> {
  try {
    await session.set('fantasy_tokens', tokens);
    return true;
  } catch (error) {
    console.warn('[session] write failed:', error instanceof Error ? error.message : error);
    return false;
  }
}

export async function getOrRefreshTokens(
  cookies: {
    get: (name: string) => { value?: string } | undefined;
    set?: (name: string, value: string, options?: any) => void;
  },
  session?: AstroSession,
): Promise<string | undefined> {
  let tokens: AuthTokens | undefined;

  // La sesión es best-effort: si el store no está disponible (p. ej. Upstash
  // sin credenciales en local) no puede tumbar la request, hay cookie detrás.
  if (session) {
    tokens = await readSession(session);
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
          await writeSession(session, newTokens);
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

/**
 * La API oficial de LaLiga Fantasy usa `midfield`/`striker` en la formación,
 * mientras que este proyecto usa internamente `midfielder`/`attacker`.
 */
export function normalizeFormation(lineup: TeamLineup): TeamLineup {
  const formation = lineup.formation as any;
  return {
    ...lineup,
    formation: {
      goalkeeper: formation.goalkeeper || [],
      defender: formation.defender || [],
      midfielder: formation.midfielder || formation.midfield || [],
      attacker: formation.attacker || formation.striker || [],
      coach: formation.coach || [],
    },
  };
}

function countFieldPlayers(lineup: TeamLineup): number {
  const f = lineup?.formation;
  if (!f) return 0;
  return (
    (f.goalkeeper?.length || 0) +
    (f.defender?.length || 0) +
    (f.midfielder?.length || 0) +
    (f.attacker?.length || 0)
  );
}

/**
 * Alineación de la jornada actual.
 *
 * La app móvil (y el proyecto de referencia LaLigaApp) consulta los endpoints
 * de equipo. Probamos el genérico y el de jornada y nos quedamos con el que
 * devuelva más jugadores de campo. Los endpoints bajo
 * /leagues/{leagueId}/teams/{teamId}/lineup devolvían datos incompletos, por lo
 * que se han eliminado del orden de intentos. leagueId se mantiene en la firma
 * por compatibilidad pero no se usa.
 */
export async function fetchCurrentLineup(
  token: string,
  teamId: number,
  weekNumber: number,
  _leagueId?: string,
): Promise<TeamLineup> {
  let genericLineup: TeamLineup | null = null;
  let weekLineup: TeamLineup | null = null;

  try {
    genericLineup = normalizeFormation(await fetchOfficialAPI<TeamLineup>(`${CMP}/teams/${teamId}/lineup`, token));
  } catch (error) {
    console.warn('[fetchCurrentLineup] generic team lineup failed:', error instanceof Error ? error.message : error);
  }

  try {
    weekLineup = normalizeFormation(await fetchOfficialAPI<TeamLineup>(`${CMP}/teams/${teamId}/lineup/week/${weekNumber}`, token));
  } catch (error) {
    console.warn('[fetchCurrentLineup] lineup by week failed:', error instanceof Error ? error.message : error);
  }

  const genericCount = genericLineup ? countFieldPlayers(genericLineup) : 0;
  const weekCount = weekLineup ? countFieldPlayers(weekLineup) : 0;

  if (weekCount > 0 && weekCount >= genericCount) {
    return weekLineup!;
  }
  if (genericCount > 0) {
    return genericLineup!;
  }

  if (genericLineup) return genericLineup;
  if (weekLineup) return weekLineup;
  throw new Error('No se pudo obtener la alineación desde ningún endpoint de equipo.');
}
