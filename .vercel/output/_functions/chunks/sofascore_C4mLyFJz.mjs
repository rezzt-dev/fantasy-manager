import { n as fetchTextWithCache } from "./team-names_C8XSvDvH.mjs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
//#region src/lib/engine/sources/sofascore.ts
/**
* Adaptador Sofascore API no oficial (§3.3, riesgo medio): alineaciones
* CONFIRMADAS (~40-60 min antes del partido). Es la última palabra sobre
* titularidad (§4.4.5): cuando existe, hace override del once probable.
*
* Cloudflare bloquea el fetch de Node (403 por fingerprint), así que la
* descarga se hace con curl (disponible en el servidor). TTL corto (15 min):
* solo es útil cerca del deadline; fuera de ese margen el endpoint de lineups
* responde 404 y el adaptador devuelve vacío (degradación graciosa).
*/
var execFileAsync = promisify(execFile);
/** Descarga con curl: Sofascore rechaza el cliente HTTP de Node. */
async function curlFetch(url) {
	const { stdout } = await execFileAsync("curl", [
		"-sS",
		"--fail",
		"--max-time",
		"15",
		"-A",
		"fantasy-manager/0.1 (analisis fantasy personal)",
		url
	], { maxBuffer: 10485760 });
	return stdout;
}
var BASE_URL = "https://www.sofascore.com/api/v1";
var SEASONS_TTL_MS = 864e5;
var EVENTS_TTL_MS = 9e5;
var LALIGA_TOURNAMENT_ID = 8;
async function fetchJson(key, path, ttlMs) {
	const fetched = await fetchTextWithCache(key, `${BASE_URL}${path}`, ttlMs, curlFetch);
	if (!fetched) return null;
	try {
		return JSON.parse(fetched.text);
	} catch {
		console.warn(`[sofascore] JSON inválido en ${path}`);
		return null;
	}
}
/** Id de la temporada actual de LaLiga (26/27) en Sofascore. */
async function currentSeasonId() {
	const seasons = (await fetchJson("sofa-seasons", `/unique-tournament/${LALIGA_TOURNAMENT_ID}/seasons`, SEASONS_TTL_MS))?.seasons;
	if (!seasons || seasons.length === 0) return null;
	return seasons[0].id;
}
/**
* Alineaciones confirmadas de los próximos partidos de LaLiga. Vacío fuera
* del margen previo al partido (~1 h antes), el caso normal casi siempre.
*/
async function fetchConfirmedLineups() {
	const result = [];
	const seasonId = await currentSeasonId();
	if (seasonId === null) return result;
	const events = (await fetchJson(`sofa-events-next-${seasonId}`, `/unique-tournament/${LALIGA_TOURNAMENT_ID}/season/${seasonId}/events/next/0`, EVENTS_TTL_MS))?.events ?? [];
	for (const event of events) {
		const lineups = await fetchJson(`sofa-lineups-${event.id}`, `/event/${event.id}/lineups`, EVENTS_TTL_MS);
		if (!lineups?.confirmed) continue;
		const mapSide = (side, teamName) => {
			if (!side?.players || !teamName) return null;
			const starters = side.players.filter((p) => !p.substitute).map((p) => p.player?.name ?? "").filter(Boolean);
			const bench = side.players.filter((p) => p.substitute).map((p) => p.player?.name ?? "").filter(Boolean);
			return starters.length > 0 ? {
				sourceTeamName: teamName,
				starters,
				bench
			} : null;
		};
		const home = mapSide(lineups.home, event.homeTeam?.name);
		const away = mapSide(lineups.away, event.awayTeam?.name);
		if (home) result.push(home);
		if (away) result.push(away);
	}
	return result;
}
var EVENT_DETAILS_TTL_MS = 6e4;
var EVENT_INCIDENTS_TTL_MS = 6e4;
async function fetchEventDetails(eventId) {
	return (await fetchJson(`sofa-event-${eventId}`, `/event/${eventId}`, EVENT_DETAILS_TTL_MS))?.event ?? null;
}
async function fetchEventIncidents(eventId) {
	return await fetchJson(`sofa-incidents-${eventId}`, `/event/${eventId}/incidents`, EVENT_INCIDENTS_TTL_MS);
}
function mapLineupPlayer(entry) {
	const player = entry.player;
	if (!player?.name) return null;
	return {
		id: player.id ? String(player.id) : void 0,
		name: player.name,
		shortName: player.shortName,
		position: player.position,
		number: player.jerseyNumber,
		isStarter: entry.substitute !== true
	};
}
function mapLineupSide(side, fallbackName) {
	if (!side) return null;
	const players = (side.players ?? []).map(mapLineupPlayer).filter((p) => p !== null);
	const starters = players.filter((p) => p.isStarter);
	const bench = players.filter((p) => !p.isStarter);
	if (starters.length === 0) return null;
	return {
		teamName: side.team?.name ?? side.team?.shortName ?? fallbackName ?? "Equipo",
		formation: side.formation,
		coach: side.manager?.name,
		starters,
		bench
	};
}
/**
* Alineaciones confirmadas de un partido específico de SofaScore. Devuelve
* titulares, suplentes, formación y entrenador cuando están disponibles.
* TTL corto porque solo son fiables cerca del partido; el endpoint puede
* devolver 404 una vez finalizado el encuentro.
*/
async function fetchEventLineups(eventId) {
	const data = await fetchJson(`sofa-lineups-${eventId}`, `/event/${eventId}/lineups`, EVENT_DETAILS_TTL_MS);
	if (!data?.confirmed) return null;
	const home = mapLineupSide(data.home, "Local");
	const away = mapLineupSide(data.away, "Visitante");
	if (!home || !away) return null;
	return {
		home,
		away
	};
}
function teamLogoUrl(teamId) {
	return `${BASE_URL}/team/${teamId}/image`;
}
/**
* Eventos de una jornada concreta (`/events/round/{n}`). Es la vía fiable para
* jornadas pasadas: `events/last/0` solo devuelve la página más reciente, así
* que las jornadas antiguas se quedan fuera de la ventana temporal.
*/
async function fetchLaLigaEventsRound(round) {
	const seasonId = await currentSeasonId();
	if (seasonId === null) return [];
	return (await fetchJson(`sofa-events-round-${seasonId}-${round}`, `/unique-tournament/${LALIGA_TOURNAMENT_ID}/season/${seasonId}/events/round/${round}`, EVENTS_TTL_MS))?.events ?? [];
}
/**
* Descarga eventos de LaLiga en una ventana temporal. Combina `/events/next/0`
* y `/events/last/0` porque cubren la jornada actual y evitan tener que
* conocer el número de ronda exacto. Filtra por timestamp para devolver solo
* los partidos dentro del rango solicitado.
*/
async function fetchLaLigaEventsWindow(fromTimestamp, toTimestamp) {
	const seasonId = await currentSeasonId();
	if (seasonId === null) return null;
	const [nextPage, lastPage] = await Promise.all([fetchJson(`sofa-events-next-${seasonId}`, `/unique-tournament/${LALIGA_TOURNAMENT_ID}/season/${seasonId}/events/next/0`, EVENTS_TTL_MS), fetchJson(`sofa-events-last-${seasonId}`, `/unique-tournament/${LALIGA_TOURNAMENT_ID}/season/${seasonId}/events/last/0`, EVENTS_TTL_MS)]);
	const all = [];
	for (const page of [nextPage, lastPage]) if (page?.events) all.push(...page.events);
	const origin = "network";
	const events = all.filter((e) => e.startTimestamp >= fromTimestamp && e.startTimestamp <= toTimestamp);
	const byId = /* @__PURE__ */ new Map();
	for (const e of events) byId.set(e.id, e);
	return {
		events: [...byId.values()],
		seasonId,
		origin
	};
}
//#endregion
export { fetchLaLigaEventsRound as a, fetchEventLineups as i, fetchEventDetails as n, fetchLaLigaEventsWindow as o, fetchEventIncidents as r, teamLogoUrl as s, fetchConfirmedLineups as t };
