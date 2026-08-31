import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
import { i as getToken, r as fetchOfficialAPI, t as CMP } from "./api-proxy_CUjR3F-2.mjs";
import { t as fetchTeamsCatalog } from "./teams_B9ggIAoL.mjs";
import { t as buildTeamMatcher } from "./team-names_C8XSvDvH.mjs";
import { a as fetchLaLigaEventsRound, i as fetchEventLineups, n as fetchEventDetails, o as fetchLaLigaEventsWindow, r as fetchEventIncidents, s as teamLogoUrl } from "./sofascore_C4mLyFJz.mjs";
//#region src/lib/engine/sources/match-summary.ts
/**
* Generador de resumen de partido a partir de los datos que ya tenemos.
*
* El objetivo es ofrecer un texto legible sin depender de fuentes externas
* inestables. Cuando haya endpoints fiables (RSS, APIs de medios, etc.) se
* puede añadir `fetchExternalMatchSummary` como primer intento y usar esta
* función como fallback.
*/
function extractPlayerName(detail) {
	if (!detail) return "Jugador";
	return detail.split(" · ")[0].split(" (")[0].trim() || "Jugador";
}
function formatMinute(minute) {
	if (minute === null) return "";
	return `${minute}'`;
}
function sentenceForResult(match) {
	const home = match.home;
	const away = match.away;
	const homeScore = home.score ?? 0;
	const awayScore = away.score ?? 0;
	if (match.status === "finished") {
		if (homeScore > awayScore) return `${home.name} venció a ${away.name} por ${homeScore}-${awayScore}.`;
		if (awayScore > homeScore) return `${away.name} se impuso a ${home.name} por ${awayScore}-${homeScore}.`;
		return `${home.name} y ${away.name} empataron ${homeScore}-${awayScore}.`;
	}
	if (match.status === "live" || match.status === "halftime") {
		const minute = match.minute;
		const minuteText = minute !== null ? ` en el minuto ${minute}` : "";
		const phaseText = match.phase === "descanso" ? " al descanso" : "";
		if (homeScore > awayScore) return `${home.name} está venciendo a ${away.name} ${homeScore}-${awayScore}${minuteText}${phaseText}.`;
		if (awayScore > homeScore) return `${away.name} está ganando a ${home.name} ${awayScore}-${homeScore}${minuteText}${phaseText}.`;
		return `${home.name} y ${away.name} empatan ${homeScore}-${awayScore}${minuteText}${phaseText}.`;
	}
	if (match.status === "pending") return `El partido entre ${home.name} y ${away.name} aún no ha comenzado.`;
	if (match.status === "postponed") return `El partido entre ${home.name} y ${away.name} ha sido aplazado.`;
	if (match.status === "canceled") return `El partido entre ${home.name} y ${away.name} ha sido cancelado.`;
	return `${home.name} recibe a ${away.name}.`;
}
function sentenceForGoals(events) {
	const goals = events.filter((e) => e.type === "goal" && e.minute !== null);
	if (goals.length === 0) return "";
	return `Goles: ${goals.map((e) => {
		const author = extractPlayerName(e.detail);
		const suffix = e.isHome === false ? ` (${e.isHome === null ? "" : "visitante"})` : "";
		return `${author} ${formatMinute(e.minute)}${suffix}`;
	}).join(", ")}.`;
}
function sentenceForRedCards(events) {
	const reds = events.filter((e) => e.type === "card" && (e.detail?.includes("roja") || e.detail?.includes("doble amarilla")) && e.minute !== null);
	if (reds.length === 0) return "";
	return `Expulsiones: ${reds.map((e) => `${extractPlayerName(e.detail)} ${formatMinute(e.minute)}`).join(", ")}.`;
}
function sentenceForSquadPlayers(match) {
	const players = match.squadPlayers;
	if (players.length === 0) return "";
	return `Jugadores de tu plantilla implicados: ${players.map((p) => `${p.nickname} (${p.isHome ? match.home.shortName ?? match.home.name : match.away.shortName ?? match.away.name})`).join(", ")}.`;
}
function sentenceForLineups(lineups) {
	if (!lineups) return "";
	const homeFormation = lineups.home.formation ? ` (${lineups.home.formation})` : "";
	const awayFormation = lineups.away.formation ? ` (${lineups.away.formation})` : "";
	return `Alineaciones disponibles: ${lineups.home.teamName}${homeFormation} vs ${lineups.away.teamName}${awayFormation}.`;
}
/**
* Crea un resumen textual en español a partir del marcador, eventos y
* alineaciones del partido.
*/
function generateMatchSummary(match) {
	const sentences = [sentenceForResult(match)];
	const goals = sentenceForGoals(match.events);
	if (goals) sentences.push(goals);
	const reds = sentenceForRedCards(match.events);
	if (reds) sentences.push(reds);
	const lineups = sentenceForLineups(match.lineups);
	if (lineups) sentences.push(lineups);
	const squad = sentenceForSquadPlayers(match);
	if (squad) sentences.push(squad);
	return {
		text: sentences.join(" "),
		source: "generated",
		generatedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
}
/**
* Stub para futuras integraciones con medios (Marca, AS, Fútbol Fantasy, …).
*
* La idea es intentar primero una fuente externa con un fetch identificable y
* caché corta; si falla, volver a `generateMatchSummary`. Por ahora devuelve
* null para que el motor siempre use el resumen generado.
*/
async function fetchExternalMatchSummary(_match) {
	return null;
}
//#endregion
//#region src/lib/engine/matches.ts
var MATCH_WINDOW_HOURS = 48;
var ENRICH_CONCURRENCY = 4;
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
function computePhase(event) {
	if (!event) return "desconocido";
	const status = event.status?.type;
	const period = event.time?.period;
	if (status === "finished") return "finalizado";
	if (status === "notstarted") return "pendiente";
	if (status === "halftime") return "descanso";
	if (status === "inprogress") {
		if (period === "secondHalf") return "segunda-parte";
		return "primera-parte";
	}
	if (status === "postponed") return "pendiente";
	if (status === "canceled") return "pendiente";
	return "desconocido";
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
function findSofaEvent(calendarMatch, sofaEvents, teamsById, matchTeam) {
	if (!teamsById.has(calendarMatch.localId) || !teamsById.has(calendarMatch.visitorId)) return null;
	const matchTs = new Date(calendarMatch.matchDate).getTime() / 1e3;
	let best = null;
	let bestDelta = Infinity;
	for (const event of sofaEvents) {
		const homeId = matchTeam(event.homeTeam.name);
		const awayId = matchTeam(event.awayTeam.name);
		if (homeId == null || awayId == null) continue;
		const homeMatches = homeId === calendarMatch.localId;
		const awayMatches = awayId === calendarMatch.visitorId;
		if (!homeMatches || !awayMatches) continue;
		const delta = Math.abs(event.startTimestamp - matchTs);
		if (delta < bestDelta && delta <= MATCH_WINDOW_HOURS * 3600) {
			bestDelta = delta;
			best = event;
		}
	}
	return best;
}
async function buildEnrichedMatch(calendarMatch, sofaEvent, ownPlayers, teamsById) {
	const fetchNotes = [];
	const squadPlayers = buildSquadPlayers(calendarMatch, ownPlayers);
	let details = null;
	let incidents = [];
	let lineups = void 0;
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
		try {
			lineups = await fetchEventLineups(sofaEvent.id) ?? void 0;
		} catch {
			fetchNotes.push(`No se pudieron cargar alineaciones del partido ${calendarMatch.localId}-${calendarMatch.visitorId}.`);
		}
	}
	const effectiveEvent = details ?? sofaEvent;
	const status = mapStatus(effectiveEvent?.status?.type);
	const minute = effectiveEvent ? computeMinute(effectiveEvent) : null;
	const phase = computePhase(effectiveEvent);
	const localTeam = teamsById.get(calendarMatch.localId);
	const visitorTeam = teamsById.get(calendarMatch.visitorId);
	const home = {
		id: calendarMatch.localId,
		name: localTeam?.name ?? effectiveEvent?.homeTeam.name ?? String(calendarMatch.localId),
		shortName: localTeam?.shortName || effectiveEvent?.homeTeam.shortName,
		logoUrl: localTeam?.badgeColor || (effectiveEvent?.homeTeam.id ? teamLogoUrl(effectiveEvent.homeTeam.id) : ""),
		score: effectiveEvent?.homeScore?.current ?? calendarMatch.localScore ?? null
	};
	const away = {
		id: calendarMatch.visitorId,
		name: visitorTeam?.name ?? effectiveEvent?.awayTeam.name ?? String(calendarMatch.visitorId),
		shortName: visitorTeam?.shortName || effectiveEvent?.awayTeam.shortName,
		logoUrl: visitorTeam?.badgeColor || (effectiveEvent?.awayTeam.id ? teamLogoUrl(effectiveEvent.awayTeam.id) : ""),
		score: effectiveEvent?.awayScore?.current ?? calendarMatch.visitorScore ?? null
	};
	const events = incidents.map(mapIncident).filter((e) => e !== null).sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
	const match = {
		id: calendarMatch.id,
		eventId: effectiveEvent?.id ?? null,
		status,
		statusLabel: statusLabel(status, minute),
		phase,
		minute,
		startTimestamp: effectiveEvent?.startTimestamp ?? new Date(calendarMatch.matchDate).getTime() / 1e3,
		kickoffFormatted: formatKickoff(effectiveEvent?.startTimestamp ?? new Date(calendarMatch.matchDate).getTime() / 1e3),
		home,
		away,
		squadPlayers,
		squadPlayerCount: squadPlayers.length,
		events,
		important: squadPlayers.length > 0,
		notes: [],
		lineups
	};
	if (!sofaEvent) match.notes.push("Sin datos en vivo: no se encontró el partido en SofaScore.");
	try {
		match.summary = await fetchExternalMatchSummary(match) ?? generateMatchSummary(match);
	} catch {
		match.summary = generateMatchSummary(match);
	}
	return {
		match,
		fetchNotes
	};
}
async function buildMatchesForWeek({ token, teamId, week, calendar, teamData }) {
	const notes = [];
	const teamsCatalog = await fetchTeamsCatalog(token);
	const officialTeams = teamsCatalog.map((t) => ({
		id: t.id,
		name: t.name
	}));
	const teamsById = new Map(teamsCatalog.map((t) => [t.id, t]));
	if (officialTeams.length === 0) notes.push("No se pudo cargar el catálogo oficial de equipos; el cruce con SofaScore está desactivado.");
	const timestamps = calendar.map((m) => new Date(m.matchDate).getTime() / 1e3);
	const minTs = timestamps.length > 0 ? Math.min(...timestamps) : 0;
	const maxTs = timestamps.length > 0 ? Math.max(...timestamps) : 0;
	const canQuerySofa = officialTeams.length > 0 && calendar.length > 0;
	const [roundEvents, sofaWindow] = canQuerySofa ? await Promise.all([fetchLaLigaEventsRound(week), fetchLaLigaEventsWindow(minTs - MATCH_WINDOW_HOURS * 3600, maxTs + MATCH_WINDOW_HOURS * 3600)]) : [[], null];
	const sofaEvents = /* @__PURE__ */ new Map();
	for (const event of [...roundEvents, ...sofaWindow?.events ?? []]) sofaEvents.set(event.id, event);
	if (canQuerySofa && sofaEvents.size === 0) notes.push("No se pudieron obtener eventos de SofaScore para la jornada.");
	const allSofaEvents = [...sofaEvents.values()];
	const matchTeam = buildTeamMatcher(officialTeams);
	const ownPlayers = teamData.players.map((p) => p.playerMaster);
	const enrichedMatches = [];
	for (let i = 0; i < calendar.length; i += ENRICH_CONCURRENCY) {
		const chunk = calendar.slice(i, i + ENRICH_CONCURRENCY);
		const results = await Promise.all(chunk.map((calendarMatch) => buildEnrichedMatch(calendarMatch, findSofaEvent(calendarMatch, allSofaEvents, teamsById, matchTeam), ownPlayers, teamsById)));
		for (const { match, fetchNotes } of results) {
			enrichedMatches.push(match);
			notes.push(...fetchNotes);
		}
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
		const weekParam = url.searchParams.get("week");
		const requestedWeek = weekParam !== null ? parseInt(weekParam, 10) : null;
		if (weekParam !== null && !Number.isFinite(requestedWeek)) return new Response(JSON.stringify({ error: "week must be a number" }), { status: 400 });
		const token = await getToken(cookies, session);
		if (!token) return new Response(JSON.stringify({ error: "No token configured" }), { status: 401 });
		const [teamData, week] = await Promise.all([fetchOfficialAPI(`${CMP}/leagues/${leagueId}/teams/${teamId}`, token), fetchOfficialAPI(`${CMP}/week/current`, token)]);
		const currentWeek = week?.number ?? week?.weekNumber ?? 1;
		const selectedWeek = requestedWeek === null ? currentWeek : Math.min(Math.max(requestedWeek, 1), currentWeek);
		const { matches, notes } = await buildMatchesForWeek({
			token,
			teamId,
			week: selectedWeek,
			calendar: await fetchOfficialAPI(`${CMP}/calendar`, token, { weekNumber: String(selectedWeek) }),
			teamData
		});
		const sorted = sortMatches(matches);
		const important = sorted.filter((m) => m.important);
		const normal = sorted.filter((m) => !m.important);
		const response = {
			week: selectedWeek,
			currentWeek,
			availableWeeks: Array.from({ length: currentWeek }, (_, i) => i + 1),
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
