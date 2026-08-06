import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
import { n as fetchOfficialAPI, r as getToken, t as CMP } from "./api-proxy_CJ5fp98A.mjs";
import { a as buildPositionAverages, c as estimatePointsDetailed, f as buildShrinkagePriors, i as computeOptimalLineup, n as fetchTeamElos, o as buildTeamStrength, p as buildTeamTiers, r as fetchAvailableFormations, t as fetchProbableLineups, y as combinedSignal } from "./jornadaperfecta_BETVXtqM.mjs";
import { i as fetchTeamsMaster, t as buildTeamMatcher } from "./team-names_DwPbX-En.mjs";
import { t as fetchConfirmedLineups } from "./sofascore_BdUL4Ys8.mjs";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
//#region src/lib/engine/coach-points.ts
/**
* Estimador MVP de puntos del entrenador para una jornada.
*
* En LALIGA FANTASY el entrenador puntúa según el resultado de su equipo real:
* victoria +5, empate +3, derrota +1, más un bonus/malus por goles encajados.
* Como aún no tenemos xG de fuentes accesibles (diferido, §Fase 1), usamos
* los ratings Elo de ClubElo para estimar la probabilidad de resultado y un
* proxy simple de goles esperados encajados. Es un modelo conservador que se
* calibrará con el track record de jornadas reales.
*/
var HOME_ELO_ADVANTAGE = 100;
var DEFAULT_DRAW_PROBABILITY = .25;
var BASE_GOALS_CONCEDED = 1.3;
var GOALS_SENSITIVITY = .006;
/** Puntos que otorga el entrenador según goles encajados (reglas aproximadas). */
function pointsByGoalsConceded(goals) {
	if (goals === 0) return 5;
	if (goals === 1) return 3;
	if (goals === 2) return 1;
	if (goals === 3) return 0;
	return -(goals - 3);
}
/** Probabilidad de Poisson para k eventos con media lambda. */
function poisson(k, lambda) {
	return Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k);
}
function factorial(n) {
	if (n <= 1) return 1;
	let result = 1;
	for (let i = 2; i <= n; i++) result *= i;
	return result;
}
function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}
function round1$1(value) {
	return Math.round(value * 10) / 10;
}
function predictCoachPoints(teamId, matches, teamElos) {
	const homeMatch = matches.find((m) => m.localId === teamId);
	const awayMatch = matches.find((m) => m.visitorId === teamId);
	const match = homeMatch ?? awayMatch;
	const isHome = !!homeMatch;
	if (!match) return {
		teamId,
		expectedPoints: 0,
		source: "fallback",
		notes: ["El equipo descansa esta jornada."]
	};
	const opponentId = isHome ? match.visitorId : match.localId;
	const ownElo = teamElos?.get(teamId);
	const oppElo = teamElos?.get(opponentId);
	if (ownElo === void 0 || oppElo === void 0) return {
		teamId,
		expectedPoints: 3,
		source: "fallback",
		notes: ["Sin ratings Elo disponibles: estimación base."]
	};
	const diff = ownElo - oppElo + (isHome ? HOME_ELO_ADVANTAGE : -100);
	const pWinBase = 1 / (1 + Math.pow(10, -diff / 400));
	const pDraw = DEFAULT_DRAW_PROBABILITY;
	const pWin = clamp(pWinBase - pDraw / 2, .05, .7);
	const pLoss = clamp(1 - pWin - pDraw, .05, .7);
	const expectedResultPoints = pWin * 5 + pDraw * 3 + pLoss * 1;
	const expectedGoalsConceded = clamp(BASE_GOALS_CONCEDED - diff * GOALS_SENSITIVITY, .5, 2.5);
	let expectedGoalsPoints = 0;
	for (let g = 0; g <= 6; g++) expectedGoalsPoints += poisson(g, expectedGoalsConceded) * pointsByGoalsConceded(g);
	const tailProbability = 1 - Array.from({ length: 7 }, (_, i) => poisson(i, expectedGoalsConceded)).reduce((a, b) => a + b, 0);
	expectedGoalsPoints += tailProbability * -3;
	return {
		teamId,
		expectedPoints: round1$1(expectedResultPoints + expectedGoalsPoints),
		source: "elo-result",
		notes: [
			`Elo ${ownElo.toFixed(0)} vs ${oppElo.toFixed(0)} (${isHome ? "local" : "visitante"}).`,
			`P(V)=${(pWin * 100).toFixed(0)}%, P(E)=${(pDraw * 100).toFixed(0)}%, P(D)=${(pLoss * 100).toFixed(0)}%.`,
			`Goles esperados encajados ≈ ${expectedGoalsConceded.toFixed(1)}.`
		]
	};
}
//#endregion
//#region src/lib/analysis/team-score-predictor.ts
var BAD_NEWS_CONFIDENCE = .6;
var COACH_POSITION_ID = 5;
var BENCH_SIZE = 5;
function isFieldPlayer(p) {
	return p.positionId !== COACH_POSITION_ID;
}
function isHealthyForLineup(p, context) {
	if (p.playerStatus !== "ok") return false;
	const external = combinedSignal(context?.externalSignals?.[p.id] || []);
	return !(external.signal === "sell" && external.confidence >= BAD_NEWS_CONFIDENCE);
}
function toScoreEntry(player, calendar, context, isCaptain = false, isCoach = false) {
	const pred = estimatePointsDetailed(player, calendar, context);
	return {
		player,
		xp: pred.xp,
		expectedPoints: pred.riskAdjustedXp,
		riskAdjustedXp: pred.riskAdjustedXp,
		expectedMinutes: pred.expectedMinutes,
		pStarter: pred.pStarter,
		source: pred.source,
		isCaptain,
		isCoach
	};
}
function worstDataQuality(levels) {
	if (levels.includes("low")) return "low";
	if (levels.includes("medium")) return "medium";
	return "high";
}
function hasRealLineup(lineup) {
	return (lineup.formation.goalkeeper?.length ?? 0) + (lineup.formation.defender?.length ?? 0) + (lineup.formation.midfielder?.length ?? 0) + (lineup.formation.attacker?.length ?? 0) >= 10;
}
function inferRivalLineup(players, calendar, formations, context, captainEnabled) {
	return computeOptimalLineup({
		squad: players,
		calendar,
		formations,
		context,
		captainEnabled
	});
}
function buildLineupFromOptimal(optimal, calendar, context, inferred = true) {
	const captainId = optimal.captain?.player.id;
	const starters = optimal.starters.map((e) => toScoreEntry(e.player, calendar, context, e.player.id === captainId));
	const bench = optimal.bench.map((e) => toScoreEntry(e.player, calendar, context));
	const captain = starters.find((s) => s.isCaptain);
	const fieldExpected = starters.reduce((sum, s) => sum + s.expectedPoints, 0);
	const captainBonus = captain ? captain.expectedPoints : 0;
	const benchExpected = bench.reduce((sum, b) => sum + b.expectedPoints, 0);
	const totalExpected = fieldExpected + captainBonus;
	const allLevels = [...starters, ...bench].map((s) => {
		return s.source === "components" ? "high" : s.source === "season-average" ? "medium" : "low";
	});
	if (inferred) allLevels.push("low");
	const notes = [];
	if (inferred) notes.push("Alineación inferida desde la plantilla (la API no expone la alineación rival).");
	if (optimal.degraded) notes.push("La predicción usa jugadores con dudas porque no había suficientes sanos.");
	return {
		formation: optimal.formation,
		starters,
		bench,
		captain,
		coach: void 0,
		fieldExpected: round1(fieldExpected),
		captainBonus: round1(captainBonus),
		coachPoints: 0,
		benchExpected: round1(benchExpected),
		totalExpected: round1(totalExpected),
		dataQuality: {
			level: worstDataQuality(allLevels),
			notes
		},
		degraded: optimal.degraded ?? false,
		inferred
	};
}
function buildLineupFromCurrentLineup(currentLineup, players, calendar, context, captainEnabled) {
	const starterEntries = [
		...currentLineup.formation.goalkeeper || [],
		...currentLineup.formation.defender || [],
		...currentLineup.formation.midfielder || [],
		...currentLineup.formation.attacker || []
	];
	const starterIds = new Set(starterEntries.map((e) => e.playerMaster.id));
	const starters = starterEntries.map((e) => toScoreEntry(e.playerMaster, calendar, context));
	const starterScores = captainEnabled ? starters.map((s) => ({
		...s,
		isCaptain: false
	})) : starters;
	let captain;
	if (captainEnabled && starterScores.length > 0) {
		captain = {
			...starterScores.reduce((a, b) => a.expectedPoints > b.expectedPoints ? a : b),
			isCaptain: true
		};
		const idx = starters.findIndex((s) => s.player.id === captain.player.id);
		if (idx >= 0) starters[idx] = captain;
	}
	const bench = players.map((tp) => tp.playerMaster).filter(isFieldPlayer).filter((p) => isHealthyForLineup(p, context)).filter((p) => !starterIds.has(p.id)).map((p) => toScoreEntry(p, calendar, context)).sort((a, b) => b.expectedPoints - a.expectedPoints).slice(0, BENCH_SIZE);
	const fieldExpected = starters.reduce((sum, s) => sum + s.expectedPoints, 0);
	const captainBonus = captain ? captain.expectedPoints : 0;
	const benchExpected = bench.reduce((sum, b) => sum + b.expectedPoints, 0);
	const totalExpected = fieldExpected + captainBonus;
	const allLevels = [...starters, ...bench].map((s) => {
		return s.source === "components" ? "high" : s.source === "season-average" ? "medium" : "low";
	});
	const degraded = starters.some((s) => s.player.playerStatus !== "ok");
	const notes = ["Alineación real del equipo."];
	if (degraded) notes.push("Algún titular no está al 100% según la API; los puntos esperados ya están penalizados.");
	return {
		formation: "4-4-2",
		starters,
		bench,
		captain,
		coach: void 0,
		fieldExpected: round1(fieldExpected),
		captainBonus: round1(captainBonus),
		coachPoints: 0,
		benchExpected: round1(benchExpected),
		totalExpected: round1(totalExpected),
		dataQuality: {
			level: worstDataQuality(allLevels),
			notes
		},
		degraded,
		inferred: false
	};
}
function guessFormation(starters) {
	const counts = {
		1: 0,
		2: 0,
		3: 0,
		4: 0
	};
	for (const s of starters) counts[s.player.positionId] = (counts[s.player.positionId] || 0) + 1;
	return `${counts[2] ?? 0}-${counts[3] ?? 0}-${counts[4] ?? 0}`;
}
function predictTeamScore(input) {
	const { teamId, managerId, managerName, teamValue, players, currentLineup, calendar, formations, context, captainEnabled, coachEnabled, teamElos } = input;
	let predictedLineup;
	if (currentLineup && hasRealLineup(currentLineup)) {
		predictedLineup = buildLineupFromCurrentLineup(currentLineup, players, calendar, context, captainEnabled);
		predictedLineup.formation = guessFormation(predictedLineup.starters);
	} else {
		const optimal = inferRivalLineup(players, calendar, formations, context, captainEnabled);
		if (!optimal) {
			predictedLineup = buildLineupFromCurrentLineup({ formation: {
				goalkeeper: [],
				defender: [],
				midfielder: [],
				attacker: []
			} }, players, calendar, context, captainEnabled);
			predictedLineup.inferred = true;
			predictedLineup.dataQuality.notes.push("No se pudo inferir una formación válida para este rival.");
			predictedLineup.dataQuality.level = "low";
		} else predictedLineup = buildLineupFromOptimal(optimal, calendar, context, true);
	}
	const coachPlayer = players.find((tp) => tp.playerMaster.positionId === COACH_POSITION_ID)?.playerMaster;
	let coachPrediction;
	if (coachEnabled && coachPlayer) {
		coachPrediction = predictCoachPoints(teamId, calendar, teamElos);
		predictedLineup.coach = toScoreEntry(coachPlayer, calendar, context, false, true);
		predictedLineup.coach.expectedPoints = coachPrediction.expectedPoints;
		predictedLineup.coach.xp = coachPrediction.expectedPoints;
		predictedLineup.coach.riskAdjustedXp = coachPrediction.expectedPoints;
		predictedLineup.coachPoints = coachPrediction.expectedPoints;
		predictedLineup.totalExpected = round1(predictedLineup.totalExpected + coachPrediction.expectedPoints);
	} else coachPrediction = {
		teamId,
		expectedPoints: 0,
		source: "fallback",
		notes: coachEnabled ? ["No se encontró entrenador en la plantilla."] : ["Entrenador desactivado en la liga."]
	};
	return {
		teamId,
		managerId,
		managerName,
		teamValue,
		predictedLineup,
		coachPrediction
	};
}
function round1(value) {
	return Math.round(value * 10) / 10;
}
//#endregion
//#region src/lib/engine/score-predictions-persistence.ts
/**
* Persistencia de predicciones de puntuación por equipo de liga.
*
* - snapshot por jornada: `data/score-predictions/{leagueId}-w{week}.json`
*   (sobrescrito con la última predicción, permite consultar el estado actual).
* - histórico append-only: `data/score-predictions/history.jsonl`
*   (una línea por equipo/jornada; deduplicado para conservar solo la última
*   predicción de cada jornada).
*/
var SCORE_DIR = path.join(process.cwd(), "data", "score-predictions");
function snapshotFile(leagueId, week) {
	return path.join(SCORE_DIR, `${leagueId}-w${week}.json`);
}
var HISTORY_FILE = path.join(SCORE_DIR, "history.jsonl");
async function saveScorePredictions(leagueId, week, response) {
	await mkdir(SCORE_DIR, { recursive: true });
	await writeFile(snapshotFile(leagueId, week), JSON.stringify(response, null, 2));
}
async function appendScorePredictionHistory(response) {
	await mkdir(SCORE_DIR, { recursive: true });
	const records = response.predictions.map((p) => ({
		leagueId: response.leagueId,
		week: response.week,
		teamId: p.teamId,
		managerName: p.managerName,
		generatedAt: response.generatedAt,
		totalExpected: p.predictedLineup.totalExpected,
		fieldExpected: p.predictedLineup.fieldExpected,
		captainBonus: p.predictedLineup.captainBonus,
		coachPoints: p.predictedLineup.coachPoints,
		benchExpected: p.predictedLineup.benchExpected,
		dataQuality: p.predictedLineup.dataQuality.level,
		inferred: p.predictedLineup.inferred,
		degraded: p.predictedLineup.degraded
	}));
	const existing = await readJsonl(HISTORY_FILE);
	const known = new Set(existing.map((r) => `${r.leagueId}:${r.week}:${r.teamId}`));
	const fresh = records.filter((r) => !known.has(`${r.leagueId}:${r.week}:${r.teamId}`));
	if (fresh.length === 0) return;
	const body = fresh.map((r) => JSON.stringify(r)).join("\n") + "\n";
	await writeFile(HISTORY_FILE, body, { flag: "a" });
}
async function loadScorePredictionHistory(leagueId, week) {
	return (await readJsonl(HISTORY_FILE)).filter((r) => (!leagueId || r.leagueId === leagueId) && (week === void 0 || r.week === week));
}
async function readJsonl(file) {
	try {
		return (await readFile(file, "utf8")).split("\n").filter((line) => line.trim().length > 0).map((line) => JSON.parse(line));
	} catch {
		return [];
	}
}
//#endregion
//#region src/pages/api/score-predictions.ts
var score_predictions_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
async function withConcurrency(items, fn, concurrency = 5) {
	const queue = [...items];
	const running = /* @__PURE__ */ new Set();
	while (queue.length > 0 || running.size > 0) {
		while (running.size < concurrency && queue.length > 0) {
			const promise = fn(queue.shift()).finally(() => running.delete(promise));
			running.add(promise);
		}
		if (running.size > 0) await Promise.race(running);
	}
}
async function fetchWithRetry(fn) {
	try {
		return await fn();
	} catch (error) {
		await new Promise((resolve) => setTimeout(resolve, 600));
		return fn();
	}
}
var GET = async ({ url, cookies, session }) => {
	try {
		const leagueId = url.searchParams.get("leagueId");
		const teamIdParam = url.searchParams.get("teamId");
		if (!leagueId || !teamIdParam) return new Response(JSON.stringify({ error: "leagueId and teamId required" }), { status: 400 });
		const teamId = parseInt(teamIdParam, 10);
		const token = await getToken(cookies, session);
		if (!token) return new Response(JSON.stringify({ error: "No token configured" }), { status: 401 });
		const [leagues, teamData, ownLineup, money, standing, week, allPlayers] = await Promise.all([
			fetchOfficialAPI(`${CMP}/leagues`, token),
			fetchOfficialAPI(`${CMP}/leagues/${leagueId}/teams/${teamId}`, token),
			fetchOfficialAPI(`${CMP}/teams/${teamId}/lineup`, token),
			fetchOfficialAPI(`${CMP}/teams/${teamId}/money`, token),
			fetchOfficialAPI(`${CMP}/leagues/${leagueId}/standing`, token),
			fetchOfficialAPI(`${CMP}/week/current`, token),
			fetchOfficialAPI(`${CMP}/players`, token)
		]);
		const league = leagues.find((l) => l.id === leagueId);
		if (!league) return new Response(JSON.stringify({ error: "League not found" }), { status: 404 });
		const currentWeek = week?.number ?? week?.weekNumber ?? 1;
		const calendar = await fetchOfficialAPI(`${CMP}/calendar`, token, { weekNumber: String(currentWeek) });
		const officialTeams = await fetchTeamsMaster(token);
		const teamElos = officialTeams.length > 0 ? await fetchTeamElos(officialTeams) : null;
		const probableData = officialTeams.length > 0 ? await fetchProbableLineups(officialTeams) : null;
		const probableLineups = /* @__PURE__ */ new Map();
		if (probableData) {
			const matchTeam = buildTeamMatcher(officialTeams);
			for (const match of probableData.matches) for (const lineup of match.lineups) {
				const lineupTeamId = matchTeam(lineup.sourceTeamName);
				if (lineupTeamId !== null) probableLineups.set(lineupTeamId, lineup);
			}
		}
		const confirmedList = await fetchConfirmedLineups();
		const confirmedLineups = /* @__PURE__ */ new Map();
		if (confirmedList.length > 0 && officialTeams.length > 0) {
			const matchTeam = buildTeamMatcher(officialTeams);
			for (const lineup of confirmedList) {
				const lineupTeamId = matchTeam(lineup.sourceTeamName);
				if (lineupTeamId !== null) confirmedLineups.set(lineupTeamId, lineup);
			}
		}
		const formations = await fetchAvailableFormations(token, league.config?.premiumFeatures?.formations === true);
		const captainEnabled = league.config?.premiumFeatures?.captain === true;
		const coachEnabled = league.config?.premiumFeatures?.coach === true;
		const teamTiers = buildTeamTiers(teamElos?.eloByTeamId ?? /* @__PURE__ */ new Map());
		const estimatorContext = {
			teamStrength: buildTeamStrength(allPlayers),
			positionAverages: buildPositionAverages(allPlayers),
			weekNumber: currentWeek,
			teamElos: teamElos?.eloByTeamId,
			probableLineups,
			injuryReport: probableData?.injuries,
			shrinkagePriors: buildShrinkagePriors(allPlayers, teamTiers),
			teamTiers,
			confirmedLineups
		};
		const teamDataById = /* @__PURE__ */ new Map();
		teamDataById.set(teamId, teamData);
		const lineupsById = /* @__PURE__ */ new Map();
		lineupsById.set(teamId, ownLineup);
		await withConcurrency(standing.filter((entry) => Number(entry.team.id) !== teamId), async (entry) => {
			const rivalTeamId = Number(entry.team.id);
			try {
				const data = await fetchWithRetry(() => fetchOfficialAPI(`${CMP}/leagues/${leagueId}/teams/${rivalTeamId}`, token));
				teamDataById.set(rivalTeamId, data);
				try {
					const lineup = await fetchOfficialAPI(`${CMP}/teams/${rivalTeamId}/lineup`, token);
					lineupsById.set(rivalTeamId, lineup);
				} catch {}
			} catch (error) {
				const message = error instanceof Error ? error.message : "unknown";
				console.warn(`[score-predictions] Failed to load rival ${rivalTeamId}: ${message}`);
			}
		}, 5);
		const notes = [];
		if (!teamElos) notes.push("Sin ratings Elo: las predicciones de entrenador y fixture usan fallback.");
		if (!probableData) notes.push("Sin onces probables de Jornada Perfecta: los minutos esperados usan histórico o valores por defecto.");
		const predictions = [];
		for (const entry of standing) {
			const id = Number(entry.team.id);
			const data = teamDataById.get(id);
			if (!data) {
				notes.push(`No se pudo cargar la plantilla de ${entry.team.manager?.managerName ?? id}.`);
				continue;
			}
			const isOwn = id === teamId;
			const prediction = predictTeamScore({
				teamId: id,
				managerId: entry.team.managerId,
				managerName: entry.team.manager?.managerName ?? `Equipo ${id}`,
				teamValue: entry.team.teamValue,
				players: data.players,
				currentLineup: lineupsById.get(id),
				calendar,
				formations,
				context: estimatorContext,
				captainEnabled,
				coachEnabled,
				teamElos: teamElos?.eloByTeamId
			});
			predictions.push(prediction);
			if (!isOwn && !lineupsById.has(id)) notes.push(`Alineación de ${prediction.managerName} inferida desde la plantilla.`);
		}
		predictions.sort((a, b) => b.predictedLineup.totalExpected - a.predictedLineup.totalExpected);
		const response = {
			week: currentWeek,
			leagueId,
			generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
			coachEnabled,
			captainEnabled,
			benchEnabled: true,
			predictions,
			notes: [...new Set(notes)]
		};
		try {
			await saveScorePredictions(leagueId, currentWeek, response);
			await appendScorePredictionHistory(response);
		} catch (persistError) {
			console.warn("[score-predictions] persist failed:", persistError instanceof Error ? persistError.message : persistError);
		}
		const history = await loadScorePredictionHistory(leagueId);
		return new Response(JSON.stringify({
			...response,
			history
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error("[score-predictions] Error:", message);
		return new Response(JSON.stringify({ error: message }), { status: 500 });
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/score-predictions@_@ts
var page = () => score_predictions_exports;
//#endregion
export { page };
