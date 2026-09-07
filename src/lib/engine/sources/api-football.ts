import type { Match, PlayerMaster } from '../../../types/fantasy';
import type { StrategyReport, StrategySource } from '../../../types/strategy';
import { getEnvOptional } from '../../env';
import { normalizePlayerName } from '../features/minutes';
import { resolveTeamId } from '../model';
import { buildTeamMatcher, type OfficialTeam } from '../team-names';
import { fetchTextWithCache } from './http-cache';

interface InjuryRow {
  player: { name: string; type: string; reason: string };
  team: { name: string };
  fixture: { date: string };
}
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Validate before caching: HTTP 200 also carries quota/authentication errors. */
export function parseApiFootballInjuries(text: string): InjuryRow[] {
  const data: unknown = JSON.parse(text);
  if (!isObject(data) || !isObject(data.errors) || Object.keys(data.errors).length > 0 || !Array.isArray(data.response)) {
    throw new Error('API-Football: respuesta no válida o cuota no disponible');
  }
  if (isObject(data.paging) && typeof data.paging.total === 'number' && data.paging.total > 1) {
    throw new Error('API-Football: respuesta incompleta');
  }
  return data.response.map((row: unknown) => {
    if (!isObject(row) || !isObject(row.player) || !isObject(row.team) || !isObject(row.fixture) ||
      typeof row.player.name !== 'string' || typeof row.player.type !== 'string' || typeof row.player.reason !== 'string' ||
      typeof row.team.name !== 'string' || typeof row.fixture.date !== 'string' || !Number.isFinite(Date.parse(row.fixture.date))) {
      throw new Error('API-Football: esquema de bajas no válido');
    }
    return { player: { name: row.player.name, type: row.player.type, reason: row.player.reason },
      team: { name: row.team.name }, fixture: { date: row.fixture.date } };
  });
}

/** Conservative crosswalk: exact normalized name within club, never surname guesses. */
export function matchApiFootballInjuries(rows: InjuryRow[], players: PlayerMaster[], teams: OfficialTeam[], calendar: Match[]): StrategyReport['additionalAbsences'] {
  const matchTeam = buildTeamMatcher(teams);
  const result = new Map<string, StrategyReport['additionalAbsences'][number]>();
  for (const row of rows) {
    const teamId = matchTeam(row.team.name);
    if (teamId === null || !calendar.some((m) => (m.localId === teamId || m.visitorId === teamId) &&
      m.matchDate?.slice(0, 10) === row.fixture.date.slice(0, 10))) continue;
    const name = normalizePlayerName(row.player.name);
    if (!name) continue;
    const candidates = players.filter((p) => resolveTeamId(p) === teamId &&
      [p.name, p.nickname].some((n) => normalizePlayerName(n) === name));
    if (candidates.length !== 1 || !['Missing Fixture', 'Questionable'].includes(row.player.type)) continue;
    const player = candidates[0];
    const status = row.player.type === 'Missing Fixture' ? 'missing' : 'questionable';
    // Conflicting reports stay questionable; no automatic hard exclusion.
    const previous = result.get(player.id);
    result.set(player.id, { playerId: player.id, name: player.nickname || player.name,
      status: previous && previous.status !== status ? 'questionable' : status, reason: row.player.reason });
  }
  return [...result.values()];
}

export async function fetchApiFootballAbsences(players: PlayerMaster[], teams: OfficialTeam[], calendar: Match[]): Promise<{
  source: StrategySource; absences: StrategyReport['additionalAbsences'];
}> {
  const key = getEnvOptional('API_FOOTBALL_KEY');
  if (!key) return { source: { name: 'API-Football', status: 'not-configured', detail: 'Contraste de bajas opcional, pendiente de configurar.' }, absences: [] };
  const dates = [...new Set(calendar.map((m) => m.matchDate?.slice(0, 10)).filter((date): date is string =>
    Boolean(date && /^\d{4}-\d{2}-\d{2}$/.test(date))))].sort();
  if (!dates.length || dates.length > 7) return {
    source: { name: 'API-Football', status: 'unavailable', detail: 'Calendario sin fechas válidas o jornada repartida en más de 7 días.' }, absences: [],
  };
  const results = await Promise.all(dates.map((date) => fetchTextWithCache(
    `api-football-injuries-140-${date}`, `https://v3.football.api-sports.io/injuries?league=140&date=${date}`,
    24 * 60 * 60 * 1000, async (url) => {
      const response = await fetch(url, { headers: { 'x-apisports-key': key }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`API-Football HTTP ${response.status}`);
      const text = await response.text();
      parseApiFootballInjuries(text);
      return text;
    },
  )));
  const rows: InjuryRow[] = [];
  let failed = 0;
  let stale = 0;
  for (const result of results) {
    if (!result) { failed++; continue; }
    // Expired injury information must not be presented as a current absence.
    if (result.origin === 'stale') { stale++; continue; }
    try { rows.push(...parseApiFootballInjuries(result.text)); } catch { failed++; }
  }
  const fetchedTimes = results.flatMap((r) => r ? [r.fetchedAt] : []);
  const absences = matchApiFootballInjuries(rows, players, teams, calendar);
  return {
    source: { name: 'API-Football', status: failed ? 'unavailable' : stale ? 'stale' : 'available',
      detail: `${dates.length - failed - stale}/${dates.length} fechas consultadas; ${absences.length} avisos cruzados. No encontrar un aviso no confirma disponibilidad.`,
      ...(fetchedTimes.length ? { fetchedAt: new Date(Math.min(...fetchedTimes)).toISOString() } : {}),
    }, absences,
  };
}
