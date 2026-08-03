import type { TeamPlayer } from '../types/fantasy';

export type ClauseProtectionStatus = 'available' | 'locked' | 'shielded';

export interface ClauseProtection {
  status: ClauseProtectionStatus;
  /** Fecha ISO hasta la que la cláusula está bloqueada (si aplica). */
  until?: string;
}

/** Campos mínimos para evaluar la protección (sirve para plantilla propia y rivales). */
export type ClauseProtectable = Pick<TeamPlayer, 'buyoutClauseLockedEndTime' | 'isShielded'>;

/**
 * Disponibilidad de un jugador para ser clausulado.
 *
 * - `shielded`: el propietario lo ha blindado; no se puede clausular.
 * - `locked`: la cláusula está bloqueada hasta `until`. Cubre tanto la
 *   subida de cláusula reciente como las 2 semanas de protección tras un
 *   clausulazo; en ambos casos el jugador no se puede clausular.
 * - `available`: se puede pagar la cláusula ahora mismo.
 */
export function getClauseProtection(
  player: ClauseProtectable,
  now: number = Date.now(),
): ClauseProtection {
  if (player.isShielded) return { status: 'shielded' };

  if (player.buyoutClauseLockedEndTime) {
    const lockEnd = Date.parse(player.buyoutClauseLockedEndTime);
    if (!Number.isNaN(lockEnd) && lockEnd > now) {
      return { status: 'locked', until: player.buyoutClauseLockedEndTime };
    }
  }

  return { status: 'available' };
}
