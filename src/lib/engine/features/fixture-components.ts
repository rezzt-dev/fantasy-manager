/**
 * Descomposición de los puntos de un jugador en componentes que responden de
 * forma distinta al emparejamiento de la jornada.
 *
 * El desglose por acción de `playerStats` (tuplas `[valor, puntos]`) permite
 * saber de dónde salen los puntos de cada jugador, y cada uno de esos orígenes
 * reacciona a un motor distinto del partido:
 *
 * | Componente        | Motor                     | Elasticidad |
 * |-------------------|---------------------------|-------------|
 * | Ataque            | goles esperados a favor    | 1.00        |
 * | Participación     | goles esperados a favor    | 0.50        |
 * | Goles encajados   | goles esperados en contra  | 1.00        |
 * | Portería a cero   | P(portería a cero)         | 1.00        |
 * | Paradas           | goles esperados en contra  | 0.75        |
 * | Volumen defensivo | goles esperados en contra  | 0.35        |
 * | Disciplina        | goles esperados en contra  | 0.30        |
 * | Pérdidas          | goles esperados en contra  | 0.25        |
 * | Puntos de medios  | puntos esperados (0-3)     | aditiva     |
 * | Neutro            | —                          | 0           |
 *
 * Las elasticidades no son arbitrarias:
 *
 * - **Ataque = 1**: los goles de un jugador son su cuota de los goles del
 *   equipo, y esa cuota no depende del rival. Si el equipo espera la mitad de
 *   goles, él espera la mitad. Es el único valor coherente con el modelo.
 * - **Participación = 0.5**: entradas en área y regates ganados crecen con el
 *   dominio, pero mucho menos que proporcionalmente (un equipo encerrado sigue
 *   teniendo transiciones).
 * - **Goles encajados = 1**: la penalización es lineal en los goles recibidos,
 *   así que escala con su esperanza.
 * - **Paradas = 0.75**: las paradas crecen con los remates recibidos, pero un
 *   rival mejor convierte una fracción mayor de sus remates, así que crecen
 *   algo menos que los goles esperados en contra.
 * - **Volumen defensivo, disciplina y pérdidas**: sensibilidades pequeñas y
 *   del mismo signo (defender más ⇒ más despejes, más faltas y más pérdidas).
 * - **Puntos de medios**: la nota de la prensa depende sobre todo de la
 *   actuación individual, pero está sesgada por el resultado; se modela como
 *   un ajuste aditivo pequeño sobre los puntos esperados del partido.
 *
 * Un componente sin clasificar es **neutro**: si LaLiga añade una acción nueva
 * al desglose, el peor caso es que no se ajuste, nunca que se ajuste al revés.
 */

import { recentForm } from '../form';
import type { PlayerWeekStat } from '../player-stats';

export type FixtureComponent =
  | 'attack'
  | 'involvement'
  | 'conceded'
  | 'cleanSheet'
  | 'saves'
  | 'defensiveVolume'
  | 'discipline'
  | 'possession'
  | 'result'
  | 'neutral';

export type FixtureDriver = 'goalsFor' | 'goalsAgainst' | 'cleanSheet' | 'result' | 'none';

export interface ComponentSpec {
  driver: FixtureDriver;
  /** Exponente sobre el cociente respecto al partido de referencia. */
  elasticity: number;
  /** Banda del multiplicador del componente (protege ante Elo extremos). */
  min: number;
  max: number;
}

export const COMPONENT_SPECS: Record<FixtureComponent, ComponentSpec> = {
  attack: { driver: 'goalsFor', elasticity: 1, min: 0.45, max: 1.75 },
  involvement: { driver: 'goalsFor', elasticity: 0.5, min: 0.7, max: 1.35 },
  conceded: { driver: 'goalsAgainst', elasticity: 1, min: 0.45, max: 2.2 },
  cleanSheet: { driver: 'cleanSheet', elasticity: 1, min: 0.35, max: 2.2 },
  saves: { driver: 'goalsAgainst', elasticity: 0.75, min: 0.6, max: 1.7 },
  defensiveVolume: { driver: 'goalsAgainst', elasticity: 0.35, min: 0.8, max: 1.3 },
  discipline: { driver: 'goalsAgainst', elasticity: 0.3, min: 0.8, max: 1.3 },
  possession: { driver: 'goalsAgainst', elasticity: 0.25, min: 0.85, max: 1.2 },
  result: { driver: 'result', elasticity: 0, min: 0.85, max: 1.2 },
  neutral: { driver: 'none', elasticity: 0, min: 1, max: 1 },
};

/**
 * Sensibilidad de los puntos de medios a los puntos esperados del partido
 * (escala 0-3). Un partido ganado con holgura frente a uno perdido mueve la
 * nota media alrededor de un ±10%.
 */
export const RESULT_SENSITIVITY = 0.1;

/**
 * Acción del desglose oficial → componente. Las claves son las que devuelve
 * `playerStats[].stats` en la app de LaLiga Fantasy.
 */
const COMPONENT_BY_STAT: Record<string, FixtureComponent> = {
  goals: 'attack',
  goal_assist: 'attack',
  penalty_scored: 'attack',
  pen_area_entries: 'involvement',
  won_contest: 'involvement',
  goals_conceded: 'conceded',
  clean_sheet: 'cleanSheet',
  saves: 'saves',
  penalty_save: 'saves',
  effective_clearance: 'defensiveVolume',
  ball_recovery: 'defensiveVolume',
  yellow_card: 'discipline',
  red_card: 'discipline',
  second_yellow_card: 'discipline',
  own_goals: 'conceded',
  poss_lost_all: 'possession',
  marca_points: 'result',
  mins_played: 'neutral',
};

/** Componente de una acción del desglose; `neutral` si no está clasificada. */
export function componentOfStat(stat: string): FixtureComponent {
  const direct = COMPONENT_BY_STAT[stat];
  if (direct) return direct;
  // Tolerancia a variantes de nombre de la portería a cero, que es el
  // componente con más peso para porteros y defensas.
  if (/clean.?sheet/i.test(stat)) return 'cleanSheet';
  return 'neutral';
}

/** Cuota de los puntos totales que aporta cada componente (suma 1). */
export type ComponentShares = Record<FixtureComponent, number>;

const ZERO_SHARES: ComponentShares = {
  attack: 0,
  involvement: 0,
  conceded: 0,
  cleanSheet: 0,
  saves: 0,
  defensiveVolume: 0,
  discipline: 0,
  possession: 0,
  result: 0,
  neutral: 0,
};

export function emptyShares(): ComponentShares {
  return { ...ZERO_SHARES };
}

/**
 * Cuotas estructurales por posición (1 POR, 2 DEF, 3 MED, 4 DEL, 5 ENT).
 *
 * Son el prior de pretemporada, en la misma línea que la jerarquía de §4.5:
 * en cuanto hay jornadas jugadas se sustituyen por las cuotas observadas del
 * catálogo, y las de cada jugador se mezclan con las de su posición por
 * partial pooling. Suman 1 (los componentes negativos restan).
 */
export const POSITION_SHARE_PRIORS: Record<number, ComponentShares> = {
  1: { ...ZERO_SHARES, neutral: 0.45, saves: 0.42, conceded: -0.25, result: 0.32, defensiveVolume: 0.05, discipline: -0.02, possession: -0.02, attack: 0.03, involvement: 0.02 },
  2: { ...ZERO_SHARES, neutral: 0.4, conceded: -0.3, defensiveVolume: 0.38, result: 0.3, attack: 0.22, involvement: 0.1, discipline: -0.05, possession: -0.05 },
  3: { ...ZERO_SHARES, neutral: 0.35, attack: 0.3, involvement: 0.14, result: 0.28, defensiveVolume: 0.12, conceded: -0.04, discipline: -0.05, possession: -0.1 },
  4: { ...ZERO_SHARES, neutral: 0.32, attack: 0.42, involvement: 0.16, result: 0.26, defensiveVolume: 0.02, discipline: -0.04, possession: -0.14 },
  5: { ...ZERO_SHARES, neutral: 0.4, result: 0.6 },
};

/** Prior de la posición, con el de centrocampista como último recurso. */
export function priorSharesForPosition(positionId: number): ComponentShares {
  return POSITION_SHARE_PRIORS[positionId] ?? POSITION_SHARE_PRIORS[3];
}

/**
 * Cuotas a partir de puntos por 90' desglosados por acción. Devuelve null si
 * los puntos netos son demasiado pequeños para que las cuotas signifiquen
 * algo: dividir por un total próximo a cero dispara cualquier cociente.
 */
const MIN_NET_POINTS_FOR_SHARES = 1;

export function sharesFromPointsPer90(pointsPer90ByStat: Record<string, number>): ComponentShares | null {
  const byComponent = emptyShares();
  let total = 0;
  for (const [stat, points] of Object.entries(pointsPer90ByStat)) {
    if (!Number.isFinite(points)) continue;
    byComponent[componentOfStat(stat)] += points;
    total += points;
  }
  if (total < MIN_NET_POINTS_FOR_SHARES) return null;

  const shares = emptyShares();
  for (const component of Object.keys(byComponent) as FixtureComponent[]) {
    shares[component] = byComponent[component] / total;
  }
  return shares;
}

/**
 * Mezcla de cuotas observadas y del prior con el mismo partial pooling que
 * §4.5: con pocas jornadas, el reparto de un jugador es ruido (dos goles en
 * tres partidos convierten a un defensa en delantero a ojos del modelo).
 */
export function poolShares(observed: ComponentShares, n: number, prior: ComponentShares, k: number): ComponentShares {
  if (n <= 0) return { ...prior };
  const weight = n / (n + k);
  const pooled = emptyShares();
  for (const component of Object.keys(pooled) as FixtureComponent[]) {
    pooled[component] = weight * observed[component] + (1 - weight) * prior[component];
  }
  return pooled;
}

/**
 * Cuotas observadas por posición sobre el universo de jugadores con stats.
 * Agrega puntos (no medias de cuotas) para que los jugadores con más minutos
 * pesen lo que les toca y para que un jugador con pocos puntos no distorsione
 * el reparto.
 */
export function buildFixtureShares(
  entries: { positionId: number; pointsPer90ByStat: Record<string, number> | null }[],
): Map<number, ComponentShares> {
  const totals = new Map<number, { byComponent: ComponentShares; total: number }>();

  for (const entry of entries) {
    if (!entry.pointsPer90ByStat) continue;
    const positionId = Number(entry.positionId);
    if (!Number.isFinite(positionId) || positionId <= 0) continue;
    let bucket = totals.get(positionId);
    if (!bucket) totals.set(positionId, (bucket = { byComponent: emptyShares(), total: 0 }));
    for (const [stat, points] of Object.entries(entry.pointsPer90ByStat)) {
      if (!Number.isFinite(points)) continue;
      bucket.byComponent[componentOfStat(stat)] += points;
      bucket.total += points;
    }
  }

  const shares = new Map<number, ComponentShares>();
  for (const [positionId, bucket] of totals) {
    if (bucket.total < MIN_NET_POINTS_FOR_SHARES) continue;
    const positionShares = emptyShares();
    for (const component of Object.keys(positionShares) as FixtureComponent[]) {
      positionShares[component] = bucket.byComponent[component] / bucket.total;
    }
    shares.set(positionId, positionShares);
  }
  return shares;
}

/**
 * Atajo desde `playerStats` en crudo: aplica la misma ventana con decaimiento
 * que usa el estimador para que las cuotas de referencia y las del jugador se
 * midan exactamente igual.
 */
export function buildFixtureSharesFromStats(
  entries: { positionId: number; playerStats: PlayerWeekStat[] }[],
  referenceWeek?: number,
): Map<number, ComponentShares> {
  return buildFixtureShares(
    entries.map((entry) => ({
      positionId: entry.positionId,
      pointsPer90ByStat: entry.playerStats.length > 0 ? recentForm(entry.playerStats, referenceWeek).pointsPer90ByStat : null,
    })),
  );
}
