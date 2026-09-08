import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fetchTextWithCache } from './http-cache';
import type { ConfirmedLineup } from './types';
import type { MatchLineup, MatchLineupPlayer, MatchLineupSide } from '../../../types/fantasy';

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
let blockedUntil = 0;
async function curlFetch(url: string): Promise<string> {
  // Los binarios del equipo local no forman parte del runtime de Vercel.
  // Circuit breaker: un 403 no debe repetirse por cada partido de la jornada.
  if (process.env.VERCEL) {
    if (Date.now() < blockedUntil) throw new Error('SofaScore temporalmente no disponible');
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(4000), headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`SofaScore HTTP ${response.status}`);
      const text = await response.text();
      JSON.parse(text);
      return text;
    } catch (error) {
      blockedUntil = Date.now() + 60_000;
      throw error;
    }
  }
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

export interface SofaTeam {
  id: number;
  name: string;
  slug: string;
  shortName: string;
}

export interface SofaScore {
  current?: number;
  display?: number;
  period1?: number;
  period2?: number;
  normaltime?: number;
}

export interface SofaTime {
  currentMinute?: number;
  currentPeriodStartTimestamp?: number;
  injuryTime1?: number;
  injuryTime2?: number;
  period?: 'firstHalf' | 'secondHalf' | 'overtime' | string;
}

export interface SofaStatus {
  code: number;
  description?: string;
  type?: 'notstarted' | 'inprogress' | 'finished' | 'halftime' | 'postponed' | 'canceled' | string;
}

export interface SofaEvent {
  id: number;
  homeTeam: SofaTeam;
  awayTeam: SofaTeam;
  startTimestamp: number;
  status?: SofaStatus;
  homeScore?: SofaScore;
  awayScore?: SofaScore;
  time?: SofaTime;
  roundInfo?: SofaRoundInfo;
}

/**
 * Ronda del evento. En la fase de liga solo llega `round`; en las
 * eliminatorias Sofascore añade el nombre y `cupRoundType` (16 = octavos,
 * 8 = cuartos...), que es lo que permite distinguir una fase de otra sin
 * mantener un calendario propio de la UEFA.
 */
export interface SofaRoundInfo {
  round?: number;
  name?: string;
  slug?: string;
  cupRoundType?: number;
  prefix?: string;
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

/**
 * Id de la temporada en curso de cualquier torneo de Sofascore. Las
 * competiciones europeas cambian de id cada temporada, así que nunca se
 * codifica a mano: se resuelve aquí y se cachea 24 h.
 */
export async function currentSeasonId(tournamentId: number = LALIGA_TOURNAMENT_ID): Promise<number | null> {
  const data = (await fetchJson(`sofa-seasons-${tournamentId}`, `/unique-tournament/${tournamentId}/seasons`, SEASONS_TTL_MS)) as
    | { seasons?: SofaSeason[] }
    | null;
  const seasons = data?.seasons;
  if (!seasons || seasons.length === 0) return null;
  // La primera es la temporada en curso (orden descendente).
  return seasons[0].id;
}

/**
 * Una página de eventos de un torneo. `next/0` son los siguientes por jugar y
 * `last/0` los últimos jugados (el índice de página crece hacia atrás en el
 * tiempo en ambos sentidos). Devuelve [] ante cualquier fallo: ninguna vista
 * puede romperse porque Sofascore no responda.
 */
export async function fetchTournamentEvents(
  tournamentId: number,
  seasonId: number,
  direction: 'next' | 'last',
  page = 0,
  ttlMs: number = EVENTS_TTL_MS,
): Promise<SofaEvent[]> {
  const data = (await fetchJson(
    `sofa-events-${direction}-${seasonId}-${page}`,
    `/unique-tournament/${tournamentId}/season/${seasonId}/events/${direction}/${page}`,
    ttlMs,
  )) as SofaEventsPage | null;
  return data?.events ?? [];
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

const EVENT_DETAILS_TTL_MS = 60_000; // 1 minuto para datos en vivo
const EVENT_INCIDENTS_TTL_MS = 60_000;

export interface SofaIncidentPlayer {
  name: string;
  shortName: string;
}

export interface SofaIncident {
  incidentType: 'period' | 'goal' | 'card' | 'substitution' | 'injuryTime' | 'var' | string;
  incidentClass?: 'yellow' | 'red' | 'yellowRed' | 'regular' | string;
  time?: number;
  isHome?: boolean;
  player?: SofaIncidentPlayer;
  playerIn?: SofaIncidentPlayer;
  playerOut?: SofaIncidentPlayer;
  homeScore?: number;
  awayScore?: number;
  reason?: string;
}

export interface SofaIncidentResponse {
  incidents: SofaIncident[];
}

export async function fetchEventDetails(eventId: number): Promise<SofaEvent | null> {
  const data = (await fetchJson(`sofa-event-${eventId}`, `/event/${eventId}`, EVENT_DETAILS_TTL_MS)) as
    | { event?: SofaEvent }
    | null;
  return data?.event ?? null;
}

export async function fetchEventIncidents(eventId: number): Promise<SofaIncidentResponse | null> {
  return (await fetchJson(`sofa-incidents-${eventId}`, `/event/${eventId}/incidents`, EVENT_INCIDENTS_TTL_MS)) as
    | SofaIncidentResponse
    | null;
}

interface SofaLineupTeam {
  name?: string;
  slug?: string;
  shortName?: string;
  id?: number;
}

interface SofaLineupManager {
  name?: string;
  slug?: string;
}

interface SofaLineupPlayer {
  id?: number;
  name?: string;
  shortName?: string;
  slug?: string;
  position?: string;
  jerseyNumber?: string;
}

interface SofaLineupEntry {
  player?: SofaLineupPlayer;
  substitute?: boolean;
}

interface SofaLineupSide {
  team?: SofaLineupTeam;
  formation?: string;
  manager?: SofaLineupManager;
  players?: SofaLineupEntry[];
}

interface SofaLineupResponse {
  confirmed?: boolean;
  home?: SofaLineupSide;
  away?: SofaLineupSide;
}

function mapLineupPlayer(entry: SofaLineupEntry): MatchLineupPlayer | null {
  const player = entry.player;
  if (!player?.name) return null;
  return {
    id: player.id ? String(player.id) : undefined,
    name: player.name,
    shortName: player.shortName,
    position: player.position,
    number: player.jerseyNumber,
    isStarter: entry.substitute !== true,
  };
}

function mapLineupSide(side?: SofaLineupSide, fallbackName?: string): MatchLineupSide | null {
  if (!side) return null;
  const players = (side.players ?? []).map(mapLineupPlayer).filter((p): p is MatchLineupPlayer => p !== null);
  const starters = players.filter((p) => p.isStarter);
  const bench = players.filter((p) => !p.isStarter);
  if (starters.length === 0) return null;
  return {
    teamName: side.team?.name ?? side.team?.shortName ?? fallbackName ?? 'Equipo',
    formation: side.formation,
    coach: side.manager?.name,
    starters,
    bench,
  };
}

/**
 * Alineaciones confirmadas de un partido específico de SofaScore. Devuelve
 * titulares, suplentes, formación y entrenador cuando están disponibles.
 * TTL corto porque solo son fiables cerca del partido; el endpoint puede
 * devolver 404 una vez finalizado el encuentro.
 */
export async function fetchEventLineups(eventId: number): Promise<MatchLineup | null> {
  const data = (await fetchJson(`sofa-lineups-${eventId}`, `/event/${eventId}/lineups`, EVENT_DETAILS_TTL_MS)) as
    | SofaLineupResponse
    | null;
  if (!data?.confirmed) return null;

  const home = mapLineupSide(data.home, 'Local');
  const away = mapLineupSide(data.away, 'Visitante');
  if (!home || !away) return null;

  return { home, away };
}

export function teamLogoUrl(teamId: number): string {
  return `${BASE_URL}/team/${teamId}/image`;
}

interface SofaEventsPage {
  events?: SofaEvent[];
  hasNextPage?: boolean;
}

/**
 * Eventos de una jornada concreta (`/events/round/{n}`). Es la vía fiable para
 * jornadas pasadas: `events/last/0` solo devuelve la página más reciente, así
 * que las jornadas antiguas se quedan fuera de la ventana temporal.
 */
export async function fetchLaLigaEventsRound(round: number): Promise<SofaEvent[]> {
  const seasonId = await currentSeasonId();
  if (seasonId === null) return [];

  const page = (await fetchJson(
    `sofa-events-round-${seasonId}-${round}`,
    `/unique-tournament/${LALIGA_TOURNAMENT_ID}/season/${seasonId}/events/round/${round}`,
    EVENTS_TTL_MS,
  )) as SofaEventsPage | null;

  return page?.events ?? [];
}

/**
 * Descarga eventos de LaLiga en una ventana temporal. Combina `/events/next/0`
 * y `/events/last/0` porque cubren la jornada actual y evitan tener que
 * conocer el número de ronda exacto. Filtra por timestamp para devolver solo
 * los partidos dentro del rango solicitado.
 */
export async function fetchLaLigaEventsWindow(
  fromTimestamp: number,
  toTimestamp: number,
): Promise<{ events: SofaEvent[]; seasonId: number; origin: 'network' | 'cache' | 'stale' } | null> {
  const seasonId = await currentSeasonId();
  if (seasonId === null) return null;

  const [nextPage, lastPage] = await Promise.all([
    fetchJson(`sofa-events-next-${seasonId}`, `/unique-tournament/${LALIGA_TOURNAMENT_ID}/season/${seasonId}/events/next/0`, EVENTS_TTL_MS) as Promise<SofaEventsPage | null>,
    fetchJson(`sofa-events-last-${seasonId}`, `/unique-tournament/${LALIGA_TOURNAMENT_ID}/season/${seasonId}/events/last/0`, EVENTS_TTL_MS) as Promise<SofaEventsPage | null>,
  ]);

  const all: SofaEvent[] = [];
  for (const page of [nextPage, lastPage]) {
    if (page?.events) all.push(...page.events);
  }

  // Determinamos el origen más "viejo" de las dos peticiones para dataQuality.
  // fetchJson no expone el origin individual, así que usamos 'network' como
  // aproximación conservadora (el peor caso sería cache/stale, pero es poco
  // relevante para este consumidor visual).
  const origin: 'network' | 'cache' | 'stale' = 'network';

  const events = all.filter((e) => e.startTimestamp >= fromTimestamp && e.startTimestamp <= toTimestamp);
  // Evitamos duplicados si un partido aparece en ambas páginas.
  const byId = new Map<number, SofaEvent>();
  for (const e of events) byId.set(e.id, e);

  return { events: [...byId.values()], seasonId, origin };
}
