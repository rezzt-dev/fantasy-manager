import { mkdir, readFile, writeFile } from "node:fs/promises";
import nodePath from "node:path";
//#region src/lib/engine/sources/http-cache.ts
/**
* Caché HTTP para fuentes externas (§3.5 del diseño): pocas peticiones, TTL
* por tipo de dato, User-Agent identificable, y fallo gracioso — si la fuente
* cae se sirve el último dato en caché aunque esté caducado (`origin: stale`)
* y el consumidor lo anota en `dataQuality`.
*/
var SOURCES_CACHE_DIR = nodePath.join(process.cwd(), "data", "cache", "sources");
var USER_AGENT = "fantasy-manager/0.1 (analisis fantasy personal; scraping minimo con cache)";
var FETCH_TIMEOUT_MS = 15e3;
var memCache = /* @__PURE__ */ new Map();
function cacheFile(key) {
	return nodePath.join(SOURCES_CACHE_DIR, `${key}.txt`);
}
async function readDisk(key) {
	try {
		return JSON.parse(await readFile(cacheFile(key), "utf8"));
	} catch {
		return null;
	}
}
async function writeDisk(key, entry) {
	try {
		await mkdir(SOURCES_CACHE_DIR, { recursive: true });
		await writeFile(cacheFile(key), JSON.stringify(entry));
	} catch (error) {
		console.warn("[sources] disk cache write failed:", error instanceof Error ? error.message : error);
	}
}
/**
* Descarga `url` con caché de `ttlMs`. Devuelve null solo si no hay nada que
* servir (sin red y sin caché). Nunca lanza.
*
* `fetcher` permite sustituir el cliente HTTP (p. ej. curl para fuentes con
* Cloudflare que bloquean el fetch de Node, como Sofascore).
*/
async function fetchTextWithCache(key, url, ttlMs, fetcher) {
	const now = Date.now();
	const mem = memCache.get(key);
	if (mem && mem.expiresAt > now) return {
		text: mem.entry.text,
		origin: "cache",
		fetchedAt: mem.entry.fetchedAt
	};
	const disk = await readDisk(key);
	if (disk && now - disk.fetchedAt < ttlMs) {
		memCache.set(key, {
			expiresAt: disk.fetchedAt + ttlMs,
			entry: disk
		});
		return {
			text: disk.text,
			origin: "cache",
			fetchedAt: disk.fetchedAt
		};
	}
	try {
		let text;
		if (fetcher) text = await fetcher(url);
		else {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
			const res = await fetch(url, {
				headers: {
					"User-Agent": USER_AGENT,
					Accept: "text/html, text/csv, application/json"
				},
				signal: controller.signal
			});
			clearTimeout(timeout);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			text = await res.text();
		}
		const entry = {
			fetchedAt: now,
			url,
			text
		};
		memCache.set(key, {
			expiresAt: now + ttlMs,
			entry
		});
		await writeDisk(key, entry);
		return {
			text,
			origin: "network",
			fetchedAt: now
		};
	} catch (error) {
		console.warn(`[sources] fetch failed for ${key}:`, error instanceof Error ? error.message : error);
		if (disk) return {
			text: disk.text,
			origin: "stale",
			fetchedAt: disk.fetchedAt
		};
		return null;
	}
}
//#endregion
//#region src/lib/engine/team-names.ts
/**
* Normalización de nombres de equipo para cruzar fuentes externas (ClubElo,
* Jornada Perfecta, FútbolFantasy) con los equipos oficiales de la API.
*
* Estrategia: normalizar todo a minúsculas sin tildes, sin tokens corporativos
* (fc, cf, ud, rc, real, club...) ni tokens de una letra ("C.A.", "R."), y
* resolver los pocos casos residuales con una tabla de alias explícita. Los
* fallos de matching se loguean y devuelven null — nunca se adivina.
*/
var DROP_TOKENS = /* @__PURE__ */ new Set([
	"fc",
	"cf",
	"ud",
	"rc",
	"rcd",
	"cd",
	"ca",
	"sd",
	"ad",
	"de",
	"club",
	"real",
	"sad",
	"cfc"
]);
/** Sufijos de filial: se conservan aunque sean tokens de una sola letra. */
var FILIAL_SUFFIXES = /* @__PURE__ */ new Set(["b", "ii"]);
/**
* Alias: nombre normalizado de la fuente → nombre normalizado oficial.
* Se aplican en ambos sentidos: el nombre oficial también se indexa bajo la
* variante inversa para que un sourceName como "Celta Vigo" encuentre a
* "Celta", y viceversa.
*/
var NAME_ALIASES = {
	atletico: "atletico madrid",
	vallecano: "rayo vallecano",
	alaves: "deportivo alaves",
	bilbao: "athletic",
	santander: "racing",
	depor: "deportivo",
	"celta vigo": "celta",
	"deportivo coruna": "deportivo"
};
/** Expande los alias en ambos sentidos sin perder el mapeo directo. */
function expandAliases(aliases) {
	const expanded = {};
	for (const [source, official] of Object.entries(aliases)) {
		expanded[source] = [official];
		expanded[official] = expanded[official] ?? [];
		expanded[official].push(source);
	}
	return expanded;
}
var EXPANDED_ALIASES = expandAliases(NAME_ALIASES);
function normalizeTeamName(name) {
	const rawTokens = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
	const lastToken = rawTokens[rawTokens.length - 1];
	const filial = lastToken && FILIAL_SUFFIXES.has(lastToken) ? lastToken : null;
	const base = (filial ? rawTokens.slice(0, -1) : rawTokens).filter((token) => token.length > 1 && !DROP_TOKENS.has(token)).join(" ").trim();
	const normalized = filial ? `${base} ${filial}`.trim() : base;
	return NAME_ALIASES[normalized] ?? normalized;
}
/** Devuelve las variantes normalizadas de un nombre (directa + alias inversos). */
function nameVariations(name) {
	const normalized = normalizeTeamName(name);
	const inverses = EXPANDED_ALIASES[normalized] ?? [];
	return [.../* @__PURE__ */ new Set([normalized, ...inverses])].filter(Boolean);
}
/**
* Los avisos de normalización describen el catálogo, no la petición: se
* construye un matcher por consulta y sin esto el mismo aviso se repetiría en
* cada una, inundando el log.
*/
var warnedKeys = /* @__PURE__ */ new Set();
function warnOnce(message) {
	if (warnedKeys.has(message)) return;
	warnedKeys.add(message);
	console.warn(message);
}
/**
* Construye el matcher nombre-de-fuente → teamId oficial a partir de la lista
* oficial (teams-master). Indexa variaciones de alias en ambos sentidos para
* que pequeñas diferencias de nomenclatura ("Celta" vs "Celta Vigo") no
* impidan el cruce. Los fallos devuelven null (el consumidor lo anota en
* dataQuality); nunca se adivina.
*/
function buildTeamMatcher(officialTeams) {
	const byNormalized = /* @__PURE__ */ new Map();
	for (const team of officialTeams) {
		const variations = nameVariations(team.name);
		if (variations.length === 0) {
			warnOnce(`[team-names] nombre oficial no normalizable: ${team.name}`);
			continue;
		}
		for (const key of variations) {
			if (byNormalized.has(key) && byNormalized.get(key) !== team.id) {
				warnOnce(`[team-names] nombre normalizado duplicado: ${key} (${byNormalized.get(key)} y ${team.id})`);
				continue;
			}
			byNormalized.set(key, team.id);
		}
	}
	return (sourceName) => {
		for (const key of nameVariations(sourceName)) {
			const id = byNormalized.get(key);
			if (id !== void 0) return id;
		}
		return null;
	};
}
//#endregion
export { fetchTextWithCache as n, buildTeamMatcher as t };
