import { r as fetchOfficialAPI } from "./api-proxy_CUjR3F-2.mjs";
//#region src/lib/fantasy/teams.ts
var CACHE_TTL_MS = 864e5;
var cache = null;
/**
* Catálogo oficial de equipos (`/v3/teams-master`): id, nombre, nombre corto,
* slug y escudos. Es la referencia para cruzar fuentes externas y para pintar
* escudos en la UI. Se cachea 24 h; si falla devuelve lista vacía.
*/
async function fetchTeamsCatalog(token) {
	if (cache && cache.expiresAt > Date.now()) return cache.teams;
	try {
		const teams = await fetchOfficialAPI("/v3/teams-master", token);
		if (Array.isArray(teams) && teams.length > 0) {
			const catalog = teams.map((t) => ({
				id: Number(t.id),
				name: t.name,
				shortName: t.shortName ?? "",
				slug: t.slug ?? "",
				badgeColor: t.badgeColor ?? "",
				badgeWhite: t.badgeWhite ?? ""
			})).filter((t) => Number.isFinite(t.id) && !!t.name);
			cache = {
				expiresAt: Date.now() + CACHE_TTL_MS,
				teams: catalog
			};
			return catalog;
		}
	} catch (error) {
		console.warn("[teams-master] fetch failed:", error instanceof Error ? error.message : error);
	}
	return [];
}
/**
* Lista oficial de equipos reducida a (id, nombre), que es lo que necesita el
* matcher de nombres para cruzar fuentes externas.
*/
async function fetchTeamsMaster(token) {
	return (await fetchTeamsCatalog(token)).map((t) => ({
		id: t.id,
		name: t.name
	}));
}
//#endregion
export { fetchTeamsMaster as n, fetchTeamsCatalog as t };
