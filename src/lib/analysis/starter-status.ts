import type { PlayerMaster } from '../../types/fantasy';
import type { StarterInfo } from '../../types/analysis';
import { fetchPlayerStats, type FetchPlayerDetail } from '../engine/player-stats';
import { starterInfoFromMinutes, starterInfoFromPlayer } from './starter-score';

export type { PlayerDetail, PlayerWeekStat } from '../engine/player-stats';

/**
 * Titularidad habitual de un jugador en su equipo real.
 *
 * Fuentes:
 * - `minutes`: stats por jornada del detalle de jugador
 *   ({CMP}/player/{playerId}/league/{leagueId}) con `stats.mins_played[0]`.
 *   Solo disponible cuando la temporada ya ha empezado.
 * - `last-season`: proxy con los puntos de la temporada pasada
 *   (`lastSeasonPoints / 38`), usado en pretemporada o si el detalle falla.
 */

/**
 * Resuelve la titularidad de una lista de jugadores (típicamente la plantilla
 * propia). Usa la caché compartida de playerStats (12 h, memoria + disco); si
 * no hay minutos todavía (pretemporada), usa el proxy de la temporada pasada.
 */
export async function fetchStarterInfo(
  players: PlayerMaster[],
  fetchPlayerDetail: FetchPlayerDetail,
): Promise<Record<string, StarterInfo>> {
  const statsByPlayer = await fetchPlayerStats(players, fetchPlayerDetail);
  const result: Record<string, StarterInfo> = {};

  for (const player of players) {
    const stats = statsByPlayer[player.id] || [];
    const minutesInfo = starterInfoFromMinutes(player.id, stats);
    result[player.id] = minutesInfo || starterInfoFromPlayer(player);
  }

  return result;
}
