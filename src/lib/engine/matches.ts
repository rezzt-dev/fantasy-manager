import { fetchOfficialAPI, CMP } from '../fantasy/api-proxy';
import { fetchTeamsMaster } from '../fantasy/teams';
import { fetchLaLigaEventsWindow, fetchEventDetails, fetchEventIncidents, fetchEventLineups, teamLogoUrl } from './sources/sofascore';
import { generateMatchSummary, fetchExternalMatchSummary } from './sources/match-summary';
import { buildTeamMatcher } from './team-names';
import type { OfficialTeam } from './team-names';
import type { TeamData, WeekInfo, Match, PlayerMaster, EnrichedMatch, MatchEvent, SquadPlayerInMatch, EnrichedMatchTeam, EnrichedMatchStatus, MatchPhase } from '../../types/fantasy';
import type { SofaEvent, SofaIncident } from './sources/sofascore';

const MATCH_WINDOW_HOURS = 48;

interface BuildMatchesInput {
  token: string;
  teamId: number;
  currentWeek: number;
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

function formatKickoff(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toLocaleString('es-ES', {
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
  if (status === 'halftime') return 'descanso';
  if (status === 'inprogress') {
    if (period === 'secondHalf') return 'segunda-parte';
    return 'primera-parte';
  }
  if (status === 'postponed') return 'pendiente';
  if (status === 'canceled') return 'pendiente';
  return 'desconocido';
}

function computeMinute(event: SofaEvent): number | null {
  if (event.status?.type !== 'inprogress') return null;

  if (event.time?.currentMinute !== undefined && event.time.currentMinute !== null) {
    return event.time.currentMinute;
  }

  const periodStart = event.time?.currentPeriodStartTimestamp;
  if (periodStart) {
    const elapsed = Math.floor((Date.now() / 1000 - periodStart) / 60);
    const base = event.time?.period === 'secondHalf' ? 45 : 0;
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

function findSofaEvent(
  calendarMatch: Match,
  sofaEvents: SofaEvent[],
  officialTeams: OfficialTeam[],
): SofaEvent | null {
  const localTeam = officialTeams.find((t) => t.id === calendarMatch.localId);
  const visitorTeam = officialTeams.find((t) => t.id === calendarMatch.visitorId);
  if (!localTeam || !visitorTeam) return null;

  const matchTs = new Date(calendarMatch.matchDate).getTime() / 1000;
  const matchTeam = buildTeamMatcher(officialTeams);

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

async function buildEnrichedMatch(
  calendarMatch: Match,
  sofaEvent: SofaEvent | null,
  ownPlayers: PlayerMaster[],
  officialTeams: OfficialTeam[],
): Promise<{ match: EnrichedMatch; fetchNotes: string[] }> {
  const fetchNotes: string[] = [];
  const squadPlayers = buildSquadPlayers(calendarMatch, ownPlayers);

  let details: SofaEvent | null = null;
  let incidents: SofaIncident[] = [];
  let lineups: EnrichedMatch['lineups'] = undefined;

  if (sofaEvent) {
    try {
      details = await fetchEventDetails(sofaEvent.id);
    } catch {
      fetchNotes.push(`No se pudieron cargar detalles del partido ${calendarMatch.localId}-${calendarMatch.visitorId}.`);
    }

    try {
      const incidentData = await fetchEventIncidents(sofaEvent.id);
      incidents = incidentData?.incidents ?? [];
    } catch {
      fetchNotes.push(`No se pudieron cargar incidentes del partido ${calendarMatch.localId}-${calendarMatch.visitorId}.`);
    }

    try {
      lineups = (await fetchEventLineups(sofaEvent.id)) ?? undefined;
    } catch {
      fetchNotes.push(`No se pudieron cargar alineaciones del partido ${calendarMatch.localId}-${calendarMatch.visitorId}.`);
    }
  }

  const effectiveEvent = details ?? sofaEvent;
  const status = mapStatus(effectiveEvent?.status?.type);
  const minute = effectiveEvent ? computeMinute(effectiveEvent) : null;
  const phase = computePhase(effectiveEvent);

  const localTeam = officialTeams.find((t) => t.id === calendarMatch.localId);
  const visitorTeam = officialTeams.find((t) => t.id === calendarMatch.visitorId);

  const home: EnrichedMatchTeam = {
    id: calendarMatch.localId,
    name: localTeam?.name ?? String(calendarMatch.localId),
    shortName: effectiveEvent?.homeTeam.shortName,
    logoUrl: effectiveEvent?.homeTeam.id ? teamLogoUrl(effectiveEvent.homeTeam.id) : '',
    score: effectiveEvent?.homeScore?.current ?? calendarMatch.localScore ?? null,
  };

  const away: EnrichedMatchTeam = {
    id: calendarMatch.visitorId,
    name: visitorTeam?.name ?? String(calendarMatch.visitorId),
    shortName: effectiveEvent?.awayTeam.shortName,
    logoUrl: effectiveEvent?.awayTeam.id ? teamLogoUrl(effectiveEvent.awayTeam.id) : '',
    score: effectiveEvent?.awayScore?.current ?? calendarMatch.visitorScore ?? null,
  };

  const events: MatchEvent[] = incidents
    .map(mapIncident)
    .filter((e): e is MatchEvent => e !== null)
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

  const match: EnrichedMatch = {
    id: calendarMatch.id,
    eventId: effectiveEvent?.id ?? null,
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
    notes: [],
    lineups,
  };

  if (!sofaEvent) {
    match.notes.push('Sin datos en vivo: no se encontró el partido en SofaScore.');
  }

  try {
    const externalSummary = await fetchExternalMatchSummary(match);
    match.summary = externalSummary ?? generateMatchSummary(match);
  } catch {
    match.summary = generateMatchSummary(match);
  }

  return { match, fetchNotes };
}

export async function buildMatchesForWeek({ token, teamId, currentWeek, calendar, teamData }: BuildMatchesInput): Promise<BuildMatchesResult> {
  const notes: string[] = [];
  const officialTeams = await fetchTeamsMaster(token);

  if (officialTeams.length === 0) {
    notes.push('No se pudo cargar el catálogo oficial de equipos; el cruce con SofaScore está desactivado.');
  }

  const timestamps = calendar.map((m) => new Date(m.matchDate).getTime() / 1000);
  const minTs = timestamps.length > 0 ? Math.min(...timestamps) : 0;
  const maxTs = timestamps.length > 0 ? Math.max(...timestamps) : 0;

  const sofaWindow =
    officialTeams.length > 0 && calendar.length > 0
      ? await fetchLaLigaEventsWindow(minTs - MATCH_WINDOW_HOURS * 3600, maxTs + MATCH_WINDOW_HOURS * 3600)
      : null;

  if (!sofaWindow) {
    notes.push('No se pudieron obtener eventos de SofaScore para la jornada.');
  }

  const ownPlayers = teamData.players.map((p) => p.playerMaster);

  const enrichedMatches: EnrichedMatch[] = [];

  for (const calendarMatch of calendar) {
    const sofaEvent = sofaWindow ? findSofaEvent(calendarMatch, sofaWindow.events, officialTeams) : null;
    const { match, fetchNotes } = await buildEnrichedMatch(calendarMatch, sofaEvent, ownPlayers, officialTeams);
    enrichedMatches.push(match);
    notes.push(...fetchNotes);
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
