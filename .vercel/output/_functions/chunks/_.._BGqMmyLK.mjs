import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
import { c as getEnvOptional, i as getToken, s as getEnv } from "./api-proxy_CUjR3F-2.mjs";
import { n as fetchTeamsMaster } from "./teams_B9ggIAoL.mjs";
import { t as enrichMarketPlayers } from "./market-enrich_jyOnRCUq.mjs";
//#region src/lib/fantasy/player-team-enrich.ts
/**
* Enriquece los objetos `PlayerMaster` que llegan desde la API oficial con el
* nombre del equipo real cuando la respuesta lo omite (`Sin equipo`).
*
* Se aplica de forma recursiva sobre arrays y objetos, de modo que funciona
* tanto para listados de jugadores (`PlayerMaster[]`), mercado
* (`MarketPlayer[]`), plantillas (`TeamData`), alineaciones (`TeamLineup`) y
* detalles de un jugador.
*/
var teamNameCache = null;
var TEAM_CACHE_TTL_MS = 864e5;
async function fetchTeamNameMap(token) {
	if (teamNameCache && teamNameCache.expiresAt > Date.now()) return teamNameCache.map;
	const teams = await fetchTeamsMaster(token);
	const map = new Map(teams.map((t) => [t.id, t.name]));
	teamNameCache = {
		expiresAt: Date.now() + TEAM_CACHE_TTL_MS,
		map
	};
	return map;
}
function slugify(name) {
	return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function enrichPlayerMasterTeam(player, teamNames) {
	const teamId = Number(player.teamId);
	const name = Number.isFinite(teamId) && teamId > 0 ? teamNames.get(teamId) : void 0;
	if (!name) return player;
	if (!player.team || !player.team.name) player.team = {
		id: String(teamId),
		name,
		slug: player.team?.slug || slugify(name)
	};
	return player;
}
function isPlayerMasterLike(obj) {
	return typeof obj === "object" && obj !== null && "id" in obj && "nickname" in obj && ("teamId" in obj || "team" in obj);
}
function isPlainObject(obj) {
	return typeof obj === "object" && obj !== null && !Array.isArray(obj) && obj.constructor === Object;
}
function enrichResponseTeams(data, teamNames) {
	if (Array.isArray(data)) {
		for (let i = 0; i < data.length; i++) data[i] = enrichResponseTeams(data[i], teamNames);
		return data;
	}
	if (!isPlainObject(data)) return data;
	if (isPlayerMasterLike(data)) enrichPlayerMasterTeam(data, teamNames);
	if (data.playerMaster && isPlayerMasterLike(data.playerMaster)) enrichPlayerMasterTeam(data.playerMaster, teamNames);
	const record = data;
	for (const key of Object.keys(record)) {
		const value = record[key];
		if (Array.isArray(value) || isPlainObject(value)) record[key] = enrichResponseTeams(value, teamNames);
	}
	return data;
}
/**
* Comprueba si un objeto JSON parseado contiene algún jugador cuyo equipo
* pueda enriquecerse.
*/
function mayNeedTeamEnrichment(data) {
	if (isPlayerMasterLike(data)) return true;
	if (Array.isArray(data)) return data.some(mayNeedTeamEnrichment);
	if (!isPlainObject(data)) return false;
	if (data.playerMaster && isPlayerMasterLike(data.playerMaster)) return true;
	return Object.values(data).some(mayNeedTeamEnrichment);
}
//#endregion
//#region src/pages/api/proxy/[...path].ts
var ____path__exports = /* @__PURE__ */ __exportAll({
	DELETE: () => DELETE,
	GET: () => GET,
	OPTIONS: () => OPTIONS,
	PATCH: () => PATCH,
	POST: () => POST,
	PUT: () => PUT
});
var TARGET = getEnv("PROXY_FANTASY_TARGET", "https://fantasy-api.llt-services.com");
var X_APP = getEnv("PROXY_DEFAULT_X_APP", "2");
var X_LANG = getEnv("PROXY_DEFAULT_X_LANG", "es");
var TIMEOUT_MS = parseInt(getEnv("PROXY_TIMEOUT_MS", "15000"), 10);
var ALL_PLAYERS_CACHE_TTL_MS = 12e4;
var allPlayersCache = null;
async function fetchAllPlayersCached(token) {
	if (allPlayersCache && allPlayersCache.expiresAt > Date.now()) return allPlayersCache.players;
	const res = await fetch(`${TARGET}/api/v1/competition/1/players?x-lang=${X_LANG}`, { headers: {
		Authorization: `Bearer ${token}`,
		"x-app": X_APP,
		"x-lang": X_LANG,
		Accept: "application/json"
	} });
	if (!res.ok) throw new Error(`players fetch failed: ${res.status}`);
	const players = await res.json();
	allPlayersCache = {
		expiresAt: Date.now() + ALL_PLAYERS_CACHE_TTL_MS,
		players
	};
	return players;
}
function isMarketPath(path) {
	return /^v1\/competition\/1\/league\/[^\/]+\/market\/?$/.test(path);
}
function buildResponseHeaders(upstream) {
	const responseHeaders = new Headers();
	upstream.headers.forEach((value, key) => {
		if ([
			"content-encoding",
			"content-length",
			"transfer-encoding"
		].includes(key.toLowerCase())) return;
		responseHeaders.set(key, value);
	});
	responseHeaders.set("Access-Control-Allow-Origin", "*");
	return responseHeaders;
}
function jsonResponse(upstream, body) {
	const headers = buildResponseHeaders(upstream);
	headers.set("Content-Type", "application/json");
	return new Response(body, {
		status: upstream.status,
		statusText: upstream.statusText,
		headers
	});
}
function rawResponse(upstream, body) {
	return new Response(body, {
		status: upstream.status,
		statusText: upstream.statusText,
		headers: buildResponseHeaders(upstream)
	});
}
async function proxyHandler({ request, params, cookies, session }) {
	const token = await getToken(cookies, session);
	if (!token) return new Response(JSON.stringify({ error: "No token configured. Login or set LALIGA_FANTASY_TOKEN." }), { status: 401 });
	const path = Array.isArray(params.path) ? params.path.join("/") : params.path;
	const targetUrl = `${TARGET}/api/${path}${new URL(request.url).search}`;
	const headers = {
		"Authorization": `Bearer ${token}`,
		"x-app": X_APP,
		"x-lang": X_LANG,
		"Accept": "application/json",
		"User-Agent": getEnvOptional("PROXY_DEFAULT_USER_AGENT") || "fantasy-manager/0.1"
	};
	let body;
	if (request.body) {
		headers["Content-Type"] = request.headers.get("content-type") || "application/json";
		body = await request.arrayBuffer();
	}
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const upstream = await fetch(targetUrl, {
			method: request.method,
			headers,
			body,
			signal: controller.signal
		});
		clearTimeout(timeout);
		const isJson = (upstream.headers.get("content-type") || "").includes("application/json");
		if (path && request.method === "GET" && upstream.ok && isMarketPath(path) && isJson) try {
			const market = await upstream.clone().json();
			const allPlayers = await fetchAllPlayersCached(token);
			const enriched = enrichMarketPlayers(market, allPlayers);
			return jsonResponse(upstream, JSON.stringify(enriched));
		} catch (enrichError) {
			console.warn("[proxy] market enrichment failed:", enrichError instanceof Error ? enrichError.message : enrichError);
		}
		if (request.method === "GET" && upstream.ok && isJson) try {
			const data = await upstream.clone().json();
			if (mayNeedTeamEnrichment(data)) {
				enrichResponseTeams(data, await fetchTeamNameMap(token));
				return jsonResponse(upstream, JSON.stringify(data));
			}
		} catch (enrichError) {
			console.warn("[proxy] team enrichment failed:", enrichError instanceof Error ? enrichError.message : enrichError);
		}
		return rawResponse(upstream, await upstream.arrayBuffer());
	} catch (error) {
		clearTimeout(timeout);
		const message = error instanceof Error ? error.message : "Unknown error";
		return new Response(JSON.stringify({ error: message }), { status: 502 });
	}
}
var GET = proxyHandler;
var POST = proxyHandler;
var PUT = proxyHandler;
var DELETE = proxyHandler;
var PATCH = proxyHandler;
var OPTIONS = () => {
	return new Response(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization"
		}
	});
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/proxy/[...path]@_@ts
var page = () => ____path__exports;
//#endregion
export { page };
