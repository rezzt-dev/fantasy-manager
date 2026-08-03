import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { PlayerMaster } from '../../types/fantasy';

/**
 * Caché compartida de `playerStats` (puntos y desglose por acción de cada
 * jugador por jornada), la fuente de verdad para forma reciente, titularidad,
 * tabla de puntuación y liquidación del track record.
 *
 * La API oficial solo expone estos datos en el detalle por jugador
 * ({CMP}/player/{playerId}/league/{leagueId}), así que cada consulta cuesta
 * una petición. Se cachea en memoria (vida del proceso) y en disco
 * (data/cache/player-stats, 12 h) para no repetir peticiones entre requests.
 * El disco también preserva el histórico de jornadas entre reinicios.
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
const CACHE_DIR = path.join(process.cwd(), 'data', 'cache', 'player-stats');
const CONCURRENCY = 5;

const memCache = new Map<string, { expiresAt: number; stats: PlayerWeekStat[] }>();
/** Si el FS no es escribible, se desactiva el disco y se sigue solo con memoria. */
let diskDisabled = false;

interface DiskEntry {
  fetchedAt: number;
  stats: PlayerWeekStat[];
}

async function readDiskCache(playerId: string): Promise<PlayerWeekStat[] | null> {
  if (diskDisabled) return null;
  try {
    const raw = await readFile(path.join(CACHE_DIR, `${playerId}.json`), 'utf8');
    const entry = JSON.parse(raw) as DiskEntry;
    if (!Array.isArray(entry.stats)) return null;
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
    return entry.stats;
  } catch {
    return null;
  }
}

async function writeDiskCache(playerId: string, stats: PlayerWeekStat[]): Promise<void> {
  if (diskDisabled) return;
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const entry: DiskEntry = { fetchedAt: Date.now(), stats };
    await writeFile(path.join(CACHE_DIR, `${playerId}.json`), JSON.stringify(entry));
  } catch (error) {
    diskDisabled = true;
    console.warn('[player-stats] disk cache disabled:', error instanceof Error ? error.message : error);
  }
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

  // Segunda oportunidad: caché de disco antes de ir a la API.
  const stillPending: { id: string }[] = [];
  for (const player of pending) {
    const stats = await readDiskCache(player.id);
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
      await writeDiskCache(player.id, stats);
    },
    CONCURRENCY,
  );

  return result;
}
