import { createStorage, type StorageValue } from 'unstorage';
import upstashDriver from 'unstorage/drivers/upstash';
import fsLiteDriver from 'unstorage/drivers/fs-lite';
import { getEnvOptional } from './env';

/**
 * Almacén KV compartido para los cachés de `player-stats` y `calendar-cache`.
 *
 * En producción es Upstash Redis: en Vercel el filesystem del despliegue es de
 * solo lectura fuera de /tmp y no persiste entre invocaciones, así que sin un
 * store externo esos cachés no sobrevivirían entre requests.
 *
 * Sin credenciales (desarrollo local) se cae a disco. El driver de Upstash sin
 * url/token no falla al construirse: falla en cada comando haciendo fetch a una
 * URL relativa ("/pipeline"), así que se perdía la caché entera y cada request
 * repetía todas las peticiones a la API oficial.
 *
 * El TTL lo comprueban los consumidores con su propio `fetchedAt`, así que no
 * depende de que el driver soporte expiración.
 */
const upstashUrl = getEnvOptional('UPSTASH_REDIS_REST_URL');
const upstashToken = getEnvOptional('UPSTASH_REDIS_REST_TOKEN');

const storage = createStorage({
  driver:
    upstashUrl && upstashToken
      ? upstashDriver({ url: upstashUrl, token: upstashToken })
      : fsLiteDriver({ base: '.cache/kv' }),
});

/**
 * Los cachés recorren cientos de claves por request: si el store cae, un warn
 * por clave sepulta el log. Se avisa una vez por operación y proceso.
 */
const warnedOperations = new Set<string>();

function warnOnce(operation: string, key: string, error: unknown): void {
  if (warnedOperations.has(operation)) return;
  warnedOperations.add(operation);
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[kv-cache] ${operation} falló en "${key}": ${message}. Se omiten los siguientes avisos.`);
}

export async function kvGet<T>(key: string): Promise<T | null> {
  try {
    return await storage.getItem<T>(key);
  } catch (error) {
    warnOnce('getItem', key, error);
    return null;
  }
}

export async function kvSet<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  try {
    await storage.setItem(key, value as StorageValue, ttlSeconds ? { ttl: ttlSeconds } : undefined);
  } catch (error) {
    warnOnce('setItem', key, error);
  }
}
