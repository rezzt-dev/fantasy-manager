import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
import { n as fetchOfficialAPI, r as getToken, t as CMP } from "./api-proxy_CJ5fp98A.mjs";
import { i as fetchTeamsMaster, n as normalizeTeamName } from "./team-names_DwPbX-En.mjs";
import { a as teamLogoUrl, i as fetchLaLigaEventsWindow, n as fetchEventDetails, r as fetchEventIncidents } from "./sofascore_BdUL4Ys8.mjs";
//#region src/lib/engine/matches.ts
var MATCH_WINDOW_HOURS = 48;
var statusPriority = {
	live: 0,
	halftime: 1,
	pending: 2,
	finished: 3,
	postponed: 4,
	canceled: 5,
	unknown: 6
};
function mapStatus(sofaStatus) {
	switch (sofaStatus) {
		case "notstarted": return "pending";
		case "inprogress": return "live";
		case "finished": return "finished";
		case "halftime": return "halftime";
		case "postponed": return "postponed";
		case "canceled": return "canceled";
		default: return "unknown";
	}
}
function statusLabel(status, minute) {
	switch (status) {
		case "live": return minute !== null ? `${minute}'` : "En vivo";
		case "halftime": return "Descanso";
		case "finished": return "Finalizado";
		case "pending": return "Pendiente";
		case "postponed": return "Aplazado";
		case "canceled": return "Cancelado";
		default: return "Desconocido";
	}
}
function formatKickoff(timestamp) {
	return (/* @__PURE__ */ new Date(timestamp * 1e3)).toLocaleString("es-ES", {
		weekday: "short",
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit"
	});
}
function computeMinute(event) {
	if (event.status?.type !== "inprogress") return null;
	if (event.time?.currentMinute !== void 0 && event.time.currentMinute !== null) return event.time.currentMinute;
	const periodStart = event.time?.currentPeriodStartTimestamp;
	if (periodStart) {
		const elapsed = Math.floor((Date.now() / 1e3 - periodStart) / 60);
		const base = event.time?.period === "secondHalf" ? 45 : 0;
		return Math.max(1, base + elapsed);
	}
	return null;
}
function mapIncident(incident) {
	switch (incident.incidentType) {
		case "goal": {
			const player = incident.player?.shortName ?? incident.player?.name ?? "Jugador";
			const detail = incident.reason ? ` (${incident.reason})` : "";
			return {
				type: "goal",
				minute: incident.time ?? null,
				isHome: incident.isHome ?? null,
				label: "Gol",
				detail: `${player}${detail}`
			};
		}
		case "card": {
			const player = incident.player?.shortName ?? incident.player?.name ?? "Jugador";
			const color = incident.incidentClass === "red" ? "roja" : incident.incidentClass === "yellowRed" ? "doble amarilla" : "amarilla";
			return {
				type: "card",
				minute: incident.time ?? null,
				isHome: incident.isHome ?? null,
				label: incident.incidentClass === "red" || incident.incidentClass === "yellowRed" ? "Expulsión" : "Tarjeta",
				detail: `${player} · ${color}`
			};
		}
		case "substitution": {
			const inName = incident.playerIn?.shortName ?? incident.playerIn?.name ?? "Entra";
			const outName = incident.playerOut?.shortName ?? incident.playerOut?.name ?? "Sale";
			return {
				type: "substitution",
				minute: incident.time ?? null,
				isHome: incident.isHome ?? null,
				label: "Cambio",
				detail: `${inName} ↔ ${outName}`
			};
		}
		default: return null;
	}
}
function buildSquadPlayers(calendarMatch, ownPlayers) {
	const list = [];
	const homeId = calendarMatch.localId;
	const awayId = calendarMatch.visitorId;
	for (const player of ownPlayers) {
		const teamId = player.teamId;
		if (teamId !== homeId && teamId !== awayId) continue;
		list.push({
			playerId: player.id,
			nickname: player.nickname,
			position: player.position,
			teamId,
			teamName: teamId === homeId ? "local" : "visitante",
			isHome: teamId === homeId
		});
	}
	return list;
}
function findSofaEvent(calendarMatch, sofaEvents, officialTeams) {
	const localTeam = officialTeams.find((t) => t.id === calendarMatch.localId);
	const visitorTeam = officialTeams.find((t) => t.id === calendarMatch.visitorId);
	if (!localTeam || !visitorTeam) return null;
	const localKey = normalizeTeamName(localTeam.name);
	const visitorKey = normalizeTeamName(visitorTeam.name);
	const matchTs = new Date(calendarMatch.matchDate).getTime() / 1e3;
	let best = null;
	let bestDelta = Infinity;
	for (const event of sofaEvents) {
		const homeKey = normalizeTeamName(event.homeTeam.name);
		const awayKey = normalizeTeamName(event.awayTeam.name);
		if (!(homeKey === localKey) || !(awayKey === visitorKey)) continue;
		const delta = Math.abs(event.startTimestamp - matchTs);
		if (delta < bestDelta && delta <= MATCH_WINDOW_HOURS * 3600) {
			bestDelta = delta;
			best = event;
		}
	}
	return best;
}
async function buildEnrichedMatch(calendarMatch, sofaEvent, ownPlayers, officialTeams) {
	const fetchNotes = [];
	const squadPlayers = buildSquadPlayers(calendarMatch, ownPlayers);
	let details = null;
	let incidents = [];
	if (sofaEvent) {
		try {
			details = await fetchEventDetails(sofaEvent.id);
		} catch {
			fetchNotes.push(`No se pudieron cargar detalles del partido ${calendarMatch.localId}-${calendarMatch.visitorId}.`);
		}
		try {
			incidents = (await fetchEventIncidents(sofaEvent.id))?.incidents ?? [];
		} catch {
			fetchNotes.push(`No se pudieron cargar incidentes del partido ${calendarMatch.localId}-${calendarMatch.visitorId}.`);
		}
	}
	const effectiveEvent = details ?? sofaEvent;
	const status = mapStatus(effectiveEvent?.status?.type);
	const minute = effectiveEvent ? computeMinute(effectiveEvent) : null;
	const localTeam = officialTeams.find((t) => t.id === calendarMatch.localId);
	const visitorTeam = officialTeams.find((t) => t.id === calendarMatch.visitorId);
	const home = {
		id: calendarMatch.localId,
		name: localTeam?.name ?? String(calendarMatch.localId),
		shortName: effectiveEvent?.homeTeam.shortName,
		logoUrl: effectiveEvent?.homeTeam.id ? teamLogoUrl(effectiveEvent.homeTeam.id) : "",
		score: effectiveEvent?.homeScore?.current ?? calendarMatch.localScore ?? null
	};
	const away = {
		id: calendarMatch.visitorId,
		name: visitorTeam?.name ?? String(calendarMatch.visitorId),
		shortName: effectiveEvent?.awayTeam.shortName,
		logoUrl: effectiveEvent?.awayTeam.id ? teamLogoUrl(effectiveEvent.awayTeam.id) : "",
		score: effectiveEvent?.awayScore?.current ?? calendarMatch.visitorScore ?? null
	};
	const events = incidents.map(mapIncident).filter((e) => e !== null).sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
	const match = {
		id: calendarMatch.id,
		eventId: effectiveEvent?.id ?? null,
		status,
		statusLabel: statusLabel(status, minute),
		minute,
		startTimestamp: effectiveEvent?.startTimestamp ?? new Date(calendarMatch.matchDate).getTime() / 1e3,
		kickoffFormatted: formatKickoff(effectiveEvent?.startTimestamp ?? new Date(calendarMatch.matchDate).getTime() / 1e3),
		home,
		away,
		squadPlayers,
		squadPlayerCount: squadPlayers.length,
		events,
		important: squadPlayers.length > 0,
		notes: []
	};
	if (!sofaEvent) match.notes.push("Sin datos en vivo: no se encontró el partido en SofaScore.");
	return {
		match,
		fetchNotes
	};
}
async function buildMatchesForWeek({ token, teamId, currentWeek, calendar, teamData }) {
	const notes = [];
	const officialTeams = await fetchTeamsMaster(token);
	if (officialTeams.length === 0) notes.push("No se pudo cargar el catálogo oficial de equipos; el cruce con SofaScore está desactivado.");
	const timestamps = calendar.map((m) => new Date(m.matchDate).getTime() / 1e3);
	const minTs = timestamps.length > 0 ? Math.min(...timestamps) : 0;
	const maxTs = timestamps.length > 0 ? Math.max(...timestamps) : 0;
	const sofaWindow = officialTeams.length > 0 && calendar.length > 0 ? await fetchLaLigaEventsWindow(minTs - MATCH_WINDOW_HOURS * 3600, maxTs + MATCH_WINDOW_HOURS * 3600) : null;
	if (!sofaWindow) notes.push("No se pudieron obtener eventos de SofaScore para la jornada.");
	const ownPlayers = teamData.players.map((p) => p.playerMaster);
	const enrichedMatches = [];
	for (const calendarMatch of calendar) {
		const { match, fetchNotes } = await buildEnrichedMatch(calendarMatch, sofaWindow ? findSofaEvent(calendarMatch, sofaWindow.events, officialTeams) : null, ownPlayers, officialTeams);
		enrichedMatches.push(match);
		notes.push(...fetchNotes);
	}
	return {
		matches: enrichedMatches,
		notes: [...new Set(notes)]
	};
}
function sortMatches(matches) {
	return [...matches].sort((a, b) => {
		if (a.important !== b.important) return a.important ? -1 : 1;
		if (a.squadPlayerCount !== b.squadPlayerCount) return b.squadPlayerCount - a.squadPlayerCount;
		const statusDiff = statusPriority[a.status] - statusPriority[b.status];
		if (statusDiff !== 0) return statusDiff;
		return a.startTimestamp - b.startTimestamp;
	});
}
//#endregion
//#region src/pages/api/matches.ts
var matches_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var GET = async ({ url, cookies, session }) => {
	try {
		const leagueId = url.searchParams.get("leagueId");
		const teamIdParam = url.searchParams.get("teamId");
		if (!leagueId || !teamIdParam) return new Response(JSON.stringify({ error: "leagueId and teamId required" }), { status: 400 });
		const teamId = parseInt(teamIdParam, 10);
		if (!Number.isFinite(teamId)) return new Response(JSON.stringify({ error: "teamId must be a number" }), { status: 400 });
		const token = await getToken(cookies, session);
		if (!token) return new Response(JSON.stringify({ error: "No token configured" }), { status: 401 });
		const [teamData, week] = await Promise.all([fetchOfficialAPI(`${CMP}/leagues/${leagueId}/teams/${teamId}`, token), fetchOfficialAPI(`${CMP}/week/current`, token)]);
		const currentWeek = week?.number ?? week?.weekNumber ?? 1;
		const { matches, notes } = await buildMatchesForWeek({
			token,
			teamId,
			currentWeek,
			calendar: await fetchOfficialAPI(`${CMP}/calendar`, token, { weekNumber: String(currentWeek) }),
			teamData
		});
		const sorted = sortMatches(matches);
		const important = sorted.filter((m) => m.important);
		const normal = sorted.filter((m) => !m.important);
		const response = {
			week: currentWeek,
			generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
			matches: sorted,
			important,
			normal,
			notes
		};
		return new Response(JSON.stringify(response), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error("[matches] Error:", message);
		const status = message.includes("HTTP 401") ? 401 : 500;
		return new Response(JSON.stringify({ error: message }), { status });
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/matches@_@ts
var page = () => matches_exports;
//#endregion
export { page };
