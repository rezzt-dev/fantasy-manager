import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Helpers para leer y escribir ficheros JSONL de forma robusta.
 *
 * - Lectura tolerante a corrupción parcial: se loguea cada línea inválida y se
 *   conservan el resto, en lugar de descartar todo el fichero.
 * - Escritura atómica: se escribe a un fichero temporal y se renombra, de
 *   modo que una caída a mitad de escritura no deja el destino truncado.
 */

export interface ReadJsonlOptions {
  /** Si es true (por defecto), se loguean líneas corruptas por consola. */
  logCorruption?: boolean;
}

export async function readJsonl<T>(file: string, opts: ReadJsonlOptions = {}): Promise<T[]> {
  const logCorruption = opts.logCorruption !== false;

  try {
    const raw = await readFile(file, 'utf8');
    const lines = raw.split('\n').filter((line) => line.trim().length > 0);
    const records: T[] = [];

    for (let i = 0; i < lines.length; i++) {
      try {
        records.push(JSON.parse(lines[i]) as T);
      } catch (parseErr) {
        if (logCorruption) {
          console.warn(
            `[jsonl] Línea corrupta ${i + 1} en ${file}: ${
              parseErr instanceof Error ? parseErr.message : String(parseErr)
            }`,
          );
        }
        // Continuamos leyendo líneas válidas en lugar de perder todo el fichero.
      }
    }

    return records;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      console.warn(`[jsonl] No se pudo leer ${file}: ${(err as Error).message}`);
    }
    return [];
  }
}

async function writeFileAtomicInternal(file: string, body: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });

  const suffix = `.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 9)}`;
  const tmpFile = `${file}${suffix}`;

  try {
    await writeFile(tmpFile, body);
    await rename(tmpFile, file);
  } catch (err) {
    // Intentamos dejar el fichero temporal para diagnóstico, pero lo relanzamos.
    console.error(`[jsonl] Escritura atómica fallida para ${file}: ${(err as Error).message}`);
    throw err;
  }
}

export async function writeJsonlAtomic<T>(file: string, records: T[]): Promise<void> {
  const body = records.map((r) => JSON.stringify(r)).join('\n') + (records.length > 0 ? '\n' : '');
  await writeFileAtomicInternal(file, body);
}

export async function writeFileAtomic(file: string, body: string): Promise<void> {
  await writeFileAtomicInternal(file, body);
}
