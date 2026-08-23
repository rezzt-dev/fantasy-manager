import { kvGet, kvSet } from '../kv-cache';
import type { PlayerMaster } from '../../types/fantasy';

/**
 * Caché compartida de `playerStats` (puntos y desglose por acción de cada
 * jugador por jornada), la fuente de verdad para forma reciente, titularidad,
 * tabla de puntuación y liquidación del track record.
 *
 * La API oficial solo expone estos datos en el detalle por jugador
 * ({CMP}/player/{playerId}/league/{leagueId}), así que cada consulta cuesta
 * una petición. Se cachea en memoria (vida del proceso) y en KV (Upstash
 * Redis, 12 h) para no repetir peticiones entre requests/invocaciones
 * serverless. El KV también preserva el histórico de jornadas entre despliegues.
 */

export interface PlayerWeekStat {
  weekNumber: number;
  totalPoints?: number;
  isInIdealFormation?: boolean;
  /** Cada stat es una tupla [valor, puntos] (p. ej. goals: [1, 4]). */
  stats?: Record<string, [number, number] | undefined>;
}

export interface PlayerDetail {
  playerMaster?: PlayerMaster & { playerStats?: PlayerWeekStat[] };
}

export type FetchPlayerDetail = (playerId: string) => Promise<PlayerDetail>;

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas
const CACHE_TTL_S = CACHE_TTL_MS / 1000;
const KV_PREFIX = 'player-stats';
const CONCURRENCY = 5;

const memCache = new Map<string, { expiresAt: number; stats: PlayerWeekStat[] }>();

interface KvEntry {
  fetchedAt: number;
  stats: PlayerWeekStat[];
}

async function readKvCache(playerId: string): Promise<PlayerWeekStat[] | null> {
  const entry = await kvGet<KvEntry>(`${KV_PREFIX}:${playerId}`);
  if (!entry || !Array.isArray(entry.stats)) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
  return entry.stats;
}

async function writeKvCache(playerId: string, stats: PlayerWeekStat[]): Promise<void> {
  const entry: KvEntry = { fetchedAt: Date.now(), stats };
  await kvSet(`${KV_PREFIX}:${playerId}`, entry, CACHE_TTL_S);
}

async function withConcurrency<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

/**
 * Resuelve los `playerStats` de una lista de jugadores usando caché de 12 h
 * (memoria + disco) y consultando a la API solo los que falten o estén
 * caducados. Si el detalle de un jugador falla, se devuelve lista vacía para
 * ese jugador (el llamador decide el fallback y lo anota en dataQuality).
 */
export async function fetchPlayerStats(
  players: { id: string }[],
  fetchPlayerDetail: FetchPlayerDetail,
): Promise<Record<string, PlayerWeekStat[]>> {
  const now = Date.now();
  const result: Record<string, PlayerWeekStat[]> = {};
  const pending: { id: string }[] = [];

  for (const player of players) {
    const cached = memCache.get(player.id);
    if (cached && cached.expiresAt > now) {
      result[player.id] = cached.stats;
    } else {
      pending.push(player);
    }
  }

  // Segunda oportunidad: caché KV antes de ir a la API.
  const stillPending: { id: string }[] = [];
  for (const player of pending) {
    const stats = await readKvCache(player.id);
    if (stats !== null) {
      memCache.set(player.id, { expiresAt: now + CACHE_TTL_MS, stats });
      result[player.id] = stats;
    } else {
      stillPending.push(player);
    }
  }

  await withConcurrency(
    stillPending,
    async (player) => {
      let stats: PlayerWeekStat[] = [];
      try {
        const detail = await fetchPlayerDetail(player.id);
        stats = detail?.playerMaster?.playerStats || [];
      } catch (error) {
        console.warn(`[player-stats] detail failed for player ${player.id}:`, error instanceof Error ? error.message : error);
      }
      memCache.set(player.id, { expiresAt: now + CACHE_TTL_MS, stats });
      result[player.id] = stats;
      await writeKvCache(player.id, stats);
    },
    CONCURRENCY,
  );

  return result;
}
