import type { PlayerMaster } from '../../../types/fantasy';
import { resolveTeamId } from '../model';

/**
 * Shrinkage jerárquico (§4.5 del diseño): partial pooling. La estimación de
 * cada jugador es una mezcla de su media observada y el prior de su grupo,
 * con peso proporcional a la evidencia:
 *
 *   est = (n · media_jugador + k · prior) / (n + k)
 *
 * con n = jornadas observadas y k ≈ 8 partidos (calibrable por backtesting).
 * Sustituye al "encogimiento por confianza" con baseline circular de
 * tactical-scheme (la media del propio pool de candidatos).
 *
 * Jerarquía de priors (pretemporada y pocas muestras):
 *   1. temporada pasada del jugador (si existe)
 *   2. media de posición × tier de su equipo (tiers 1-5 desde Elo)
 *   3. media de posición global del catálogo
 */

/** k de partial pooling en partidos (calibrable por backtesting walk-forward). */
export const SHRINKAGE_K = 8;

export function partialPool(observed: number, n: number, prior: number, k: number = SHRINKAGE_K): number {
  if (n <= 0) return prior;
  return (n * observed + k * prior) / (n + k);
}

/** Puntos por partido de referencia de un jugador del catálogo. */
function perGameOf(player: PlayerMaster): number {
  const averagePoints = Number(player.averagePoints) || 0;
  if (averagePoints > 0) return averagePoints;
  return (Number(player.lastSeasonPoints) || 0) / 38;
}

/** Tier de equipo 1 (top) a 5 desde los ratings Elo, por quintiles. */
export function buildTeamTiers(eloByTeamId: Map<number, number>): Map<number, number> {
  const sorted = [...eloByTeamId.entries()].sort((a, b) => b[1] - a[1]);
  const tiers = new Map<number, number>();
  const size = Math.max(sorted.length, 1);
  sorted.forEach(([teamId], index) => {
    tiers.set(teamId, Math.min(5, Math.floor((index * 5) / size) + 1));
  });
  return tiers;
}

export interface ShrinkagePriors {
  /** "positionId:tier" -> media de puntos por partido del grupo. */
  byPositionTier: Map<string, number>;
  /** teamId -> tier 1-5. */
  teamTiers: Map<number, number>;
}

/**
 * Medias de posición × tier de equipo sobre el catálogo completo (el baseline
 * correcto, no el pool de candidatos).
 */
export function buildShrinkagePriors(allPlayers: PlayerMaster[], teamTiers: Map<number, number>): ShrinkagePriors['byPositionTier'] {
  const sum = new Map<string, number>();
  const count = new Map<string, number>();

  for (const player of allPlayers) {
    const perGame = perGameOf(player);
    if (perGame <= 0) continue;
    const positionId = Number(player.positionId);
    const teamId = resolveTeamId(player);
    const tier = (teamId !== undefined ? teamTiers.get(teamId) : undefined) ?? 3;
    const key = `${positionId}:${tier}`;
    sum.set(key, (sum.get(key) || 0) + perGame);
    count.set(key, (count.get(key) || 0) + 1);
  }

  const byPositionTier = new Map<string, number>();
  for (const [key, total] of sum) {
    byPositionTier.set(key, total / Math.max(count.get(key) || 0, 1));
  }
  return byPositionTier;
}

/**
 * Prior de puntos por partido de un jugador siguiendo la jerarquía del
 * diseño: su temporada pasada → posición×tier de su equipo → posición global.
 */
export function priorForPlayer(
  player: PlayerMaster,
  priors: { byPositionTier: Map<string, number>; teamTiers?: Map<number, number>; positionAverages?: Map<number, number> },
): { prior: number; note: string } {
  const lastSeason = (Number(player.lastSeasonPoints) || 0) / 38;
  if (lastSeason > 0) {
    return { prior: lastSeason, note: 'prior: temporada pasada del jugador' };
  }

  const teamId = resolveTeamId(player);
  const tier = (teamId !== undefined ? priors.teamTiers?.get(teamId) : undefined) ?? 3;
  const byTier = priors.byPositionTier.get(`${player.positionId}:${tier}`);
  if (byTier !== undefined) {
    return { prior: byTier, note: `prior: media posición×tier (tier ${tier})` };
  }

  const global = priors.positionAverages?.get(player.positionId) ?? 0;
  return { prior: global, note: 'prior: media global de posición' };
}
