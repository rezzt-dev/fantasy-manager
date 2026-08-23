import { kvGet, kvSet } from '../kv-cache';
import type { Match } from '../../types/fantasy';
import { fetchOfficialAPI, CMP } from './api-proxy';

/**
 * Caché KV (Upstash Redis) de calendarios por jornada (`calendar:w{N}`).
 * Las jornadas pasadas son inmutables (TTL infinito); la actual caduca en 6 h.
 * La usa el backtesting walk-forward (calibración, Fase 3) para no repetir
 * peticiones a la API oficial.
 */

const KV_PREFIX = 'calendar';
const CURRENT_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

interface KvEntry {
  fetchedAt: number;
  matches: Match[];
}

async function readCache(week: number, currentWeek: number): Promise<Match[] | null> {
  const entry = await kvGet<KvEntry>(`${KV_PREFIX}:w${week}`);
  if (!entry || !Array.isArray(entry.matches)) return null;
  if (week === currentWeek && Date.now() - entry.fetchedAt > CURRENT_TTL_MS) return null;
  return entry.matches;
}

export async function fetchCalendarCached(week: number, currentWeek: number, token: string): Promise<Match[]> {
  const cached = await readCache(week, currentWeek);
  if (cached) return cached;
  let matches: Match[];
  try {
    matches = await fetchOfficialAPI<Match[]>(`${CMP}/calendar`, token, { weekNumber: String(week) });
  } catch (error) {
    console.warn(`[calendar-cache] week ${week} fetch failed:`, error instanceof Error ? error.message : error);
    return [];
  }
  if (Array.isArray(matches) && matches.length > 0) {
    // La escritura en caché es best-effort: si falla, igual devolvemos los datos ya obtenidos.
    await kvSet(`${KV_PREFIX}:w${week}`, { fetchedAt: Date.now(), matches } satisfies KvEntry, week === currentWeek ? CURRENT_TTL_MS / 1000 : undefined);
    return matches;
  }
  return [];
}
