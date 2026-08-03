import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Match } from '../../types/fantasy';
import { fetchOfficialAPI, CMP } from './api-proxy';

/**
 * Caché en disco de calendarios por jornada (data/cache/calendar/w{N}.json).
 * Las jornadas pasadas son inmutables (TTL infinito); la actual caduca en 6 h.
 * La usa el backtesting walk-forward (calibración, Fase 3) para no repetir
 * peticiones a la API oficial.
 */

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache', 'calendar');
const CURRENT_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

async function readCache(week: number, currentWeek: number): Promise<Match[] | null> {
  try {
    const raw = JSON.parse(await readFile(path.join(CACHE_DIR, `w${week}.json`), 'utf8')) as { fetchedAt: number; matches: Match[] };
    if (!Array.isArray(raw.matches)) return null;
    if (week === currentWeek && Date.now() - raw.fetchedAt > CURRENT_TTL_MS) return null;
    return raw.matches;
  } catch {
    return null;
  }
}

export async function fetchCalendarCached(week: number, currentWeek: number, token: string): Promise<Match[]> {
  const cached = await readCache(week, currentWeek);
  if (cached) return cached;
  try {
    const matches = await fetchOfficialAPI<Match[]>(`${CMP}/calendar`, token, { weekNumber: String(week) });
    if (Array.isArray(matches) && matches.length > 0) {
      await mkdir(CACHE_DIR, { recursive: true });
      await writeFile(path.join(CACHE_DIR, `w${week}.json`), JSON.stringify({ fetchedAt: Date.now(), matches }));
      return matches;
    }
  } catch (error) {
    console.warn(`[calendar-cache] week ${week} fetch failed:`, error instanceof Error ? error.message : error);
  }
  return [];
}
