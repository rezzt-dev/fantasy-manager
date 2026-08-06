import { n as fetchOfficialAPI } from "./api-proxy_CJ5fp98A.mjs";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
//#region src/lib/fantasy/teams.ts
var CACHE_TTL_MS = 864e5;
var cache = null;
/**
* Lista oficial de equipos de la competición (id, nombre) de
* `/v3/teams-master`. Es la referencia para cruzar fuentes externas.
* Se cachea 24 h; si falla devuelve lista vacía (matching desactivado).
*/
async function fetchTeamsMaster(token) {
	if (cache && cache.expiresAt > Date.now()) return cache.teams;
	try {
		const teams = await fetchOfficialAPI("/v3/teams-master", token);
		if (Array.isArray(teams) && teams.length > 0) {
			const official = teams.map((t) => ({
				id: Number(t.id),
				name: t.name
			})).filter((t) => Number.isFinite(t.id));
			cache = {
				expiresAt: Date.now() + CACHE_TTL_MS,
				teams: official
			};
			return official;
		}
	} catch (error) {
		console.warn("[teams-master] fetch failed:", error instanceof Error ? error.message : error);
	}
	return [];
}
//#endregion
//#region src/lib/engine/sources/http-cache.ts
/**
* Caché HTTP para fuentes externas (§3.5 del diseño): pocas peticiones, TTL
* por tipo de dato, User-Agent identificable, y fallo gracioso — si la fuente
* cae se sirve el último dato en caché aunque esté caducado (`origin: stale`)
* y el consumidor lo anota en `dataQuality`.
*/
var SOURCES_CACHE_DIR = path.join(process.cwd(), "data", "cache", "sources");
var USER_AGENT = "fantasy-manager/0.1 (analisis fantasy personal; scraping minimo con cache)";
var FETCH_TIMEOUT_MS = 15e3;
var memCache = /* @__PURE__ */ new Map();
function cacheFile(key) {
	return path.join(SOURCES_CACHE_DIR, `${key}.txt`);
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
/** Alias residuales: nombre normalizado de la fuente → nombre normalizado oficial. */
var NAME_ALIASES = {
	atletico: "atletico madrid",
	vallecano: "rayo vallecano",
	alaves: "deportivo alaves",
	bilbao: "athletic",
	santander: "racing",
	depor: "deportivo"
};
function normalizeTeamName(name) {
	const normalized = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((token) => token.length > 1 && !DROP_TOKENS.has(token)).join(" ").trim();
	return NAME_ALIASES[normalized] ?? normalized;
}
/**
* Construye el matcher nombre-de-fuente → teamId oficial a partir de la lista
* oficial (teams-master). Los fallos devuelven null (el consumidor lo anota
* en dataQuality); nunca se adivina.
*/
function buildTeamMatcher(officialTeams) {
	const byNormalized = /* @__PURE__ */ new Map();
	for (const team of officialTeams) {
		const key = normalizeTeamName(team.name);
		if (!key) {
			console.warn(`[team-names] nombre oficial no normalizable: ${team.name}`);
			continue;
		}
		if (byNormalized.has(key) && byNormalized.get(key) !== team.id) console.warn(`[team-names] nombre normalizado duplicado: ${key} (${byNormalized.get(key)} y ${team.id})`);
		byNormalized.set(key, team.id);
	}
	return (sourceName) => byNormalized.get(normalizeTeamName(sourceName)) ?? null;
}
//#endregion
export { fetchTeamsMaster as i, normalizeTeamName as n, fetchTextWithCache as r, buildTeamMatcher as t };
