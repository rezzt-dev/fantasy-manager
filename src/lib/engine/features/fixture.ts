/**
 * Dificultad del fixture desde ratings Elo reales (ClubElo), sustituyendo al
 * proxy de "valor de mercado agregado" del motor anterior (efecto máximo ±8%,
 * claramente insuficiente según §2.1.6 del diseño).
 *
 * v1: multiplicador continuo a partir de la diferencia de Elo con ventaja de
 * campo dentro del propio factor (nunca duplicada). La tabla posición × tier
 * × localía del diseño se estimará sobre el histórico acumulado del track
 * record cuando haya datos; hasta entonces esta fórmula es el factor único.
 * El divisor es calibrable por backtesting (Fase 3, data/engine-params.json).
 */

import { getEngineParams } from '../params';

/** Ventaja de campo en puntos Elo (estándar ClubElo en ligas europeas). */
const HOME_ELO_ADVANTAGE = 65;
/** Rango del multiplicador de fixture. */
const MIN_MULTIPLIER = 0.85;
const MAX_MULTIPLIER = 1.15;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Multiplicador de puntos esperados por fixture: >1 si el rival es más débil
 * o se juega en casa, <1 si es más fuerte o fuera. Equipos iguales: ~1.065 en
 * casa, ~0.935 fuera.
 */
export function fixtureMultiplierFromElo(eloOwn: number, eloOpponent: number, isHome: boolean, divisor?: number): number {
  const eloDiffDivisor = divisor ?? getEngineParams().eloDiffDivisor;
  const diff = isHome ? eloOwn + HOME_ELO_ADVANTAGE - eloOpponent : eloOwn - (eloOpponent + HOME_ELO_ADVANTAGE);
  return clamp(1 + diff / eloDiffDivisor, MIN_MULTIPLIER, MAX_MULTIPLIER);
}
