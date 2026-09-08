import { kvGet, kvSet } from '../../kv-cache';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ensureDataDir, readablePath, writablePath } from '../../runtime-paths';

/**
 * Caché HTTP para fuentes externas (§3.5 del diseño): pocas peticiones, TTL
 * por tipo de dato, User-Agent identificable, y fallo gracioso — si la fuente
 * cae se sirve el último dato en caché aunque esté caducado (`origin: stale`)
 * y el consumidor lo anota en `dataQuality`.
 */

const SOURCES_CACHE_REL = path.join('cache', 'sources');
const SOURCES_CACHE_DIR = writablePath(SOURCES_CACHE_REL);
const USER_AGENT = 'fantasy-manager/0.1 (analisis fantasy personal; scraping minimo con cache)';
const FETCH_TIMEOUT_MS = 15_000;

export interface CachedFetch {
  text: string;
  /** network = descargada ahora; cache = en plazo; stale = red caída, caché caducada. */
  origin: 'network' | 'cache' | 'stale';
  fetchedAt: number;
}

interface DiskEntry {
  fetchedAt: number;
  url: string;
  text: string;
}

const memCache = new Map<string, DiskEntry>();
const inFlight = new Map<string, Promise<CachedFetch | null>>();

function validEntry(value: unknown, url: string): value is DiskEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<DiskEntry>;
  return entry.url === url && typeof entry.text === 'string' &&
    typeof entry.fetchedAt === 'number' && Number.isFinite(entry.fetchedAt) &&
    entry.fetchedAt > 0 && entry.fetchedAt <= Date.now();
}

function cacheFile(key: string): string {
  return path.join(SOURCES_CACHE_DIR, `${key}.txt`);
}

async function readDisk(key: string): Promise<DiskEntry | null> {
  try {
    const file = await readablePath(SOURCES_CACHE_REL, `${key}.txt`);
    return JSON.parse(await readFile(file, 'utf8')) as DiskEntry;
  } catch {
    return null;
  }
}

async function writeDisk(key: string, entry: DiskEntry): Promise<void> {
  try {
    await ensureDataDir(SOURCES_CACHE_REL, { seed: false });
    await writeFile(cacheFile(key), JSON.stringify(entry));
  } catch (error) {
    console.warn('[sources] disk cache write failed:', error instanceof Error ? error.message : error);
  }
}

/**
 * Descarga `url` con caché de `ttlMs`. Devuelve null solo si no hay nada que
 * servir (sin red y sin caché). Nunca lanza.
 *
 * `fetcher` permite sustituir el cliente HTTP (p. ej. curl para fuentes con
 * Cloudflare que bloquean el fetch de Node, como Sofascore).
 */
export async function fetchTextWithCache(
  key: string,
  url: string,
  ttlMs: number,
  fetcher?: (url: string) => Promise<string>,
): Promise<CachedFetch | null> {
  const requestKey = JSON.stringify([key, url, ttlMs]);
  const pending = inFlight.get(requestKey);
  if (pending) return pending;
  const request = fetchCached(key, url, ttlMs, fetcher);
  inFlight.set(requestKey, request);
  try {
    return await request;
  } finally {
    inFlight.delete(requestKey);
  }
}

async function fetchCached(
  key: string,
  url: string,
  ttlMs: number,
  fetcher?: (url: string) => Promise<string>,
): Promise<CachedFetch | null> {
  const now = Date.now();
  const memoryKey = JSON.stringify([key, url]);
  const mem = memCache.get(memoryKey);
  if (mem && now - mem.fetchedAt < ttlMs) {
    return { text: mem.text, origin: 'cache', fetchedAt: mem.fetchedAt };
  }

  const [disk, shared] = await Promise.all([readDisk(key), kvGet<unknown>(`sources:${key}`)]);
  const cached = [mem, disk, shared].filter((entry): entry is DiskEntry => validEntry(entry, url))
    .sort((a, b) => b.fetchedAt - a.fetchedAt)[0];
  if (cached && now - cached.fetchedAt < ttlMs) {
    memCache.set(memoryKey, cached);
    return { text: cached.text, origin: 'cache', fetchedAt: cached.fetchedAt };
  }

  try {
    let text: string;
    if (fetcher) {
      text = await fetcher(url);
    } else {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html, text/csv, application/json' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      text = await res.text();
    }
    const entry: DiskEntry = { fetchedAt: Date.now(), url, text };
    memCache.set(memoryKey, entry);
    // Retener más que el TTL de frescura permite el fallback stale compartido.
    await Promise.all([
      writeDisk(key, entry),
      kvSet(`sources:${key}`, entry, Math.ceil(Math.max(ttlMs * 4, 7 * 24 * 60 * 60 * 1000) / 1000)),
    ]);
    return { text, origin: 'network', fetchedAt: entry.fetchedAt };
  } catch (error) {
    console.warn(`[sources] fetch failed for ${key}:`, error instanceof Error ? error.message : error);
    if (cached) {
      return { text: cached.text, origin: 'stale', fetchedAt: cached.fetchedAt };
    }
    return null;
  }
}
