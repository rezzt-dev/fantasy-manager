import { currentSeasonId, fetchTournamentEventsPage, type SofaEvent, type SofaEventsPage, type SofaRoundInfo } from './sofascore';
import { buildTeamMatcher, type OfficialTeam } from '../team-names';
import type { EuropeanCompetition, EuropeanFixture, EuropeanStage } from './types';

/**
 * Adaptador de competiciones europeas de clubes (UEFA) vía Sofascore.
 *
 * Devuelve los partidos de Champions, Europa League y Conference de los
 * equipos **de LaLiga**, en una ventana alrededor de la jornada. Es la fuente
 * de la coordinación con Europa: sin saber que el Madrid juega el martes en
 * Champions no se puede anticipar a quién va a reservar el sábado.
 *
 * Decisiones del adaptador:
 *
 * - **Tres competiciones, no solo la Champions.** Un equipo de Conference
 *   también rota, aunque menos; el peso relativo lo decide el modelo
 *   (`features/european-load.ts`), no esta capa.
 * - **Ventana hacia delante y hacia atrás.** `next` cubre el partido europeo
 *   que viene después de la jornada (reserva de titulares) y `last` el que se
 *   jugó antes (fatiga). Ambos casos cambian el once de LaLiga.
 * - **El id de temporada nunca se codifica a mano**: cambia cada año y se
 *   resuelve contra la fuente.
 * - **Cruce de equipos por nombre** con el mismo normalizador que el resto de
 *   fuentes. Un nombre que no cruza se descarta en silencio: la inmensa
 *   mayoría son equipos de otros países, que es el caso normal, no un fallo.
 * - **Degradación graciosa.** Si Sofascore no responde, la lista viene vacía y
 *   el motor se comporta exactamente como antes de esta funcionalidad.
 */

interface CompetitionSpec {
  competition: EuropeanCompetition;
  /** uniqueTournament de Sofascore. */
  tournamentId: number;
  name: string;
}

export const EUROPEAN_COMPETITIONS: CompetitionSpec[] = [
  { competition: 'ucl', tournamentId: 7, name: 'Champions League' },
  { competition: 'uel', tournamentId: 679, name: 'Europa League' },
  { competition: 'uecl', tournamentId: 17015, name: 'Conference League' },
];

export const COMPETITION_NAMES: Record<EuropeanCompetition, string> = {
  ucl: 'Champions League',
  uel: 'Europa League',
  uecl: 'Conference League',
};

/** Nombre corto para chips y tablas, donde no cabe el nombre completo. */
export const COMPETITION_SHORT_NAMES: Record<EuropeanCompetition, string> = {
  ucl: 'Champions',
  uel: 'Europa L.',
  uecl: 'Conference',
};

/**
 * TTL 6 h: el calendario europeo se publica con semanas de antelación y solo
 * cambia por aplazamientos. Lo que sí es volátil (el resultado) no lo usa el
 * modelo de carga, que solo necesita fechas.
 */
const TTL_MS = 6 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PAGES = 12;

/** Ocho semanas para planificación; dos previas para recuperación. */
export async function collectEuropeanEvents(
  readPage: (page: number) => Promise<SofaEventsPage | null>,
  direction: 'next' | 'last',
  now: number,
): Promise<SofaEvent[]> {
  const events: SofaEvent[] = [];
  const boundary = now + (direction === 'next' ? 56 : -14) * DAY_MS;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await readPage(page);
    if (!data?.events?.length) break;
    events.push(...data.events);
    const reachedBoundary = data.events.some((event) => {
      const kickoff = event.startTimestamp * 1000;
      return Number.isFinite(kickoff) && (direction === 'next' ? kickoff >= boundary : kickoff <= boundary);
    });
    if (data.hasNextPage === false || reachedBoundary) break;
  }
  return events;
}

export interface EuropeanFixturesResult {
  fixtures: EuropeanFixture[];
  /** teamIds de LaLiga con al menos un partido europeo en la ventana. */
  teamsInvolved: Set<number>;
  /** Competiciones que respondieron con datos. */
  competitions: EuropeanCompetition[];
  origin: 'network' | 'unavailable';
}

/**
 * Fase de la competición a partir de la ronda que publica la fuente.
 *
 * La fase de liga de la UEFA numera las rondas 1-8 sin nombre; las
 * eliminatorias traen nombre y/o `cupRoundType`. La previa se distingue por su
 * prefijo. Ante la duda se devuelve `league-phase`, que es la fase con el peso
 * intermedio: equivocarse hacia el centro nunca invierte una recomendación.
 */
export function stageFromRoundInfo(info: SofaRoundInfo | undefined): EuropeanStage {
  if (!info) return 'league-phase';
  const text = `${info.name ?? ''} ${info.slug ?? ''} ${info.prefix ?? ''}`.toLowerCase();
  if (/qualif|preliminar|previa/.test(text)) return 'qualifying';
  if (typeof info.cupRoundType === 'number' && info.cupRoundType > 0) return 'knockout';
  if (/final|semi|quarter|round of|octav|cuartos|play.?off|knockout|eliminat/.test(text)) return 'knockout';
  return 'league-phase';
}

function played(event: SofaEvent): boolean {
  const type = event.status?.type;
  return type === 'finished' || type === 'inprogress' || type === 'halftime';
}

export function toEuropeanFixtures(
  event: SofaEvent,
  competition: EuropeanCompetition,
  matchTeam: (name: string) => number | null,
): EuropeanFixture[] {
  // No convertir fechas obsoletas de partidos suspendidos en cansancio real.
  if (event.status?.type && !['notstarted', 'inprogress', 'halftime', 'finished'].includes(event.status.type)) return [];
  const kickoff = Number(event.startTimestamp) * 1000;
  if (!Number.isFinite(kickoff) || kickoff <= 0) return [];

  const stage = stageFromRoundInfo(event.roundInfo);
  const common = {
    competition,
    stage,
    kickoff,
    round: event.roundInfo?.round,
    roundName: event.roundInfo?.name,
    played: played(event),
    eventId: event.id,
  };

  const sides: EuropeanFixture[] = [];
  const home = matchTeam(event.homeTeam?.name ?? '');
  if (home !== null) sides.push({ ...common, teamId: home, isHome: true, opponentName: event.awayTeam?.name ?? 'Rival' });
  const away = matchTeam(event.awayTeam?.name ?? '');
  if (away !== null) sides.push({ ...common, teamId: away, isHome: false, opponentName: event.homeTeam?.name ?? 'Rival' });
  return sides;
}

/**
 * Partidos europeos de los equipos de LaLiga en la ventana consultable.
 *
 * Nunca lanza: sin red devuelve una lista vacía y el motor sigue funcionando
 * como si la funcionalidad no existiera.
 */
export async function fetchEuropeanFixtures(officialTeams: OfficialTeam[]): Promise<EuropeanFixturesResult> {
  const empty: EuropeanFixturesResult = {
    fixtures: [],
    teamsInvolved: new Set(),
    competitions: [],
    origin: 'unavailable',
  };
  if (officialTeams.length === 0) return empty;

  const now = Date.now();
  const matchTeam = buildTeamMatcher(officialTeams);
  const fixtures: EuropeanFixture[] = [];
  const competitions: EuropeanCompetition[] = [];

  const results = await Promise.all(EUROPEAN_COMPETITIONS.map(async (spec) => {
    const competitionFixtures: EuropeanFixture[] = [];
    try {
      const seasonId = await currentSeasonId(spec.tournamentId);
      if (seasonId === null) return { fixtures: competitionFixtures, available: false };

      const pages = await Promise.all((['next', 'last'] as const).map((direction) =>
        collectEuropeanEvents(
          (page) => fetchTournamentEventsPage(spec.tournamentId, seasonId, direction, page, TTL_MS),
          direction,
          now,
        ),
      ));

      const events = pages.flat();
      for (const event of events) competitionFixtures.push(...toEuropeanFixtures(event, spec.competition, matchTeam));
      return { fixtures: competitionFixtures, available: events.length > 0 };
    } catch (error) {
      console.warn(`[uefa] ${spec.name} no disponible:`, error instanceof Error ? error.message : error);
    }
    return { fixtures: competitionFixtures, available: false };
  }));
  results.forEach((result, index) => {
    fixtures.push(...result.fixtures);
    if (result.available) competitions.push(EUROPEAN_COMPETITIONS[index].competition);
  });

  // Un partido puede llegar por dos páginas distintas (los rangos se solapan).
  const deduped = [...new Map(fixtures.map((f) => [`${f.eventId}:${f.teamId}`, f])).values()].sort(
    (a, b) => a.kickoff - b.kickoff,
  );

  if (deduped.length === 0) return { ...empty, competitions };

  return {
    fixtures: deduped,
    teamsInvolved: new Set(deduped.map((f) => f.teamId)),
    competitions,
    origin: 'network',
  };
}
