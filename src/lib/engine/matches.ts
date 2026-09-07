import { fetchEspnMatches, fetchEspnMatchDetails, type EspnMatch } from './sources/espn';
import { fetchTeamsCatalog } from '../fantasy/teams';
import { fetchLaLigaEventsWindow, fetchLaLigaEventsRound, fetchEventDetails, fetchEventIncidents, fetchEventLineups, teamLogoUrl } from './sources/sofascore';
import { generateMatchSummary, fetchExternalMatchSummary } from './sources/match-summary';
import { buildTeamMatcher } from './team-names';
import type { OfficialTeam, TeamMatcher } from './team-names';
import type { TeamData, Match, PlayerMaster, EnrichedMatch, MatchEvent, SquadPlayerInMatch, EnrichedMatchTeam, EnrichedMatchStatus, MatchPhase, TeamCatalogEntry } from '../../types/fantasy';
import type { SofaEvent, SofaIncident } from './sources/sofascore';

const MATCH_WINDOW_HOURS = 48;
const ENRICH_CONCURRENCY = 4;

interface BuildMatchesInput {
  token: string;
  teamId: number;
  /** Jornada que se está construyendo (puede ser pasada). */
  week: number;
  calendar: Match[];
  teamData: TeamData;
}

export interface BuildMatchesResult {
  matches: EnrichedMatch[];
  notes: string[];
}

const statusPriority: Record<EnrichedMatchStatus, number> = {
  live: 0,
  halftime: 1,
  pending: 2,
  finished: 3,
  postponed: 4,
  canceled: 5,
  unknown: 6,
};

function mapStatus(sofaStatus?: string): EnrichedMatchStatus {
  switch (sofaStatus) {
    case 'notstarted':
      return 'pending';
    case 'inprogress':
      return 'live';
    case 'finished':
      return 'finished';
    case 'halftime':
      return 'halftime';
    case 'postponed':
      return 'postponed';
    case 'canceled':
      return 'canceled';
    default:
      return 'unknown';
  }
}

function statusLabel(status: EnrichedMatchStatus, minute: number | null): string {
  switch (status) {
    case 'live':
      return minute !== null ? `${minute}'` : 'En vivo';
    case 'halftime':
      return 'Descanso';
    case 'finished':
      return 'Finalizado';
    case 'pending':
      return 'Pendiente';
    case 'postponed':
      return 'Aplazado';
    case 'canceled':
      return 'Cancelado';
    default:
      return 'Desconocido';
  }
}

export function formatKickoff(timestamp: number): string {
  if (!Number.isFinite(timestamp)) return 'Horario por confirmar';
  const d = new Date(timestamp * 1000);
  return d.toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function computePhase(event: SofaEvent | null): MatchPhase {
  if (!event) return 'desconocido';
  const status = event.status?.type;
  const period = event.time?.period;

  if (status === 'finished') return 'finalizado';
  if (status === 'notstarted') return 'pendiente';
  if (status === 'halftime' || event.status?.code === 31) return 'descanso';
  if (status === 'inprogress') {
    if (period === 'secondHalf' || event.status?.code === 7) return 'segunda-parte';
    return 'primera-parte';
  }
  if (status === 'postponed') return 'pendiente';
  if (status === 'canceled') return 'pendiente';
  return 'desconocido';
}

function computeMinute(event: SofaEvent): number | null {
  if (event.status?.type !== 'inprogress' || event.status?.code === 31) return null;

  if (event.time?.currentMinute !== undefined && event.time.currentMinute !== null) {
    return event.time.currentMinute;
  }

  const periodStart = event.time?.currentPeriodStartTimestamp;
  if (periodStart) {
    const elapsed = Math.floor((Date.now() / 1000 - periodStart) / 60);
    const base = (event.time?.period === 'secondHalf' || event.status?.code === 7) ? 45 : 0;
    return Math.max(1, base + elapsed);
  }

  return null;
}

function mapIncident(incident: SofaIncident): MatchEvent | null {
  switch (incident.incidentType) {
    case 'goal': {
      const player = incident.player?.shortName ?? incident.player?.name ?? 'Jugador';
      const detail = incident.reason ? ` (${incident.reason})` : '';
      return {
        type: 'goal',
        minute: incident.time ?? null,
        isHome: incident.isHome ?? null,
        label: 'Gol',
        detail: `${player}${detail}`,
      };
    }
    case 'card': {
      const player = incident.player?.shortName ?? incident.player?.name ?? 'Jugador';
      const color = incident.incidentClass === 'red' ? 'roja' : incident.incidentClass === 'yellowRed' ? 'doble amarilla' : 'amarilla';
      return {
        type: 'card',
        minute: incident.time ?? null,
        isHome: incident.isHome ?? null,
        label: incident.incidentClass === 'red' || incident.incidentClass === 'yellowRed' ? 'Expulsión' : 'Tarjeta',
        detail: `${player} · ${color}`,
      };
    }
    case 'substitution': {
      const inName = incident.playerIn?.shortName ?? incident.playerIn?.name ?? 'Entra';
      const outName = incident.playerOut?.shortName ?? incident.playerOut?.name ?? 'Sale';
      return {
        type: 'substitution',
        minute: incident.time ?? null,
        isHome: incident.isHome ?? null,
        label: 'Cambio',
        detail: `${inName} ↔ ${outName}`,
      };
    }
    default:
      return null;
  }
}

function buildSquadPlayers(calendarMatch: Match, ownPlayers: PlayerMaster[]): SquadPlayerInMatch[] {
  const list: SquadPlayerInMatch[] = [];
  const homeId = calendarMatch.localId;
  const awayId = calendarMatch.visitorId;

  for (const player of ownPlayers) {
    const teamId = player.teamId;
    if (teamId !== homeId && teamId !== awayId) continue;

    list.push({
      playerId: player.id,
      nickname: player.nickname,
      position: player.position,
      teamId,
      teamName: teamId === homeId ? 'local' : 'visitante',
      isHome: teamId === homeId,
    });
  }

  return list;
}

export function findSofaEvent(
  calendarMatch: Match,
  sofaEvents: SofaEvent[],
  teamsById: Map<number, TeamCatalogEntry>,
  matchTeam: TeamMatcher,
): SofaEvent | null {
  if (!teamsById.has(calendarMatch.localId) || !teamsById.has(calendarMatch.visitorId)) return null;

  const matchTs = new Date(calendarMatch.matchDate).getTime() / 1000;

  let best: SofaEvent | null = null;
  let bestDelta = Infinity;

  for (const event of sofaEvents) {
    const homeId = matchTeam(event.homeTeam.name);
    const awayId = matchTeam(event.awayTeam.name);
    if (homeId == null || awayId == null) continue;

    const homeMatches = homeId === calendarMatch.localId;
    const awayMatches = awayId === calendarMatch.visitorId;
    if (!homeMatches || !awayMatches) continue;

    const delta = Math.abs(event.startTimestamp - matchTs);
    if (delta < bestDelta && delta <= MATCH_WINDOW_HOURS * 3600) {
      bestDelta = delta;
      best = event;
    }
  }

  return best;
}

export async function buildEnrichedMatch(
  calendarMatch: Match,
  sofaEvent: SofaEvent | null,
  ownPlayers: PlayerMaster[],
  teamsById: Map<number, TeamCatalogEntry>,
  espnMatch?: EspnMatch,
): Promise<{ match: EnrichedMatch; fetchNotes: string[] }> {
  const fetchNotes: string[] = [];
  const squadPlayers = buildSquadPlayers(calendarMatch, ownPlayers);

  let details: SofaEvent | null = null;
  let incidents: SofaIncident[] = [];
  let lineups: EnrichedMatch['lineups'] = undefined;
  let dataStale = espnMatch?.stale ?? false;

  if (espnMatch) {
    const data = await fetchEspnMatchDetails(espnMatch.event.id);
    details = data?.event ?? espnMatch.event;
    dataStale = data ? data.stale : espnMatch.stale;
    if (data && details.time?.currentMinute === undefined && !espnMatch.stale) {
      details = { ...details, time: { ...details.time, currentMinute: espnMatch.event.time?.currentMinute } };
    }
    incidents = data?.incidents ?? [];
    lineups = data?.lineups;
    if (!data) fetchNotes.push('No se pudo actualizar el detalle del partido. Reintenta la carga.');
    else if (!data.incidentsAvailable) fetchNotes.push('La fuente no ha facilitado los eventos del partido.');
    if (data?.stale || espnMatch.stale) fetchNotes.push('Datos guardados: la fuente no responde. El marcador y el minuto pueden estar desactualizados.');
  } else if (sofaEvent) {
    const [event, incidentData, lineupData] = await Promise.all([
      fetchEventDetails(sofaEvent.id), fetchEventIncidents(sofaEvent.id), fetchEventLineups(sofaEvent.id),
    ]);
    details = event;
    incidents = incidentData?.incidents ?? [];
    lineups = lineupData ?? undefined;
    if (!event) fetchNotes.push('No se pudieron actualizar los detalles en SofaScore.');
    if (!incidentData) fetchNotes.push('No se pudieron cargar los eventos en SofaScore.');
  }
  if (!lineups) fetchNotes.push('Alineaciones no disponibles todavía. Vuelve a cargar cerca del inicio; si el partido ya empezó, la fuente no las ha facilitado.');

  const effectiveEvent = details ?? sofaEvent;
  const status = mapStatus(effectiveEvent?.status?.code === 31 ? 'halftime' : effectiveEvent?.status?.type);
  const minute = effectiveEvent ? computeMinute(effectiveEvent) : null;
  const phase = computePhase(effectiveEvent);

  const localTeam = teamsById.get(calendarMatch.localId);
  const visitorTeam = teamsById.get(calendarMatch.visitorId);

  const home: EnrichedMatchTeam = {
    id: calendarMatch.localId,
    name: localTeam?.name ?? effectiveEvent?.homeTeam.name ?? String(calendarMatch.localId),
    shortName: localTeam?.shortName || effectiveEvent?.homeTeam.shortName,
    // El escudo oficial es más fiable que la imagen de SofaScore (que puede
    // bloquear el hotlinking); esta última queda como respaldo.
    logoUrl:
      localTeam?.badgeColor || espnMatch?.homeLogo ||
      (!espnMatch && effectiveEvent?.homeTeam.id ? teamLogoUrl(effectiveEvent.homeTeam.id) : ''),
    score: effectiveEvent?.homeScore?.current ?? calendarMatch.localScore ?? null,
  };

  const away: EnrichedMatchTeam = {
    id: calendarMatch.visitorId,
    name: visitorTeam?.name ?? effectiveEvent?.awayTeam.name ?? String(calendarMatch.visitorId),
    shortName: visitorTeam?.shortName || effectiveEvent?.awayTeam.shortName,
    logoUrl:
      visitorTeam?.badgeColor || espnMatch?.awayLogo ||
      (!espnMatch && effectiveEvent?.awayTeam.id ? teamLogoUrl(effectiveEvent.awayTeam.id) : ''),
    score: effectiveEvent?.awayScore?.current ?? calendarMatch.visitorScore ?? null,
  };

  const events: MatchEvent[] = incidents
    .map(mapIncident)
    .filter((e): e is MatchEvent => e !== null)
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

  const match: EnrichedMatch = {
    id: calendarMatch.id,
    eventId: espnMatch ? null : effectiveEvent?.id ?? null,
    dataSource: espnMatch ? 'espn' : sofaEvent ? 'sofascore' : 'official',
    dataStale,
    sourceEventId: effectiveEvent ? String(effectiveEvent.id) : undefined,
    status,
    statusLabel: statusLabel(status, minute),
    phase,
    minute,
    startTimestamp: effectiveEvent?.startTimestamp ?? new Date(calendarMatch.matchDate).getTime() / 1000,
    kickoffFormatted: formatKickoff(effectiveEvent?.startTimestamp ?? new Date(calendarMatch.matchDate).getTime() / 1000),
    home,
    away,
    squadPlayers,
    squadPlayerCount: squadPlayers.length,
    events,
    important: squadPlayers.length > 0,
    notes: [...fetchNotes],
    lineups,
  };

  if (!sofaEvent && !espnMatch) {
    match.notes.push('Sin datos en vivo: no se encontró el partido en las fuentes externas. Reintenta la carga.');
  }

  try {
    const externalSummary = await fetchExternalMatchSummary(match);
    match.summary = externalSummary ?? generateMatchSummary(match);
  } catch {
    match.summary = generateMatchSummary(match);
  }

  return { match, fetchNotes };
}

export async function buildMatchesForWeek({ token, teamId, week, calendar, teamData }: BuildMatchesInput): Promise<BuildMatchesResult> {
  const notes: string[] = [];
  const teamsCatalog = await fetchTeamsCatalog(token);
  const officialTeams: OfficialTeam[] = teamsCatalog.map((t) => ({ id: t.id, name: t.name }));
  const teamsById = new Map(teamsCatalog.map((t) => [t.id, t]));

  if (officialTeams.length === 0) {
    notes.push('No se pudo cargar el catálogo oficial de equipos; el cruce con fuentes externas está desactivado.');
  }

  const timestamps = calendar.map((m) => new Date(m.matchDate).getTime() / 1000).filter(Number.isFinite);
  const minTs = timestamps.length > 0 ? Math.min(...timestamps) : 0;
  const maxTs = timestamps.length > 0 ? Math.max(...timestamps) : 0;

  // Dos fuentes complementarias de eventos: la jornada concreta
  // (`events/round/{n}`, imprescindible para jornadas pasadas porque
  // `events/last/0` solo devuelve la página más reciente) y la ventana
  // temporal alrededor del calendario oficial (cubre desajustes de numeración
  // entre la jornada de Fantasy y la ronda de SofaScore).
  const canQuerySofa = officialTeams.length > 0 && calendar.length > 0;

  const matchTeam = buildTeamMatcher(officialTeams);
  const espnMatches = canQuerySofa ? await fetchEspnMatches(minTs - MATCH_WINDOW_HOURS * 3600, maxTs + MATCH_WINDOW_HOURS * 3600) : [];
  const espnForMatch = (m: Match) => {
    const event = findSofaEvent(m, espnMatches.map(e => e.event), teamsById, matchTeam);
    return espnMatches.find(e => e.event.id === event?.id);
  };
  const needsSofa = canQuerySofa && calendar.some(m => !espnForMatch(m));
  const [roundEvents, sofaWindow] = needsSofa
    ? await Promise.all([
        fetchLaLigaEventsRound(week),
        fetchLaLigaEventsWindow(minTs - MATCH_WINDOW_HOURS * 3600, maxTs + MATCH_WINDOW_HOURS * 3600),
      ])
    : [[] as SofaEvent[], null];

  const sofaEvents = new Map<number, SofaEvent>();
  for (const event of [...roundEvents, ...(sofaWindow?.events ?? [])]) {
    sofaEvents.set(event.id, event);
  }

  if (needsSofa && sofaEvents.size === 0) {
    notes.push('No se pudieron obtener eventos de SofaScore para la jornada.');
  }

  const allSofaEvents = [...sofaEvents.values()];
  // Un único matcher para toda la jornada: construirlo por partido repetía su
  // trabajo (y sus avisos) una vez por encuentro.
  const ownPlayers = teamData.players.map((p) => p.playerMaster);

  const enrichedMatches: EnrichedMatch[] = [];

  // ESPN entrega todos los detalles en una petición por partido. Limitamos
  // la concurrencia para acotar la latencia sin saturar las fuentes.
  for (let i = 0; i < calendar.length; i += ENRICH_CONCURRENCY) {
    const chunk = calendar.slice(i, i + ENRICH_CONCURRENCY);
    const results = await Promise.all(
      chunk.map((calendarMatch) =>
        buildEnrichedMatch(
          calendarMatch,
          findSofaEvent(calendarMatch, allSofaEvents, teamsById, matchTeam),
          ownPlayers,
          teamsById,
          espnForMatch(calendarMatch),
        ),
      ),
    );
    for (const { match, fetchNotes } of results) {
      enrichedMatches.push(match);
      notes.push(...fetchNotes);
    }
  }

  return { matches: enrichedMatches, notes: [...new Set(notes)] };
}

export function sortMatches(matches: EnrichedMatch[]): EnrichedMatch[] {
  return [...matches].sort((a, b) => {
    // Importancia primero.
    if (a.important !== b.important) return a.important ? -1 : 1;
    if (a.squadPlayerCount !== b.squadPlayerCount) return b.squadPlayerCount - a.squadPlayerCount;

    const statusDiff = statusPriority[a.status] - statusPriority[b.status];
    if (statusDiff !== 0) return statusDiff;

    return a.startTimestamp - b.startTimestamp;
  });
}
