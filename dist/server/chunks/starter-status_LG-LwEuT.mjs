import { n as fetchOfficialAPI, t as CMP } from "./api-proxy_CJ5fp98A.mjs";
import { c as estimatePointsDetailed, s as estimatePoints, y as combinedSignal } from "./jornadaperfecta_BETVXtqM.mjs";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
//#region src/lib/recommendations/captain.ts
/**
* Recomendación de capitán: el jugador del once con más puntos esperados.
*
* El score es el xP del modelo SIN factores extra: localía, estado físico,
* titularidad, noticias y dificultad del rival ya están aplicados una vez en
* el estimador (§2.1.8 del diseño: aquí se elimina la doble/triple
* contabilidad que tenía el motor anterior). El filtro de salud solo ordena
* (un capitán debe estar disponible), no vuelve a penalizar.
*/
function recommendCaptain(analysis, estimatorContext) {
	const { lineup, calendar, externalSignals, starterInfo } = analysis;
	const candidates = [
		...lineup.formation.goalkeeper || [],
		...lineup.formation.defender || [],
		...lineup.formation.midfielder || [],
		...lineup.formation.attacker || []
	].map((entry) => {
		const player = entry.playerMaster;
		const isHome = calendar.some((m) => m.localId === Number(player.teamId) || m.localId === Number(player.team?.id));
		const isHealthy = player.playerStatus === "ok";
		const expected = estimatePoints(player, calendar, estimatorContext);
		const external = combinedSignal(externalSignals[player.id] || []);
		const hasBadNews = external.signal === "sell" && external.confidence >= .6;
		const starterScore = starterInfo[player.id]?.score;
		const reasons = [];
		reasons.push(`${expected.toFixed(1)} pts esperados`);
		if (isHome) reasons.push("juega en casa");
		else reasons.push("juega fuera");
		if (!isHealthy) reasons.push(`está ${statusText(player.playerStatus)}`);
		if (hasBadNews) reasons.push("noticias negativas recientes");
		if (starterScore !== void 0 && starterScore < .35) reasons.push("suplente habitual");
		else if (starterScore !== void 0 && starterScore >= .8) reasons.push("titular habitual");
		return {
			player,
			expectedPoints: expected,
			isHome,
			isHealthy,
			score: expected,
			reasoning: reasons.join(" · ")
		};
	});
	candidates.sort((a, b) => b.score - a.score);
	const healthyOnes = candidates.filter((c) => c.isHealthy);
	const usable = healthyOnes.length > 0 ? healthyOnes : candidates;
	const captain = usable[0] || candidates[0];
	const alternatives = usable.slice(1, 3);
	return {
		captain: captain || alternatives[0],
		alternatives
	};
}
function statusText(status) {
	switch (status) {
		case "doubtful": return "dudoso";
		case "injured": return "lesionado";
		case "out_of_league": return "fuera de la liga";
		default: return status;
	}
}
//#endregion
//#region src/lib/fantasy/market-sellers.ts
/**
* Construye un mapa playerId -> equipo fantasy propietario a partir de la
* plantilla propia y las plantillas rivales. Se usa para saber quién ha puesto
* en venta a un jugador cuando la API de mercado no lo incluye.
*/
function buildMarketOwnerMap(ownTeam, rivals, ownTeamId) {
	const map = /* @__PURE__ */ new Map();
	for (const tp of ownTeam.players ?? []) {
		const player = tp.playerMaster;
		if (!player?.id) continue;
		const managerName = tp.manager?.managerName || "Tu equipo";
		map.set(player.id, {
			teamId: ownTeamId ?? 0,
			teamName: "Tu equipo",
			managerName
		});
	}
	for (const rival of rivals) for (const tp of rival.players ?? []) {
		const player = tp.playerMaster;
		if (!player?.id) continue;
		const managerName = tp.manager?.managerName || rival.managerName;
		map.set(player.id, {
			teamId: rival.teamId,
			teamName: rival.managerName,
			managerName
		});
	}
	return map;
}
/**
* Enriquece la lista de jugadores de mercado añadiendo el vendedor (manager) y
* ajustando el discriminador cuando la API no lo devuelve. Utiliza las
* plantillas de la liga como fuente de verdad para determinar el propietario.
*/
function enrichMarketSellers(market, ownTeam, rivals, ownTeamId) {
	const ownerMap = buildMarketOwnerMap(ownTeam, rivals, ownTeamId);
	return market.map((entry) => {
		if (entry.sellerTeam?.manager?.managerName) return entry;
		const owner = ownerMap.get(entry.playerMaster.id);
		if (!owner) return entry;
		return {
			...entry,
			discr: "marketPlayerTeam",
			sellerTeam: { manager: { managerName: owner.managerName } }
		};
	});
}
//#endregion
//#region src/lib/analysis/league-analysis.ts
var POSITION_ORDER = {
	1: "Portero",
	2: "Defensa",
	3: "Centrocampista",
	4: "Delantero",
	5: "Entrenador"
};
var POSITION_COLORS = {
	1: "#f59e0b",
	2: "#3b82f6",
	3: "#10b981",
	4: "#ef4444",
	5: "#6366f1"
};
async function withConcurrency$1(items, fn, concurrency = 5) {
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
/** Reintenta una vez tras 600 ms (la API devuelve 403 transitorios en ráfagas). */
async function fetchWithRetry(fn) {
	try {
		return await fn();
	} catch (error) {
		await new Promise((resolve) => setTimeout(resolve, 600));
		return fn();
	}
}
async function buildLeagueAnalysis(league, teamData, lineup, money, market, standing, week, calendar, allPlayers, deps) {
	const ownTeamId = league.team.id;
	const rivals = [];
	await withConcurrency$1(standing.filter((entry) => Number(entry.team.id) !== ownTeamId), async (entry) => {
		const teamId = Number(entry.team.id);
		try {
			const data = await fetchWithRetry(() => deps.fetchTeamData(league.id, teamId));
			let teamMoney = null;
			try {
				const rivalMoney = await deps.fetchTeamMoney(teamId);
				const value = Number(rivalMoney?.teamMoney);
				if (Number.isFinite(value)) teamMoney = value;
			} catch {}
			rivals.push({
				teamId,
				managerId: entry.team.managerId,
				managerName: entry.team.manager?.managerName || `Equipo ${teamId}`,
				teamValue: entry.team.teamValue,
				teamMoney,
				players: data.players || []
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : "unknown";
			console.warn(`[league-analysis] Failed to load rival ${teamId}: ${message}`);
		}
	}, 5);
	const ownNeeds = computeOwnNeeds(teamData.players, lineup);
	const rivalNeeds = computeRivalNeeds(rivals);
	const aggregates = computeAggregates(rivals, market, teamData, money);
	return {
		league,
		teamData,
		lineup,
		money,
		market: enrichMarketSellers(market, teamData, rivals, ownTeamId),
		standing,
		week,
		calendar,
		allPlayers,
		rivals,
		rivalNeeds,
		ownNeeds,
		clauseRisks: [],
		captain: recommendCaptain({
			league,
			teamData,
			lineup,
			money,
			market,
			standing,
			week,
			calendar,
			allPlayers,
			rivals,
			rivalNeeds,
			ownNeeds,
			clauseRisks: [],
			aggregates,
			externalSignals: {},
			starterInfo: {}
		}),
		aggregates,
		externalSignals: {},
		starterInfo: {}
	};
}
function computeOwnNeeds(players, lineup) {
	const lineupEntries = [
		...lineup.formation.goalkeeper || [],
		...lineup.formation.defender || [],
		...lineup.formation.midfielder || [],
		...lineup.formation.attacker || []
	];
	const lineupIds = new Set(lineupEntries.map((e) => e.playerMaster.id));
	const counts = {};
	for (const p of players) {
		const pos = p.playerMaster.positionId;
		if (!counts[pos]) counts[pos] = {
			total: 0,
			healthy: 0,
			lineup: 0
		};
		counts[pos].total += 1;
		if (p.playerMaster.playerStatus === "ok") counts[pos].healthy += 1;
		if (lineupIds.has(p.playerMaster.id)) counts[pos].lineup += 1;
	}
	const idealMin = {
		1: 2,
		2: 5,
		3: 6,
		4: 4,
		5: 1
	};
	return Object.entries(counts).map(([posId, count]) => {
		const id = Number(posId);
		const recommendedMin = idealMin[id] ?? 2;
		const needScore = Math.min(1, Math.max(0, (recommendedMin - count.healthy) / recommendedMin));
		return {
			positionId: id,
			positionName: POSITION_ORDER[id] || "Otro",
			ownCount: count.total,
			ownHealthyCount: count.healthy,
			recommendedMin,
			needScore
		};
	});
}
function computeRivalNeeds(rivals) {
	const needs = [];
	const idealMin = {
		1: 2,
		2: 5,
		3: 6,
		4: 4,
		5: 1
	};
	for (const rival of rivals) {
		const counts = {};
		for (const p of rival.players) {
			if (p.playerMaster.playerStatus !== "ok") continue;
			counts[p.playerMaster.positionId] = (counts[p.playerMaster.positionId] || 0) + 1;
		}
		for (const [posIdStr, min] of Object.entries(idealMin)) {
			const posId = Number(posIdStr);
			const healthyCount = counts[posId] || 0;
			const needScore = Math.min(1, Math.max(0, (min - healthyCount) / min));
			if (needScore > 0) needs.push({
				teamId: rival.teamId,
				managerId: rival.managerId,
				managerName: rival.managerName,
				positionId: posId,
				positionName: POSITION_ORDER[posId] || "Otro",
				needScore
			});
		}
	}
	return needs;
}
function computeAggregates(rivals, market, ownTeam, ownMoney) {
	const allTeamPlayers = [...ownTeam.players];
	let totalLeagueValue = ownMoney.teamMoney;
	let totalMoneyAvailable = ownMoney.teamMoney;
	for (const rival of rivals) {
		totalLeagueValue += rival.teamValue;
		totalMoneyAvailable += rival.teamMoney ?? 0;
		allTeamPlayers.push(...rival.players);
	}
	const positionDistribution = {};
	for (const p of allTeamPlayers) {
		const pos = p.playerMaster.positionId;
		if (!positionDistribution[pos]) positionDistribution[pos] = {
			name: POSITION_ORDER[pos] || "Otro",
			count: 0,
			color: POSITION_COLORS[pos] || "#94a3b8"
		};
		positionDistribution[pos].count += 1;
	}
	const totalPoints = allTeamPlayers.map((p) => p.playerMaster.points || p.playerMaster.lastSeasonPoints || 0).reduce((sum, v) => sum + v, 0);
	return {
		totalLeagueValue,
		totalMoneyAvailable,
		totalPlayers: allTeamPlayers.length,
		playersOnSale: market.length,
		injuredPlayers: allTeamPlayers.filter((p) => p.playerMaster.playerStatus !== "ok").length,
		averageTeamValue: rivals.length > 0 ? totalLeagueValue / (rivals.length + 1) : totalLeagueValue,
		averageTeamPoints: rivals.length > 0 ? totalPoints / (rivals.length + 1) : totalPoints,
		positionDistribution
	};
}
//#endregion
//#region src/lib/analysis/tactical-scheme.ts
var BAD_NEWS_CONFIDENCE = .6;
var COACH_POSITION_ID = 5;
/** Candidatos extra por posición sobre el máximo que puede pedir una formación. */
var POSITION_POOL_MARGIN = 4;
/** Tope de seguridad del frente de Pareto al combinar posiciones. */
var FRONTIER_CAP = 400;
/**
* Presupuesto real disponible para fichar, según la fórmula documentada del
* juego: efectivo + 20% del valor de plantilla (redondeado a la baja) menos
* las pujas activas.
*/
function computeAvailableBudget(money, teamValue, activeBidsTotal = 0) {
	const cash = Number(money?.teamMoney) || 0;
	const teamValueBonus = Math.floor((Number(teamValue) || 0) * .2);
	const activeBids = Math.max(0, Number(activeBidsTotal) || 0);
	const available = Math.max(0, cash + teamValueBonus - activeBids);
	return {
		cash,
		teamValueBonus,
		activeBids,
		available,
		spent: 0,
		remaining: available
	};
}
/**
* Confianza (0-1) en la estimación de un jugador según los datos disponibles:
* media de la temporada en curso, minutos reales por jornada, noticias
* externas y puntos de la temporada pasada. Con pocas fuentes, la estimación
* se encoge hacia la media de su posición para no fiarse de datos ruidosos.
*/
function estimateConfidence(player, context) {
	let confidence = 0;
	if ((Number(player.averagePoints) || 0) > 0) confidence += .35;
	const starter = context?.starterInfo?.[player.id];
	if (starter?.source === "minutes") confidence += .35;
	else if (starter?.source === "last-season") confidence += .15;
	if ((context?.externalSignals?.[player.id] || []).length > 0) confidence += .15;
	if ((Number(player.lastSeasonPoints) || 0) > 0) confidence += .15;
	return clamp(confidence, .4, 1);
}
/**
* Construye el pool de candidatos: plantilla propia (coste 0), mercado
* (salePrice) y jugadores de rivales clausulables (buyoutClause, si la liga
* lo permite y no están blindados). Aplica el filtro de salud del optimizer
* (sanos y sin noticias muy negativas), deduplica por jugador quedándose con
* la vía más barata, descarta los inasequibles y poda por posición.
*/
function buildCandidates(input) {
	const { squad, market, rivals, buyoutClauseEnabled, calendar, formations, context, budget } = input;
	const ownIds = new Set(squad.map((tp) => tp.playerMaster.id));
	const byId = /* @__PURE__ */ new Map();
	const addCandidate = (player, source, cost, sellerManagerName) => {
		if (player.positionId === COACH_POSITION_ID) return;
		const existing = byId.get(player.id);
		if (existing && existing.cost <= cost) return;
		byId.set(player.id, {
			player,
			source,
			cost,
			expectedPoints: 0,
			rawExpectedPoints: 0,
			confidence: 0,
			pStarter: null,
			sellerManagerName
		});
	};
	for (const tp of squad) addCandidate(tp.playerMaster, "squad", 0);
	for (const mp of market) {
		if (ownIds.has(mp.playerMaster.id)) continue;
		addCandidate(mp.playerMaster, "market", Number(mp.salePrice) || 0, mp.sellerTeam?.manager?.managerName);
	}
	if (buyoutClauseEnabled) for (const rival of rivals) for (const tp of rival.players) {
		if (ownIds.has(tp.playerMaster.id) || tp.isShielded) continue;
		const clause = Number(tp.buyoutClause) || 0;
		if (clause <= 0) continue;
		addCandidate(tp.playerMaster, "clause", clause, rival.managerName);
	}
	const all = [...byId.values()];
	const healthy = all.filter((c) => isHealthy(c.player, context));
	const pool = canFillAnyFormation(healthy, formations) ? healthy : all.filter((c) => c.source === "squad" || isHealthy(c.player, context));
	for (const c of pool) {
		const prediction = estimatePointsDetailed(c.player, calendar, context);
		c.rawExpectedPoints = prediction.xp;
		c.confidence = estimateConfidence(c.player, context);
		c.expectedPoints = prediction.riskAdjustedXp;
		c.pStarter = prediction.pStarter;
	}
	const squadOnlyExpected = bestSquadOnlyTotal(pool.filter((c) => c.source === "squad"), formations);
	const byPosition = groupByPosition(pool);
	const maxNeeded = maxNeededByPosition(formations);
	const result = [];
	for (const [positionId, list] of byPosition) {
		list.sort((a, b) => b.expectedPoints - a.expectedPoints);
		const needed = maxNeeded.get(positionId) ?? 0;
		const ownSorted = list.filter((c) => c.source === "squad");
		const threshold = ownSorted.length >= needed && needed > 0 ? ownSorted[needed - 1].expectedPoints : -Infinity;
		const ownKept = ownSorted.slice(0, needed + POSITION_POOL_MARGIN);
		const externalKept = list.filter((c) => c.source !== "squad").filter((c) => c.cost <= budget && c.expectedPoints > threshold).slice(0, needed + POSITION_POOL_MARGIN);
		result.push(...ownKept, ...externalKept);
	}
	return {
		candidates: result,
		squadOnlyExpected
	};
}
/**
* Calcula el esquema táctico (formación + once) que maximiza los puntos
* esperados de la próxima jornada sin superar el presupuesto disponible,
* pudiendo incluir fichajes del mercado y clausulazos a rivales.
*
* Para cada formación se enumeran las combinaciones por posición (pool ya
* podado) y se combinan sus frentes de Pareto (coste, puntos) bajo la
* restricción de presupuesto. Gana la formación con mayor suma ajustada.
*/
function computeTacticalScheme(input) {
	const { money, teamValue, activeBidsTotal, calendar, formations, context, captainEnabled } = input;
	const budget = computeAvailableBudget(money, teamValue, activeBidsTotal);
	const { candidates, squadOnlyExpected } = buildCandidates({
		...input,
		budget: budget.available
	});
	if (candidates.length === 0 || squadOnlyExpected === void 0) return void 0;
	let best;
	for (const { formation, front } of computeFormationFronts(input)) {
		const top = front.reduce((a, b) => b.points > a.points ? b : a);
		if (!best || top.points > best.combo.points) best = {
			formation,
			combo: top
		};
	}
	if (!best) return void 0;
	const starters = [...best.combo.members].sort((a, b) => a.player.positionId - b.player.positionId || b.expectedPoints - a.expectedPoints);
	const spent = starters.reduce((sum, c) => sum + c.cost, 0);
	budget.spent = spent;
	budget.remaining = Math.max(0, budget.available - spent);
	const moves = starters.filter((c) => c.source !== "squad").map((c) => ({
		type: c.source === "market" ? "buy_market" : "pay_clause",
		player: c.player,
		cost: c.cost,
		sellerManagerName: c.sellerManagerName
	})).sort((a, b) => b.cost - a.cost);
	const captain = captainEnabled && starters.length > 0 ? starters.reduce((a, b) => b.expectedPoints > a.expectedPoints ? b : a) : void 0;
	const captainBonus = captain?.expectedPoints ?? 0;
	const squadOnlyTotal = squadOnlyExpected + (captainEnabled ? Math.max(0, ...candidates.filter((c) => c.source === "squad").map((c) => c.expectedPoints)) : 0);
	const totalExpected = round1(best.combo.points + captainBonus);
	return {
		formation: best.formation,
		starters,
		captain: captain?.player,
		totalExpected,
		squadOnlyExpected: round1(squadOnlyTotal),
		improvement: round1(best.combo.points + captainBonus - squadOnlyTotal),
		budget,
		moves,
		dataQuality: computeDataQuality(starters, input),
		candidatesConsidered: candidates.length
	};
}
function isHealthy(player, context) {
	if (player.playerStatus !== "ok") return false;
	const external = combinedSignal(context?.externalSignals?.[player.id] || []);
	return !(external.signal === "sell" && external.confidence >= BAD_NEWS_CONFIDENCE);
}
/** true si el pool cubre al menos una de las formaciones dadas. */
function canFillAnyFormation(candidates, formations) {
	const countByPosition = /* @__PURE__ */ new Map();
	for (const c of candidates) countByPosition.set(c.player.positionId, (countByPosition.get(c.player.positionId) || 0) + 1);
	for (const formation of formations) {
		const [def, mid, att] = parseFormation(formation);
		if (![
			def,
			mid,
			att
		].every((n) => Number.isFinite(n))) continue;
		if ((countByPosition.get(1) || 0) >= 1 && (countByPosition.get(2) || 0) >= def && (countByPosition.get(3) || 0) >= mid && (countByPosition.get(4) || 0) >= att) return true;
	}
	return false;
}
/** Mejor once usando solo la plantilla (todo cuesta 0: top-k por posición). */
function bestSquadOnlyTotal(candidates, formations) {
	const ownByPosition = /* @__PURE__ */ new Map();
	for (const c of candidates) {
		if (c.source !== "squad") continue;
		const list = ownByPosition.get(c.player.positionId) || [];
		list.push(c);
		ownByPosition.set(c.player.positionId, list);
	}
	for (const list of ownByPosition.values()) list.sort((a, b) => b.expectedPoints - a.expectedPoints);
	let best;
	for (const formation of formations) {
		const [defCount, midCount, attCount] = parseFormation(formation);
		if (![
			defCount,
			midCount,
			attCount
		].every((n) => Number.isFinite(n))) continue;
		const gks = ownByPosition.get(1) || [];
		const defs = ownByPosition.get(2) || [];
		const mids = ownByPosition.get(3) || [];
		const atts = ownByPosition.get(4) || [];
		if (gks.length < 1 || defs.length < defCount || mids.length < midCount || atts.length < attCount) continue;
		const total = sumTop(gks, 1) + sumTop(defs, defCount) + sumTop(mids, midCount) + sumTop(atts, attCount);
		if (best === void 0 || total > best) best = total;
	}
	return best;
}
function computeDataQuality(starters, input) {
	const avgConfidence = starters.reduce((sum, c) => sum + c.confidence, 0) / Math.max(starters.length, 1);
	const level = avgConfidence >= .75 ? "high" : avgConfidence >= .6 ? "medium" : "low";
	const notes = [];
	if (starters.filter((c) => (Number(c.player.averagePoints) || 0) > 0).length === 0) notes.push("Sin datos de la temporada en curso: las estimaciones se apoyan en la temporada pasada.");
	if (Object.keys(input.context?.starterInfo || {}).length === 0) notes.push("Sin datos de minutos por jornada: titularidad estimada por puntos de la temporada pasada.");
	if (Object.keys(input.context?.externalSignals || {}).length === 0) notes.push("Sin noticias externas: no se aplican ajustes por lesiones o sanciones de prensa.");
	if ((input.activeBidsTotal ?? 0) === 0) notes.push("Presupuesto = efectivo + 20% del valor de plantilla (pujas activas no descontadas).");
	return {
		level,
		notes
	};
}
/**
* Frentes de Pareto (coste, puntos) por formación para la semana del input.
* Es la pieza compartida entre el esquema táctico de una jornada y el
* planificador multi-jornada (§5.3).
*/
function computeFormationFronts(input) {
	const { money, teamValue, activeBidsTotal, calendar, formations, context } = input;
	const budget = computeAvailableBudget(money, teamValue, activeBidsTotal);
	const { candidates } = buildCandidates({
		...input,
		budget: budget.available
	});
	if (candidates.length === 0) return [];
	const byPosition = groupByPosition(candidates);
	const fronts = [];
	for (const formation of formations) {
		const [defCount, midCount, attCount] = parseFormation(formation);
		if (![
			defCount,
			midCount,
			attCount
		].every((n) => Number.isFinite(n))) continue;
		const groups = [
			combos(byPosition.get(1) || [], 1),
			combos(byPosition.get(2) || [], defCount),
			combos(byPosition.get(3) || [], midCount),
			combos(byPosition.get(4) || [], attCount)
		];
		if (groups.some((g) => g.length === 0)) continue;
		let frontier = pareto(groups[0], budget.available);
		for (let i = 1; i < groups.length; i++) {
			frontier = pareto(combineFrontiers(frontier, groups[i], budget.available), budget.available);
			if (frontier.length === 0) break;
		}
		if (frontier.length === 0) continue;
		fronts.push({
			formation: `${defCount}-${midCount}-${attCount}`,
			front: frontier
		});
	}
	return fronts;
}
/** Enumeración de combinaciones de tamaño k sobre el pool podado de una posición. */
function combos(candidates, k) {
	if (k <= 0) return [{
		cost: 0,
		points: 0,
		members: []
	}];
	if (candidates.length < k) return [];
	const out = [];
	const picked = [];
	const walk = (start, cost, points) => {
		if (picked.length === k) {
			out.push({
				cost,
				points,
				members: [...picked]
			});
			return;
		}
		for (let i = start; i <= candidates.length - (k - picked.length); i++) {
			picked.push(candidates[i]);
			walk(i + 1, cost + candidates[i].cost, points + candidates[i].expectedPoints);
			picked.pop();
		}
	};
	walk(0, 0, 0);
	return out;
}
/** Media de probabilidad de titularidad de un combo (ignora nulls). */
function comboPStarter(combo) {
	const values = combo.members.map((m) => m.pStarter).filter((v) => v !== null);
	return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}
/**
* Frente de Pareto (coste ↑, puntos ↑): descarta combos dominados (más
* caros y con menos puntos que otro) y los que superan el presupuesto.
* Como desempate se prefiere el combo con mayor titularidad media: evita
* recomendar suplentes cuando hay opciones de puntos similares.
*/
function pareto(list, budget) {
	const sorted = list.filter((c) => c.cost <= budget).sort((a, b) => a.cost - b.cost || b.points - a.points || comboPStarter(b) - comboPStarter(a));
	const front = [];
	let bestPoints = -Infinity;
	for (const combo of sorted) if (combo.points > bestPoints) {
		front.push(combo);
		bestPoints = combo.points;
	}
	if (front.length > FRONTIER_CAP) {
		const step = front.length / FRONTIER_CAP;
		return front.filter((_, i) => i % step < 1 || i === front.length - 1);
	}
	return front;
}
function combineFrontiers(a, b, budget) {
	const out = [];
	for (const x of a) for (const y of b) {
		const cost = x.cost + y.cost;
		if (cost > budget) continue;
		out.push({
			cost,
			points: x.points + y.points,
			members: [...x.members, ...y.members]
		});
	}
	return out;
}
function groupByPosition(candidates) {
	const map = /* @__PURE__ */ new Map();
	for (const c of candidates) {
		const list = map.get(c.player.positionId) || [];
		list.push(c);
		map.set(c.player.positionId, list);
	}
	return map;
}
function maxNeededByPosition(formations) {
	const max = /* @__PURE__ */ new Map([
		[1, 1],
		[2, 0],
		[3, 0],
		[4, 0]
	]);
	for (const formation of formations) {
		const [def, mid, att] = parseFormation(formation);
		if (![
			def,
			mid,
			att
		].every((n) => Number.isFinite(n))) continue;
		max.set(2, Math.max(max.get(2), def));
		max.set(3, Math.max(max.get(3), mid));
		max.set(4, Math.max(max.get(4), att));
	}
	return max;
}
function parseFormation(formation) {
	return formation.split(",").map((n) => parseInt(n, 10));
}
function sumTop(list, k) {
	return list.slice(0, k).reduce((sum, c) => sum + c.expectedPoints, 0);
}
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}
function round1(value) {
	return Math.round(value * 10) / 10;
}
//#endregion
//#region src/lib/clause-availability.ts
/**
* Disponibilidad de un jugador para ser clausulado.
*
* - `shielded`: el propietario lo ha blindado; no se puede clausular.
* - `locked`: la cláusula está bloqueada hasta `until`. Cubre tanto la
*   subida de cláusula reciente como las 2 semanas de protección tras un
*   clausulazo; en ambos casos el jugador no se puede clausular.
* - `available`: se puede pagar la cláusula ahora mismo.
*/
function getClauseProtection(player, now = Date.now()) {
	if (player.isShielded) return { status: "shielded" };
	if (player.buyoutClauseLockedEndTime) {
		const lockEnd = Date.parse(player.buyoutClauseLockedEndTime);
		if (!Number.isNaN(lockEnd) && lockEnd > now) return {
			status: "locked",
			until: player.buyoutClauseLockedEndTime
		};
	}
	return { status: "available" };
}
//#endregion
//#region src/lib/fantasy/activity.ts
/** Tipos que suponen gasto (compra, fichaje, clausulazo). */
var EXPENSE_TYPES = /* @__PURE__ */ new Set([
	1,
	31,
	32
]);
/** Tipo que supone ingreso (venta). */
var INCOME_TYPE = 33;
/** Tipo clausulazo (comportamiento agresivo con cláusulas). */
var CLAUSE_TYPE = 32;
/**
* Descarga las últimas páginas de actividad (35 eventos/página). Fallo
* gracioso: si el endpoint falla devuelve lista vacía y el análisis sigue
* sin este enriquecimiento.
*/
async function fetchLeagueActivity(leagueId, token, maxPages = 2) {
	const events = [];
	for (let page = 0; page < maxPages; page++) try {
		const raw = await fetchOfficialAPI(`${CMP}/leagues/${leagueId}/activity/${page}`, token);
		if (!Array.isArray(raw) || raw.length === 0) break;
		for (const e of raw) events.push({
			activityTypeId: Number(e.activityTypeId),
			userId: Number(e.user1Id),
			playerMasterId: Number(e.playerMasterId),
			amount: Number(e.amount) || 0,
			createdAt: e.createdAt
		});
	} catch (error) {
		console.warn(`[activity] fetch page ${page} failed:`, error instanceof Error ? error.message : error);
		break;
	}
	return events;
}
/**
* Flujo de mercado por manager en los últimos `windowDays` días, indexado por
* userId (manager.id). Sirve para ajustar la liquidez estimada de los rivales
* y detectar quién ataca cláusulas.
*/
function marketFlowByManager(events, windowDays = 14) {
	const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1e3;
	const flows = /* @__PURE__ */ new Map();
	for (const event of events) {
		const at = Date.parse(event.createdAt);
		if (Number.isNaN(at) || at < cutoff) continue;
		const flow = flows.get(event.userId) ?? {
			expense: 0,
			income: 0,
			clauseAttacks: 0
		};
		if (EXPENSE_TYPES.has(event.activityTypeId)) flow.expense += event.amount;
		if (event.activityTypeId === INCOME_TYPE) flow.income += event.amount;
		if (event.activityTypeId === CLAUSE_TYPE) flow.clauseAttacks += 1;
		flows.set(event.userId, flow);
	}
	return flows;
}
//#endregion
//#region src/lib/recommendations/clause-risk.ts
/**
* Poder adquisitivo de un rival con la misma regla del 20% que aplicamos a
* nuestro presupuesto (§5.1): efectivo + 20% del valor de su plantilla.
* Si la API no expone el efectivo del rival (403 suave), se usa el crédito
* del 20% ajustado por su flujo real de mercado (actividad de la liga:
* ventas recientes suman liquidez, compras la restan).
*/
function rivalSpendingPower(rival, flow) {
	if (rival.teamMoney !== null) return computeAvailableBudget({
		teamMoney: rival.teamMoney,
		teamInvestment: 0
	}, rival.teamValue).available;
	const credit = Math.floor((Number(rival.teamValue) || 0) * .2);
	if (!flow) return credit;
	return Math.max(0, credit + flow.income - flow.expense);
}
function analyzeClauseRisks(analysis, context) {
	const { teamData, rivals, calendar } = analysis;
	const results = [];
	const flowsByManager = marketFlowByManager(analysis.leagueActivity ?? []);
	const maxRivalSpendingPower = rivals.length > 0 ? Math.max(0, ...rivals.map((r) => rivalSpendingPower(r, flowsByManager.get(r.managerId)))) : 0;
	for (const teamPlayer of teamData.players) {
		const player = teamPlayer.playerMaster;
		const currentClause = Number(teamPlayer.buyoutClause) || 0;
		const marketValue = Number(player.marketValue) || 1;
		const teamValue = Number(analysis.league.team.teamValue) || 0;
		const protection = getClauseProtection(teamPlayer);
		if (protection.status !== "available") {
			results.push({
				playerId: player.id,
				nickname: player.nickname,
				currentClause,
				marketValue,
				riskScore: 0,
				rivalsThatCanAfford: 0,
				rivalNeedScore: 0,
				recommendedClause: currentClause,
				reasoning: protection.status === "shielded" ? "Está blindado: no se puede clausular." : `Cláusula bloqueada hasta ${formatDate(protection.until)}: no se puede clausular.`
			});
			continue;
		}
		const expected = estimatePoints(player, calendar, context);
		let rivalsThatCanAfford = 0;
		let clauseAttackers = 0;
		let maxNeedScore = 0;
		for (const rival of rivals) {
			const flow = flowsByManager.get(rival.managerId);
			const spendingPower = rivalSpendingPower(rival, flow);
			if (spendingPower >= currentClause) {
				rivalsThatCanAfford += 1;
				if ((flow?.clauseAttacks ?? 0) > 0) clauseAttackers += 1;
			}
			if (!rival.players.some((p) => p.playerMaster.positionId === player.positionId && p.playerMaster.playerStatus === "ok" && (Number(p.playerMaster.marketValue) || 0) >= marketValue * .6)) {
				const needScore = Math.min(1, (spendingPower + 1) / (currentClause + 1));
				if (needScore > maxNeedScore) maxNeedScore = needScore;
			}
		}
		let risk = 0;
		if (rivalsThatCanAfford > 0) risk += 35;
		if (clauseAttackers > 0) risk += 10;
		risk += Math.min(30, marketValue / currentClause * 30);
		risk += Math.min(25, expected * 4);
		risk += maxNeedScore * 20;
		if (player.playerStatus !== "ok") risk *= .5;
		risk = Math.min(100, Math.max(0, risk));
		const recommendedClause = computeRecommendedClause({
			currentClause,
			marketValue,
			maxRivalSpendingPower,
			expected,
			teamValue
		});
		const reasoningParts = [
			`${rivalsThatCanAfford} rival${rivalsThatCanAfford === 1 ? "" : "es"} puede${rivalsThatCanAfford === 1 ? "" : "n"} pagar la cláusula`,
			`valor de mercado ${formatCurrency(marketValue)}`,
			`puntos esperados ${expected.toFixed(1)}`
		];
		if (clauseAttackers > 0) reasoningParts.push(`${clauseAttackers} con clausulazos recientes`);
		if (player.playerStatus !== "ok") reasoningParts.push(`estado ${player.playerStatus}`);
		results.push({
			playerId: player.id,
			nickname: player.nickname,
			currentClause,
			marketValue,
			riskScore: Math.round(risk),
			rivalsThatCanAfford,
			rivalNeedScore: maxNeedScore,
			recommendedClause,
			reasoning: reasoningParts.join(" · ")
		});
	}
	return results.sort((a, b) => b.riskScore - a.riskScore);
}
function computeRecommendedClause(inputs) {
	const { currentClause, marketValue, maxRivalSpendingPower, expected, teamValue } = inputs;
	const clauseBump = currentClause * 1.15;
	const valueBased = marketValue * 1.35;
	const rivalBased = Math.max(maxRivalSpendingPower * 1.05, marketValue + maxRivalSpendingPower * .5);
	const performanceBased = marketValue + expected * 15e5;
	let recommended = Math.max(clauseBump, valueBased, rivalBased, performanceBased);
	const absoluteMax = Math.max(5e8, teamValue * .6);
	recommended = Math.min(recommended, absoluteMax);
	recommended = Math.ceil(recommended / 1e5) * 1e5;
	return recommended;
}
function formatDate(iso) {
	if (!iso) return "fecha desconocida";
	const time = Date.parse(iso);
	if (Number.isNaN(time)) return iso;
	return new Date(time).toLocaleDateString("es-ES", {
		day: "numeric",
		month: "short"
	});
}
function formatCurrency(value) {
	return new Intl.NumberFormat("es-ES", {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: 0
	}).format(value);
}
//#endregion
//#region src/lib/engine/player-stats.ts
var CACHE_TTL_MS = 432e5;
var CACHE_DIR = path.join(process.cwd(), "data", "cache", "player-stats");
var CONCURRENCY = 5;
var memCache = /* @__PURE__ */ new Map();
/** Si el FS no es escribible, se desactiva el disco y se sigue solo con memoria. */
var diskDisabled = false;
async function readDiskCache(playerId) {
	if (diskDisabled) return null;
	try {
		const raw = await readFile(path.join(CACHE_DIR, `${playerId}.json`), "utf8");
		const entry = JSON.parse(raw);
		if (!Array.isArray(entry.stats)) return null;
		if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
		return entry.stats;
	} catch {
		return null;
	}
}
async function writeDiskCache(playerId, stats) {
	if (diskDisabled) return;
	try {
		await mkdir(CACHE_DIR, { recursive: true });
		const entry = {
			fetchedAt: Date.now(),
			stats
		};
		await writeFile(path.join(CACHE_DIR, `${playerId}.json`), JSON.stringify(entry));
	} catch (error) {
		diskDisabled = true;
		console.warn("[player-stats] disk cache disabled:", error instanceof Error ? error.message : error);
	}
}
async function withConcurrency(items, fn, concurrency) {
	const results = new Array(items.length);
	let index = 0;
	async function worker() {
		while (index < items.length) {
			const current = index++;
			results[current] = await fn(items[current]);
		}
	}
	await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
	return results;
}
/**
* Resuelve los `playerStats` de una lista de jugadores usando caché de 12 h
* (memoria + disco) y consultando a la API solo los que falten o estén
* caducados. Si el detalle de un jugador falla, se devuelve lista vacía para
* ese jugador (el llamador decide el fallback y lo anota en dataQuality).
*/
async function fetchPlayerStats(players, fetchPlayerDetail) {
	const now = Date.now();
	const result = {};
	const pending = [];
	for (const player of players) {
		const cached = memCache.get(player.id);
		if (cached && cached.expiresAt > now) result[player.id] = cached.stats;
		else pending.push(player);
	}
	const stillPending = [];
	for (const player of pending) {
		const stats = await readDiskCache(player.id);
		if (stats !== null) {
			memCache.set(player.id, {
				expiresAt: now + CACHE_TTL_MS,
				stats
			});
			result[player.id] = stats;
		} else stillPending.push(player);
	}
	await withConcurrency(stillPending, async (player) => {
		let stats = [];
		try {
			stats = (await fetchPlayerDetail(player.id))?.playerMaster?.playerStats || [];
		} catch (error) {
			console.warn(`[player-stats] detail failed for player ${player.id}:`, error instanceof Error ? error.message : error);
		}
		memCache.set(player.id, {
			expiresAt: now + CACHE_TTL_MS,
			stats
		});
		result[player.id] = stats;
		await writeDiskCache(player.id, stats);
	}, CONCURRENCY);
	return result;
}
//#endregion
//#region src/lib/analysis/starter-score.ts
function labelForScore(score) {
	if (score >= .8) return "Titular";
	if (score >= .55) return "Habitual";
	if (score >= .35) return "Rotación";
	return "Suplente";
}
/**
* Score 0-1 a partir de minutos jugados por jornada.
*
* La media de minutos se calcula sobre TODAS las jornadas con dato, incluidas
* las de 0 minutos: un único partido de 90' entre varias jornadas sin jugar no
* debe puntuar como titular habitual (bug corregido, §2.3 del diseño).
*/
function starterScoreFromMinutes(playerStats) {
	if (playerStats.length === 0) return null;
	const minutesOf = (s) => s.stats?.mins_played?.[0] ?? 0;
	const weeksPlayed = playerStats.filter((s) => minutesOf(s) > 0).length;
	if (weeksPlayed === 0) return null;
	const avgMinutes = playerStats.reduce((sum, s) => sum + minutesOf(s), 0) / playerStats.length;
	const minutesRatio = Math.min(1, avgMinutes / 90);
	const weeksRatio = weeksPlayed / playerStats.length;
	return Math.round(minutesRatio * (.5 + .5 * weeksRatio) * 100) / 100;
}
/** Proxy por puntos por partido de la temporada pasada. */
function starterScoreFromLastSeason(lastSeasonPoints) {
	const perGame = (Number(lastSeasonPoints) || 0) / 38;
	if (perGame >= 4) return .9;
	if (perGame >= 2.5) return .65;
	if (perGame >= 1.2) return .4;
	return .2;
}
function starterInfoFromPlayer(player) {
	const score = starterScoreFromLastSeason(player.lastSeasonPoints);
	return {
		playerId: player.id,
		score,
		label: labelForScore(score),
		source: "last-season"
	};
}
function starterInfoFromMinutes(playerId, playerStats) {
	const score = starterScoreFromMinutes(playerStats);
	if (score === null) return null;
	return {
		playerId,
		score,
		label: labelForScore(score),
		source: "minutes"
	};
}
//#endregion
//#region src/lib/analysis/starter-status.ts
/**
* Titularidad habitual de un jugador en su equipo real.
*
* Fuentes:
* - `minutes`: stats por jornada del detalle de jugador
*   ({CMP}/player/{playerId}/league/{leagueId}) con `stats.mins_played[0]`.
*   Solo disponible cuando la temporada ya ha empezado.
* - `last-season`: proxy con los puntos de la temporada pasada
*   (`lastSeasonPoints / 38`), usado en pretemporada o si el detalle falla.
*/
/**
* Resuelve la titularidad de una lista de jugadores (típicamente la plantilla
* propia). Usa la caché compartida de playerStats (12 h, memoria + disco); si
* no hay minutos todavía (pretemporada), usa el proxy de la temporada pasada.
*/
async function fetchStarterInfo(players, fetchPlayerDetail) {
	const statsByPlayer = await fetchPlayerStats(players, fetchPlayerDetail);
	const result = {};
	for (const player of players) {
		const stats = statsByPlayer[player.id] || [];
		const minutesInfo = starterInfoFromMinutes(player.id, stats);
		result[player.id] = minutesInfo || starterInfoFromPlayer(player);
	}
	return result;
}
//#endregion
export { fetchLeagueActivity as a, computeFormationFronts as c, recommendCaptain as d, analyzeClauseRisks as i, computeTacticalScheme as l, starterScoreFromLastSeason as n, getClauseProtection as o, fetchPlayerStats as r, computeAvailableBudget as s, fetchStarterInfo as t, buildLeagueAnalysis as u };
