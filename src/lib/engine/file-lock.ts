/**
 * Mutex en memoria por clave (p. ej. ruta de fichero): serializa las
 * secciones leer-modificar-escribir de la persistencia JSONL para que dos
 * peticiones concurrentes (misma jornada, distinta liga o pestaña) no lean
 * el mismo estado "antes" y pisen la escritura de la otra.
 *
 * El número de claves reales (un fichero por jornada/recurso) es pequeño y
 * acotado a lo largo de una temporada, así que no hace falta limpiar el mapa.
 */

const tail = new Map<string, Promise<void>>();

export async function withFileLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = tail.get(key) ?? Promise.resolve();
  const done = previous.then(fn, fn);
  tail.set(
    key,
    done.then(
      () => undefined,
      () => undefined,
    ),
  );
  return done;
}
