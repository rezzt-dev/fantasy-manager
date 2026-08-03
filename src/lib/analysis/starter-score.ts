import type { PlayerMaster } from '../../types/fantasy';
import type { StarterInfo } from '../../types/analysis';

import type { PlayerWeekStat } from '../engine/player-stats';

function labelForScore(score: number): StarterInfo['label'] {
  if (score >= 0.8) return 'Titular';
  if (score >= 0.55) return 'Habitual';
  if (score >= 0.35) return 'Rotación';
  return 'Suplente';
}

/**
 * Score 0-1 a partir de minutos jugados por jornada.
 *
 * La media de minutos se calcula sobre TODAS las jornadas con dato, incluidas
 * las de 0 minutos: un único partido de 90' entre varias jornadas sin jugar no
 * debe puntuar como titular habitual (bug corregido, §2.3 del diseño).
 */
export function starterScoreFromMinutes(playerStats: PlayerWeekStat[]): number | null {
  if (playerStats.length === 0) return null;

  const minutesOf = (s: PlayerWeekStat) => s.stats?.mins_played?.[0] ?? 0;
  const weeksPlayed = playerStats.filter((s) => minutesOf(s) > 0).length;
  if (weeksPlayed === 0) return null;

  const avgMinutes = playerStats.reduce((sum, s) => sum + minutesOf(s), 0) / playerStats.length;
  const minutesRatio = Math.min(1, avgMinutes / 90);
  // Jugar muchas jornadas pesa tanto como jugar muchos minutos.
  const weeksRatio = weeksPlayed / playerStats.length;

  return Math.round(minutesRatio * (0.5 + 0.5 * weeksRatio) * 100) / 100;
}

/** Proxy por puntos por partido de la temporada pasada. */
export function starterScoreFromLastSeason(lastSeasonPoints: number): number {
  const perGame = (Number(lastSeasonPoints) || 0) / 38;
  if (perGame >= 4) return 0.9;
  if (perGame >= 2.5) return 0.65;
  if (perGame >= 1.2) return 0.4;
  return 0.2;
}

export function starterInfoFromPlayer(player: PlayerMaster): StarterInfo {
  const score = starterScoreFromLastSeason(player.lastSeasonPoints);
  return { playerId: player.id, score, label: labelForScore(score), source: 'last-season' };
}

export function starterInfoFromMinutes(playerId: string, playerStats: PlayerWeekStat[]): StarterInfo | null {
  const score = starterScoreFromMinutes(playerStats);
  if (score === null) return null;
  return { playerId, score, label: labelForScore(score), source: 'minutes' };
}
