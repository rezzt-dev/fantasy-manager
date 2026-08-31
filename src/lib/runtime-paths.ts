import { access, cp, mkdir } from 'node:fs/promises';
import path from 'node:path';

/**
 * Rutas de datos que funcionan igual en local y en un despliegue serverless.
 *
 * En Vercel el filesystem de la función es de SOLO LECTURA salvo /tmp, así que
 * cualquier `mkdir`/`writeFile` bajo `data/` revienta con EROFS. Pero `data/`
 * sí viaja en el bundle y se puede leer: es la semilla del track record, de las
 * predicciones y de la caché de fuentes.
 *
 * De ahí la separación en dos raíces:
 *
 *  - `BUNDLED_DATA_DIR`: lo que viene en el despliegue. Solo lectura.
 *  - `WRITABLE_DATA_DIR`: donde se puede escribir (/tmp en serverless, el
 *    propio `data/` en local, donde ambas raíces son la misma ruta).
 *
 * Para un subdirectorio que se lee Y se escribe (track record, predicciones)
 * hace falta que las dos vistas sean una sola: `ensureDataDir()` copia la
 * semilla del bundle a la raíz escribible una vez por proceso, y a partir de
 * ahí todo el módulo trabaja contra una única ruta, con el mismo código que en
 * local. Para los que solo se leen basta `readablePath()`.
 *
 * Aviso sobre /tmp en serverless: es por instancia y efímero. Lo que se escriba
 * ahí sobrevive entre requests de la misma instancia, pero no entre
 * despliegues ni entre instancias. Lo que tenga que persistir de verdad va a
 * Upstash (ver `kv-cache.ts`); esto solo evita que la app se caiga y conserva
 * el trabajo dentro de una instancia caliente.
 */

export const IS_SERVERLESS = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY,
);

/** `data/` tal y como viaja en el despliegue. En serverless, solo lectura. */
export const BUNDLED_DATA_DIR = path.join(process.cwd(), 'data');

/** Raíz con permiso de escritura. En local coincide con `BUNDLED_DATA_DIR`. */
export const WRITABLE_DATA_DIR = IS_SERVERLESS
  ? path.join('/tmp', 'fantasy-manager', 'data')
  : BUNDLED_DATA_DIR;

/** Raíz escribible para cachés que no son datos del proyecto (respaldo del KV). */
export const WRITABLE_CACHE_DIR = IS_SERVERLESS
  ? path.join('/tmp', 'fantasy-manager', 'cache')
  : path.join(process.cwd(), '.cache');

/** Ruta bajo la raíz escribible. Síncrona: el directorio puede no existir aún. */
export function writablePath(...segments: string[]): string {
  return path.join(WRITABLE_DATA_DIR, ...segments);
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ruta para LEER un fichero suelto: la copia escribible si ya existe, y si no
 * la que vino en el bundle. En local siempre es la misma ruta.
 */
export async function readablePath(...segments: string[]): Promise<string> {
  const writable = writablePath(...segments);
  if (!IS_SERVERLESS) return writable;
  if (await exists(writable)) return writable;
  return path.join(BUNDLED_DATA_DIR, ...segments);
}

const prepared = new Map<string, Promise<string>>();

export interface EnsureDataDirOptions {
  /**
   * Copiar la semilla del bundle antes de usar el directorio. Solo hace falta
   * cuando el mismo subdirectorio se lee y se escribe con `readdir` o con
   * ciclos leer-modificar-escribir (track record, predicciones). Para cachés
   * regenerables se deja en false: copiar megas a /tmp en cada arranque en
   * frío cuesta más de lo que ahorra.
   */
  seed?: boolean;
}

/**
 * Prepara un subdirectorio de `data/` para leer y escribir, y devuelve su ruta
 * efectiva. La semilla del bundle se copia una sola vez por proceso (los
 * ficheros ya escritos en esta instancia nunca se pisan).
 */
export function ensureDataDir(relativeDir: string, options: EnsureDataDirOptions = {}): Promise<string> {
  const seed = options.seed !== false;
  const cacheKey = `${relativeDir}::${seed}`;
  let pending = prepared.get(cacheKey);
  if (!pending) {
    pending = prepareDataDir(relativeDir, seed);
    prepared.set(cacheKey, pending);
  }
  return pending;
}

async function prepareDataDir(relativeDir: string, seedFromBundle: boolean): Promise<string> {
  const target = writablePath(relativeDir);
  await mkdir(target, { recursive: true });

  if (!IS_SERVERLESS || !seedFromBundle) return target;

  const seed = path.join(BUNDLED_DATA_DIR, relativeDir);
  try {
    if (await exists(seed)) {
      await cp(seed, target, { recursive: true, force: false, errorOnExist: false });
    }
  } catch (error) {
    // Sin semilla se arranca en vacío: peor histórico, pero nada se cae.
    console.warn(
      `[data] no se pudo sembrar ${relativeDir} en la raíz escribible:`,
      error instanceof Error ? error.message : error,
    );
  }
  return target;
}
