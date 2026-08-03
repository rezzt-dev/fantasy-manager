import type { PlayerMaster, Match } from '../../types/fantasy';
import { predictPlayerPoints, type PlayerPrediction, type PredictionContext } from '../engine/model';

/**
 * Contexto opcional del estimador: cuanto más completo, más fina la estimación.
 * Todas las fuentes son opcionales para no romper llamadas simples.
 */
export type EstimatorContext = PredictionContext;

const POSITION_WEIGHT: Record<number, number> = {
  1: 1, // Portero
  2: 0.9, // Defensa
  3: 1.1, // Centrocampista
  4: 1.2, // Delantero
  5: 1, // Entrenador
};

/**
 * Estima los puntos de un jugador para la próxima jornada con el modelo por
 * componentes (`src/lib/engine/model.ts`): forma reciente con decaimiento
 * desde `playerStats` cuando existe, con fallback a media de temporada,
 * temporada pasada o media del catálogo por posición.
 */
export function estimatePoints(player: PlayerMaster, matches: Match[], context?: EstimatorContext): number {
  return predictPlayerPoints(player, matches, context).xp;
}

/** Igual que estimatePoints pero devolviendo fuente, minutos y dataQuality. */
export function estimatePointsDetailed(
  player: PlayerMaster,
  matches: Match[],
  context?: EstimatorContext,
): PlayerPrediction {
  return predictPlayerPoints(player, matches, context);
}

/**
 * Estimador ANTERIOR al motor por componentes, conservado tal cual como
 * baseline del track record (§6.2: "media simple de puntos ≈ el motor
 * actual"). No usar en lógica de negocio nueva.
 *
 * Defectos conocidos (§2.3 del diseño): asume 38 partidos la temporada pasada,
 * pondera la posición sobre medias que ya la reflejan, no detecta jornadas de
 * descanso y da base plana de 2 puntos a jugadores sin datos.
 */
export function estimatePointsLegacy(player: PlayerMaster, matches: Match[], context?: EstimatorContext): number {
  const teamId = player.teamId;
  const homeMatch = matches.find((m) => m.localId === teamId);
  const awayMatch = matches.find((m) => m.visitorId === teamId);

  const perGameLastSeason = (Number(player.lastSeasonPoints) || 0) / 38;
  const perGameCurrent = Number(player.averagePoints) || 0;
  let base = perGameCurrent > 0 ? perGameCurrent * 0.65 + perGameLastSeason * 0.35 : perGameLastSeason;

  base *= POSITION_WEIGHT[player.positionId] || 1;
  if (!Number.isFinite(base) || base <= 0) base = 2;

  if (homeMatch) base *= 1.05;
  if (awayMatch) base *= 0.98;

  const opponentId = homeMatch ? homeMatch.visitorId : awayMatch ? awayMatch.localId : undefined;
  if (opponentId !== undefined && context?.teamStrength) {
    base *= context.teamStrength.get(opponentId) ?? 1;
  }

  if (player.playerStatus !== 'ok') base *= 0.3;

  const starterScore = context?.starterInfo?.[player.id]?.score;
  if (starterScore !== undefined) base *= 0.9 + 0.1 * starterScore;

  return base;
}

/**
 * Fuerza de cada equipo real de LaLiga a partir del valor de mercado agregado
 * de sus jugadores del catálogo, normalizada a un multiplicador de dificultad
 * (rival fuerte < 1, rival débil > 1).
 */
export function buildTeamStrength(allPlayers: PlayerMaster[]): Map<number, number> {
  const totalByTeam = new Map<number, number>();
  for (const p of allPlayers) {
    // El catálogo devuelve teamId como string; se normaliza a número.
    const teamId = Number(p.teamId);
    if (!Number.isFinite(teamId) || teamId <= 0) continue;
    totalByTeam.set(teamId, (totalByTeam.get(teamId) || 0) + (Number(p.marketValue) || 0));
  }

  const totals = [...totalByTeam.values()];
  const avg = totals.reduce((sum, v) => sum + v, 0) / Math.max(totals.length, 1);

  const strength = new Map<number, number>();
  for (const [teamId, total] of totalByTeam) {
    const ratio = total / Math.max(avg, 1); // 1 = equipo medio
    strength.set(teamId, clamp(1 - (ratio - 1) * 0.16, 0.92, 1.08));
  }
  return strength;
}

/**
 * Media de puntos por partido del catálogo por posición. Último fallback del
 * estimador para jugadores sin ningún histórico (sustituye a la base plana de
 * 2 puntos del motor anterior).
 */
export function buildPositionAverages(allPlayers: PlayerMaster[]): Map<number, number> {
  const sum = new Map<number, number>();
  const count = new Map<number, number>();
  for (const p of allPlayers) {
    const perGame = (Number(p.averagePoints) || 0) > 0 ? Number(p.averagePoints) : (Number(p.lastSeasonPoints) || 0) / 38;
    // El catálogo devuelve positionId como string; se normaliza a número.
    const positionId = Number(p.positionId);
    if (perGame <= 0 || !Number.isFinite(positionId) || positionId <= 0) continue;
    sum.set(positionId, (sum.get(positionId) || 0) + perGame);
    count.set(positionId, (count.get(positionId) || 0) + 1);
  }
  const averages = new Map<number, number>();
  for (const [positionId, total] of sum) {
    averages.set(positionId, total / Math.max(count.get(positionId) || 0, 1));
  }
  return averages;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
