/**
 * Contratos de los adaptadores de fuentes externas (§3.5.3 del diseño): cada
 * fuente devuelve estos tipos; si una web cambia, solo se reescribe su
 * adaptador.
 */

/** ClubElo: rating de un equipo. */
export interface TeamElo {
  /** Nombre del equipo tal como lo publica la fuente. */
  sourceName: string;
  elo: number;
}

/** Jornada Perfecta: once probable de un equipo para un partido. */
export interface ProbableLineupPlayer {
  /** Slug del jugador en la fuente (p. ej. 'toni-martinez'). */
  slug: string;
  /** Nombre corto mostrado (p. ej. 'T. Martínez'). */
  name: string;
  /** Probabilidad de titularidad 0-100 (100 si no se indica). */
  probability: number;
}

export interface ProbableLineup {
  /** Nombre del equipo tal como lo publica la fuente. */
  sourceTeamName: string;
  starters: ProbableLineupPlayer[];
  /** Suplentes con opciones de jugar (texto "D. Suárez 40%"). */
  alternatives: ProbableLineupPlayer[];
}

export interface ProbableMatch {
  homeSourceName: string;
  awaySourceName: string;
  /** Fecha ISO del partido si la fuente la expone. */
  matchDate?: string;
  lineups: ProbableLineup[];
}

/** Bajas y dudas (Jornada Perfecta, sección "no disponibles"). */
export interface InjuryReportEntry {
  /** Slug del jugador en la fuente (clave de cruce preferida). */
  slug?: string;
  name: string;
  sourceTeamName?: string;
  status: 'injured' | 'suspended' | 'doubt' | 'other';
  /** Nota de la fuente (p. ej. 'Vuelta indefinida', 'Pp. noviembre'). */
  note?: string;
}

/** Sofascore: alineación confirmada de un equipo (~1 h antes del partido). */
export interface ConfirmedLineup {
  /** Nombre del equipo tal como lo publica Sofascore. */
  sourceTeamName: string;
  starters: string[];
  bench: string[];
}

/** FútbolFantasy Analytics: tendencia de valor de mercado de un jugador. */
export interface ValueTrend {
  playerName: string;
  sourceTeamName: string;
  /** Código de posición de la fuente (POR, DFC, MED, DEL). */
  positionCode: string;
  /** Indicador de tendencia de la fuente (positivo sube, negativo baja). */
  trendScore: number;
  /** Variación de valor en € a 1 y 7 días. */
  diff1d: number;
  diff7d: number;
  /** Variación de valor en % a 1 y 7 días. */
  pct1d: number;
  pct7d: number;
}
