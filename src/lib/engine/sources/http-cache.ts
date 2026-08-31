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

const memCache = new Map<string, { expiresAt: number; entry: DiskEntry }>();

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
  const now = Date.now();

  const mem = memCache.get(key);
  if (mem && mem.expiresAt > now) {
    return { text: mem.entry.text, origin: 'cache', fetchedAt: mem.entry.fetchedAt };
  }

  const disk = await readDisk(key);
  if (disk && now - disk.fetchedAt < ttlMs) {
    memCache.set(key, { expiresAt: disk.fetchedAt + ttlMs, entry: disk });
    return { text: disk.text, origin: 'cache', fetchedAt: disk.fetchedAt };
  }

  try {
    let text: string;
    if (fetcher) {
      text = await fetcher(url);
    } else {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html, text/csv, application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      text = await res.text();
    }
    const entry: DiskEntry = { fetchedAt: now, url, text };
    memCache.set(key, { expiresAt: now + ttlMs, entry });
    await writeDisk(key, entry);
    return { text, origin: 'network', fetchedAt: now };
  } catch (error) {
    console.warn(`[sources] fetch failed for ${key}:`, error instanceof Error ? error.message : error);
    if (disk) {
      return { text: disk.text, origin: 'stale', fetchedAt: disk.fetchedAt };
    }
    return null;
  }
}
