import type { PlayerWeekStat } from './player-stats';

/**
 * Forma reciente y minutos esperados a partir de `playerStats` (§4.3 del
 * diseño): ventana de 10 jornadas con decaimiento exponencial ξ ≈ 0.0065/día
 * (vida media ~107 días, parámetro Dixon-Coles estándar). Como el dato llega
 * por jornada, el decaimiento se aplica por semana: ξ_semana = 0.0065 × 7.
 *
 * Reglas:
 * - Los minutos esperados promedian TODAS las jornadas de la ventana, incluidas
 *   las de 0 minutos (no solo las jugadas).
 * - Las medias por 90' se calculan solo con partidos de ≥60' (rendimiento
 *   estable); si no hay ninguno, se usan los de >0' y se anota.
 */

/** Decaimiento exponencial por día (Dixon-Coles). */
export const XI_PER_DAY = 0.0065;
/** Ventana de jornadas consideradas (óptimo bias-varianza según fpl-solver). */
export const FORM_WINDOW = 10;
/** Mínimo de minutos para que un partido cuente en las medias por 90'. */
export const MIN_MINUTES_FOR_PER90 = 60;

export interface PlayerForm {
  /** Jornadas con dato dentro de la ventana. */
  weeksUsed: number;
  /** Media ponderada de puntos por jornada jugada (mins > 0); null si nunca jugó. */
  pointsPerGame: number | null;
  /** Desviación típica de los puntos por jornada jugada (riesgo/rotación). */
  pointsStdDev: number | null;
  /** Minutos esperados: media ponderada contando también las jornadas con 0'. */
  expectedMinutes: number | null;
  /** Puntos por 90' desglosados por acción (tupla [valor, puntos] → puntos). */
  pointsPer90ByStat: Record<string, number> | null;
  /** Puntos totales por 90' (suma del desglose, o totalPoints/90 si falta el desglose). */
  pointsPer90: number | null;
  /** true si las medias por 90' se calcularon con partidos de <60' (menos fiables). */
  per90FromShortMatches: boolean;
}

function minutesOf(stat: PlayerWeekStat): number {
  return stat.stats?.mins_played?.[0] ?? 0;
}

/** Media ponderada con decaimiento; devuelve null si no hay muestras. */
function decayedMean(values: { value: number; weight: number }[]): number | null {
  if (values.length === 0) return null;
  const weightSum = values.reduce((sum, v) => sum + v.weight, 0);
  if (weightSum <= 0) return null;
  return values.reduce((sum, v) => sum + v.value * v.weight, 0) / weightSum;
}

/**
 * Calcula la forma de un jugador. `referenceWeek` es la jornada actual: el
 * decaimiento se aplica respecto a ella para que las jornadas sin dato
 * recientes (lesión, sanción) enfríen la forma. Si no se indica, se usa la
 * última jornada con dato del propio jugador.
 */
export function recentForm(playerStats: PlayerWeekStat[], referenceWeek?: number): PlayerForm {
  const sorted = [...playerStats]
    .filter((s) => Number.isFinite(s.weekNumber) && (referenceWeek === undefined || s.weekNumber < referenceWeek))
    .sort((a, b) => b.weekNumber - a.weekNumber)
    .slice(0, FORM_WINDOW);

  if (sorted.length === 0) {
    return { weeksUsed: 0, pointsPerGame: null, pointsStdDev: null, expectedMinutes: null, pointsPer90ByStat: null, pointsPer90: null, per90FromShortMatches: false };
  }

  const refWeek = referenceWeek ?? sorted[0].weekNumber;
  const weightOf = (s: PlayerWeekStat) => Math.exp(-XI_PER_DAY * 7 * Math.max(0, refWeek - s.weekNumber));

  const played = sorted.filter((s) => minutesOf(s) > 0);

  const pointsPerGame = decayedMean(played.map((s) => ({ value: s.totalPoints ?? 0, weight: weightOf(s) })));
  const expectedMinutes = decayedMean(sorted.map((s) => ({ value: minutesOf(s), weight: weightOf(s) })));

  // Desviación típica de los puntos por jornada jugada (para xP − λ·σ).
  let pointsStdDev: number | null = null;
  if (played.length >= 2) {
    const mean = played.reduce((sum, s) => sum + (s.totalPoints ?? 0), 0) / played.length;
    const variance = played.reduce((sum, s) => sum + ((s.totalPoints ?? 0) - mean) ** 2, 0) / (played.length - 1);
    pointsStdDev = Math.sqrt(variance);
  }

  // Medias por 90' por acción: primero con partidos de ≥60', si no con los de >0'.
  let per90Pool = played.filter((s) => minutesOf(s) >= MIN_MINUTES_FOR_PER90);
  let per90FromShortMatches = false;
  if (per90Pool.length === 0 && played.length > 0) {
    per90Pool = played;
    per90FromShortMatches = true;
  }

  let pointsPer90ByStat: Record<string, number> | null = null;
  let pointsPer90: number | null = null;

  if (per90Pool.length > 0) {
    const statKeys = new Set<string>();
    for (const s of per90Pool) {
      for (const key of Object.keys(s.stats || {})) statKeys.add(key);
    }

    pointsPer90ByStat = {};
    for (const key of statKeys) {
      const rate = decayedMean(
        per90Pool.map((s) => ({
          value: ((s.stats?.[key]?.[1] ?? 0) / minutesOf(s)) * 90,
          weight: weightOf(s),
        })),
      );
      pointsPer90ByStat[key] = rate ?? 0;
    }

    const sumComponents = Object.values(pointsPer90ByStat).reduce((sum, v) => sum + v, 0);
    if (statKeys.size > 0) {
      pointsPer90 = sumComponents;
    } else {
      // Sin desglose por acción: caer a totalPoints por 90'.
      pointsPer90ByStat = null;
      pointsPer90 = decayedMean(
        per90Pool.map((s) => ({ value: ((s.totalPoints ?? 0) / minutesOf(s)) * 90, weight: weightOf(s) })),
      );
    }
  }

  return { weeksUsed: sorted.length, pointsPerGame, pointsStdDev, expectedMinutes, pointsPer90ByStat, pointsPer90, per90FromShortMatches };
}
