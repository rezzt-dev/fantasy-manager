import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import nodePath from "node:path";
//#region src/lib/engine/file-lock.ts
/**
* Mutex en memoria por clave (p. ej. ruta de fichero): serializa las
* secciones leer-modificar-escribir de la persistencia JSONL para que dos
* peticiones concurrentes (misma jornada, distinta liga o pestaña) no lean
* el mismo estado "antes" y pisen la escritura de la otra.
*
* El número de claves reales (un fichero por jornada/recurso) es pequeño y
* acotado a lo largo de una temporada, así que no hace falta limpiar el mapa.
*/
var tail = /* @__PURE__ */ new Map();
async function withFileLock(key, fn) {
	const done = (tail.get(key) ?? Promise.resolve()).then(fn, fn);
	tail.set(key, done.then(() => void 0, () => void 0));
	return done;
}
//#endregion
//#region src/lib/engine/jsonl.ts
async function readJsonl(file, opts = {}) {
	const logCorruption = opts.logCorruption !== false;
	try {
		const lines = (await readFile(file, "utf8")).split("\n").filter((line) => line.trim().length > 0);
		const records = [];
		for (let i = 0; i < lines.length; i++) try {
			records.push(JSON.parse(lines[i]));
		} catch (parseErr) {
			if (logCorruption) console.warn(`[jsonl] Línea corrupta ${i + 1} en ${file}: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
		}
		return records;
	} catch (err) {
		if (err.code !== "ENOENT") console.warn(`[jsonl] No se pudo leer ${file}: ${err.message}`);
		return [];
	}
}
async function writeFileAtomicInternal(file, body) {
	await mkdir(nodePath.dirname(file), { recursive: true });
	const tmpFile = `${file}${`.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 9)}`}`;
	try {
		await writeFile(tmpFile, body);
		await rename(tmpFile, file);
	} catch (err) {
		console.error(`[jsonl] Escritura atómica fallida para ${file}: ${err.message}`);
		throw err;
	}
}
async function writeJsonlAtomic(file, records) {
	await writeFileAtomicInternal(file, records.map((r) => JSON.stringify(r)).join("\n") + (records.length > 0 ? "\n" : ""));
}
async function writeFileAtomic(file, body) {
	await writeFileAtomicInternal(file, body);
}
//#endregion
export { withFileLock as i, writeFileAtomic as n, writeJsonlAtomic as r, readJsonl as t };
