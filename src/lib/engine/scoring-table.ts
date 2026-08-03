import type { PlayerWeekStat } from './player-stats';

/**
 * Tabla de puntuación por acción (§4.2 del diseño), DERIVADA de los
 * `playerStats` acumulados: la API devuelve cada stat como tupla
 * `[valor, puntos]`, así que los puntos por unidad de cada acción se obtienen
 * por inspección directa (mediana de puntos/valor sobre todas las muestras).
 *
 * No hay constantes inventadas: sin datos de jornadas (pretemporada) la tabla
 * es `null` y los consumidores deben anotarlo en `dataQuality`. Los goles
 * puntúan distinto por posición, así que la derivación se hace por posición.
 *
 * Claves conocidas del desglose (app oficial): goals, goal_assist,
 * mins_played, saves, effective_clearance, ball_recovery, won_contest,
 * pen_area_entries, goals_conceded, poss_lost_all, yellow_card, red_card,
 * marca_points.
 */

export interface ScoringTable {
  /** positionId -> stat -> puntos por unidad de valor. */
  byPosition: Record<number, Record<string, number>>;
  /** positionId -> stat -> número de muestras usadas. */
  samples: Record<number, Record<string, number>>;
  derivedAt: string;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Deriva la tabla de puntuación a partir de las jornadas de varios jugadores.
 * `statsByPlayer` es playerId -> playerStats junto a su positionId.
 * Devuelve null si no hay ninguna muestra (p. ej. pretemporada).
 */
export function deriveScoringTable(
  entries: { positionId: number; playerStats: PlayerWeekStat[] }[],
): ScoringTable | null {
  // positionId -> stat -> ratios puntos/valor observados
  const ratios = new Map<number, Map<string, number[]>>();

  for (const { positionId, playerStats } of entries) {
    for (const week of playerStats) {
      for (const [stat, tuple] of Object.entries(week.stats || {})) {
        const value = tuple?.[0] ?? 0;
        const points = tuple?.[1] ?? 0;
        if (value === 0) continue; // sin evento no hay ratio derivable
        let byStat = ratios.get(positionId);
        if (!byStat) ratios.set(positionId, (byStat = new Map()));
        let list = byStat.get(stat);
        if (!list) byStat.set(stat, (list = []));
        list.push(points / value);
      }
    }
  }

  if (ratios.size === 0) return null;

  const table: ScoringTable = { byPosition: {}, samples: {}, derivedAt: new Date().toISOString() };
  for (const [positionId, byStat] of ratios) {
    table.byPosition[positionId] = {};
    table.samples[positionId] = {};
    for (const [stat, list] of byStat) {
      table.byPosition[positionId][stat] = median(list);
      table.samples[positionId][stat] = list.length;
    }
  }
  return table;
}
