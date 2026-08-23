import { createStorage } from 'unstorage';
import upstashDriver from 'unstorage/drivers/upstash';
import { getEnvOptional } from './env';

/**
 * Almacén KV compartido (Upstash Redis) para los cachés de `player-stats` y
 * `calendar-cache`. Sustituye al caché en disco: en Vercel el filesystem del
 * despliegue es de solo lectura fuera de /tmp y no persiste entre invocaciones,
 * así que sin un store externo esos cachés no sobrevivirían entre requests.
 */
const storage = createStorage({
  driver: upstashDriver({
    url: getEnvOptional('UPSTASH_REDIS_REST_URL'),
    token: getEnvOptional('UPSTASH_REDIS_REST_TOKEN'),
  }),
});

export async function kvGet<T>(key: string): Promise<T | null> {
  try {
    return await storage.getItem<T>(key);
  } catch (error) {
    console.warn(`[kv-cache] getItem failed for "${key}":`, error instanceof Error ? error.message : error);
    return null;
  }
}

export async function kvSet<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  try {
    await storage.setItem(key, value, ttlSeconds ? { ttl: ttlSeconds } : undefined);
  } catch (error) {
    console.warn(`[kv-cache] setItem failed for "${key}":`, error instanceof Error ? error.message : error);
  }
}
