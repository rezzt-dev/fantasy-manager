import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fetchTextWithCache } from './http-cache';
import type { ConfirmedLineup } from './types';

/**
 * Adaptador Sofascore API no oficial (§3.3, riesgo medio): alineaciones
 * CONFIRMADAS (~40-60 min antes del partido). Es la última palabra sobre
 * titularidad (§4.4.5): cuando existe, hace override del once probable.
 *
 * Cloudflare bloquea el fetch de Node (403 por fingerprint), así que la
 * descarga se hace con curl (disponible en el servidor). TTL corto (15 min):
 * solo es útil cerca del deadline; fuera de ese margen el endpoint de lineups
 * responde 404 y el adaptador devuelve vacío (degradación graciosa).
 */

const execFileAsync = promisify(execFile);

/** Descarga con curl: Sofascore rechaza el cliente HTTP de Node. */
async function curlFetch(url: string): Promise<string> {
  const { stdout } = await execFileAsync(
    'curl',
    ['-sS', '--fail', '--max-time', '15', '-A', 'fantasy-manager/0.1 (analisis fantasy personal)', url],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  return stdout;
}

const BASE_URL = 'https://www.sofascore.com/api/v1';
const SEASONS_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
const EVENTS_TTL_MS = 15 * 60 * 1000; // 15 minutos
const LALIGA_TOURNAMENT_ID = 8;


interface SofaSeason {
  name: string;
  year: string;
  id: number;
}

interface SofaEvent {
  id: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
  startTimestamp: number;
}

async function fetchJson(key: string, path: string, ttlMs: number): Promise<unknown | null> {
  const fetched = await fetchTextWithCache(key, `${BASE_URL}${path}`, ttlMs, curlFetch);
  if (!fetched) return null;
  try {
    return JSON.parse(fetched.text);
  } catch {
    console.warn(`[sofascore] JSON inválido en ${path}`);
    return null;
  }
}

/** Id de la temporada actual de LaLiga (26/27) en Sofascore. */
async function currentSeasonId(): Promise<number | null> {
  const data = (await fetchJson('sofa-seasons', `/unique-tournament/${LALIGA_TOURNAMENT_ID}/seasons`, SEASONS_TTL_MS)) as
    | { seasons?: SofaSeason[] }
    | null;
  const seasons = data?.seasons;
  if (!seasons || seasons.length === 0) return null;
  // La primera es la temporada en curso (orden descendente).
  return seasons[0].id;
}

/**
 * Alineaciones confirmadas de los próximos partidos de LaLiga. Vacío fuera
 * del margen previo al partido (~1 h antes), el caso normal casi siempre.
 */
export async function fetchConfirmedLineups(): Promise<ConfirmedLineup[]> {
  const result: ConfirmedLineup[] = [];
  const seasonId = await currentSeasonId();
  if (seasonId === null) return result;

  const eventsData = (await fetchJson(`sofa-events-next-${seasonId}`, `/unique-tournament/${LALIGA_TOURNAMENT_ID}/season/${seasonId}/events/next/0`, EVENTS_TTL_MS)) as
    | { events?: SofaEvent[] }
    | null;
  const events = eventsData?.events ?? [];

  for (const event of events) {
    const lineups = (await fetchJson(`sofa-lineups-${event.id}`, `/event/${event.id}/lineups`, EVENTS_TTL_MS)) as
      | {
          confirmed?: boolean;
          home?: { players?: { player?: { name?: string }; substitute?: boolean }[] };
          away?: { players?: { player?: { name?: string }; substitute?: boolean }[] };
        }
      | null;
    if (!lineups?.confirmed) continue;

    const mapSide = (side?: { players?: { player?: { name?: string }; substitute?: boolean }[] }, teamName?: string): ConfirmedLineup | null => {
      if (!side?.players || !teamName) return null;
      const starters = side.players.filter((p) => !p.substitute).map((p) => p.player?.name ?? '').filter(Boolean);
      const bench = side.players.filter((p) => p.substitute).map((p) => p.player?.name ?? '').filter(Boolean);
      return starters.length > 0 ? { sourceTeamName: teamName, starters, bench } : null;
    };

    const home = mapSide(lineups.home, event.homeTeam?.name);
    const away = mapSide(lineups.away, event.awayTeam?.name);
    if (home) result.push(home);
    if (away) result.push(away);
  }

  return result;
}
