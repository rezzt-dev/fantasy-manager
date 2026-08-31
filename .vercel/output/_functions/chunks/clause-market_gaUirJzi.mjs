import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
import { i as getToken, n as fetchCurrentLineup, r as fetchOfficialAPI, t as CMP } from "./api-proxy_CUjR3F-2.mjs";
import { _ as loadEngineParams, a as buildTeamStrength, b as fetchExternalSignals, d as buildShrinkagePriors, f as buildTeamTiers, i as buildPositionAverages, n as fetchTeamElos, p as isSuspended, r as fetchAvailableFormations, s as estimatePointsDetailed, t as fetchProbableLineups, y as combinedSignal } from "./jornadaperfecta__8wHAFaK.mjs";
import { c as fetchLeagueActivity, d as computeAvailableBudget, l as marketFlowByManager, m as buildLeagueAnalysis, r as fetchPlayerStats, s as rivalSpendingPower, t as fetchStarterInfo, u as getClauseProtection } from "./starter-status_qu3Tyyay.mjs";
import { n as fetchTeamsMaster } from "./teams_B9ggIAoL.mjs";
import { t as enrichMarketPlayers } from "./market-enrich_jyOnRCUq.mjs";
import { t as buildTeamMatcher } from "./team-names_C8XSvDvH.mjs";
import { t as fetchConfirmedLineups } from "./sofascore_C4mLyFJz.mjs";
import { t as fetchValueTrends } from "./futbolfantasy_BJJ1We-8.mjs";
//#region src/lib/format.ts
var POSITION_NAME = {
	1: "Portero",
	2: "Defensa",
	3: "Centrocampista",
	4: "Delantero",
	5: "Entrenador"
};
function getPositionName(positionId) {
	if (positionId == null) return "Otro";
	return POSITION_NAME[positionId] || "Otro";
}
//#endregion
//#region src/lib/analysis/clause-market.ts
/**
* Análisis de clausulazos: qué jugadores de los rivales se pueden clausular
* hoy, cuánto mejoraría cada uno tu once y en qué orden conviene atacarlos.
*
* Todo se mide en la misma escala que el resto del motor: ΔxP en puntos de la
* jornada (§5.4). El ΔxP que manda es `xiGain`, la mejora real del **once
* titular** al añadir al jugador (se recalcula la mejor formación posible con
* él dentro), no la comparación contra una media abstracta.
*/
var COACH_POSITION_ID = 5;
var BAD_NEWS_CONFIDENCE = .6;
/** Días de protección de la cláusula tras un clausulazo (reglas del juego). */
var POST_BUYOUT_PROTECTION_DAYS = 14;
/** Vender un jugador aporta caja +V pero resta valor de plantilla (−20% del bonus). */
var SALE_BUDGET_FACTOR = .8;
/** Máximo de ventas propuestas en un plan de financiación. */
var MAX_FUNDING_SALES = 3;
/** Candidatos que entran en la búsqueda de combos (coste combinatorio acotado). */
var COMBO_POOL = 8;
var MAX_COMBOS = 4;
/** Por debajo de esta probabilidad de titularidad tratamos al jugador como suplente. */
var SUBSTITUTE_SCORE = .35;
function round1(value) {
	return Math.round(value * 10) / 10;
}
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}
/** Puntuación de un jugador con el mismo criterio que el optimizador de once. */
function scorePlayer(player, input) {
	const prediction = estimatePointsDetailed(player, input.calendar, input.context);
	const external = combinedSignal(input.externalSignals[player.id] || []);
	const badNews = external.signal === "sell" && external.confidence >= BAD_NEWS_CONFIDENCE;
	const eligible = player.positionId !== COACH_POSITION_ID && player.playerStatus === "ok" && !isSuspended(player, input.context?.injuryReport) && !badNews;
	return {
		player,
		xp: prediction.xp,
		riskAdjustedXp: prediction.riskAdjustedXp,
		pStarter: prediction.pStarter,
		expectedMinutes: prediction.expectedMinutes,
		dataQuality: prediction.dataQuality.level,
		source: prediction.source,
		eligible
	};
}
/**
* Mejor once posible a partir de las reservas por posición. Réplica numérica
* de `lineup-optimizer.ts` (misma co-optimización del capitán) sobre valores
* ya calculados, para poder evaluar cientos de "¿y si ficho a X?" sin volver
* a estimar puntos.
*/
function bestXi(pools, formations, captainEnabled) {
	let best = null;
	for (const formation of formations) {
		const [defCount, midCount, attCount] = formation.split(",").map((n) => parseInt(n, 10));
		if (![
			defCount,
			midCount,
			attCount
		].every((n) => Number.isFinite(n))) continue;
		const gks = pools.get(1) || [];
		const defs = pools.get(2) || [];
		const mids = pools.get(3) || [];
		const atts = pools.get(4) || [];
		if (gks.length < 1 || defs.length < defCount || mids.length < midCount || atts.length < attCount) continue;
		const starters = [
			...gks.slice(0, 1),
			...defs.slice(0, defCount),
			...mids.slice(0, midCount),
			...atts.slice(0, attCount)
		];
		const total = starters.reduce((acc, entry) => acc + entry.points, 0) + (captainEnabled ? Math.max(...starters.map((e) => e.points)) : 0);
		if (!best || total > best.total) best = {
			formation,
			total,
			starterIds: new Set(starters.map((e) => e.id))
		};
	}
	return best;
}
/** Copia de las reservas con jugadores extra insertados en su posición. */
function poolsWith(base, extras) {
	const next = new Map(base);
	for (const extra of extras) {
		const list = [...next.get(extra.positionId) || [], extra.entry].sort((a, b) => b.points - a.points);
		next.set(extra.positionId, list);
	}
	return next;
}
/** Etiqueta de titularidad a partir de la probabilidad de la jornada. */
function starterLabelFrom(pStarter, player) {
	if (pStarter === null) {
		const perGame = Number(player.averagePoints) || 0;
		if (perGame >= 5) return "Titular";
		if (perGame >= 3) return "Habitual";
		return "Sin datos";
	}
	if (pStarter >= .75) return "Titular";
	if (pStarter >= .5) return "Habitual";
	if (pStarter >= SUBSTITUTE_SCORE) return "Rotación";
	return "Suplente";
}
function trendDirection(trend) {
	if (!trend) return "flat";
	if (trend.trendScore > 0 && trend.pct7d >= 3) return "rising";
	if (trend.trendScore < 0 && trend.pct7d <= -3) return "falling";
	return "flat";
}
function statusText(status) {
	switch (status) {
		case "doubtful": return "dudoso";
		case "injured": return "lesionado";
		case "out_of_league": return "fuera de la liga";
		default: return status;
	}
}
function formatCurrency(value) {
	return new Intl.NumberFormat("es-ES", {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: 0
	}).format(value);
}
/**
* Encaje 0-100 de un objetivo con tu equipo. Pondera lo que de verdad decide
* un clausulazo: cuánto sube tu once (45), el nivel del jugador respecto a tu
* plantilla (15), lo barata que es la cláusula (15), la necesidad posicional
* (10), la titularidad (10) y la solidez del dato (5).
*/
function computeFitScore(parts) {
	const xiPart = clamp(parts.xiGain * 9, 0, 45);
	const deltaPart = clamp(parts.deltaXp * 5, 0, 15);
	const pricePart = clamp((1.5 - parts.clauseRatio) / .8, 0, 1) * 15;
	const needPart = parts.needScore * 10;
	const starterPart = (parts.pStarter ?? .5) * 10;
	const dataPart = parts.dataQuality === "high" ? 5 : parts.dataQuality === "medium" ? 3 : 1;
	let score = xiPart + deltaPart + pricePart + needPart + starterPart + dataPart;
	if (!parts.healthy) score *= .4;
	if (parts.badNews) score *= .5;
	if (parts.fallingValue) score -= 5;
	if (!parts.affordable) score *= .75;
	return Math.round(clamp(score, 0, 100));
}
/**
* Urgencia 0-100: probabilidad de que el jugador deje de estar disponible.
* Manda quién más puede pagar su cláusula ahora mismo, lo barata que está
* respecto a su valor y el nivel del jugador (a los buenos se los quitan).
*/
function computeUrgency(parts) {
	let urgency = (parts.totalRivals > 0 ? parts.rivalsThatCanAfford / parts.totalRivals : 0) * 40;
	urgency += clamp((1.3 - parts.clauseRatio) / .6, 0, 1) * 25;
	urgency += clamp(parts.xp / 8, 0, 1) * 20;
	urgency += clamp(parts.clauseAttackers / 2, 0, 1) * 15;
	return Math.round(clamp(urgency, 0, 100));
}
function computeVerdict(fitScore, xiGain, deltaXp, healthy, badNews) {
	if (!healthy || badNews) return "avoid";
	if (xiGain <= 0 && deltaXp <= 0) return "avoid";
	if (fitScore >= 65) return "top";
	if (fitScore >= 45) return "good";
	if (fitScore >= 25) return "situational";
	return "avoid";
}
/**
* Plan de financiación: qué jugadores propios vender para llegar a la
* cláusula. Se venden los que menos aportan y que no son titulares del mejor
* once. Cada venta suma `0,8 × valor` al presupuesto porque la caja sube el
* valor íntegro pero el bonus del 20% del valor de plantilla baja.
*/
function buildFundingPlan(missing, squadScores, baselineStarters) {
	const sellable = squadScores.filter((s) => !baselineStarters.has(s.player.id)).sort((a, b) => a.riskAdjustedXp - b.riskAdjustedXp);
	const players = [];
	let raised = 0;
	for (const candidate of sellable) {
		if (raised >= missing || players.length >= MAX_FUNDING_SALES) break;
		const value = Number(candidate.player.marketValue) || 0;
		if (value <= 0) continue;
		players.push({
			id: candidate.player.id,
			nickname: candidate.player.nickname,
			positionName: getPositionName(candidate.player.positionId),
			marketValue: value,
			expectedPoints: round1(candidate.xp)
		});
		raised += Math.floor(value * SALE_BUDGET_FACTOR);
	}
	return {
		players,
		raised,
		shortfall: Math.max(0, missing - raised),
		feasible: raised >= missing
	};
}
function buildClauseMarket(input) {
	const notes = [];
	if (!input.buyoutClauseEnabled) return {
		enabled: false,
		budget: input.budget,
		targets: [],
		recommended: [],
		upcoming: [],
		combos: [],
		owners: [],
		stats: {
			rivalPlayers: 0,
			available: 0,
			locked: 0,
			shielded: 0,
			affordable: 0,
			bargains: 0,
			bestXiGain: 0,
			cheapestAffordable: null,
			medianClauseRatio: 0
		},
		baseline: {
			formation: "-",
			expectedPoints: 0
		},
		notes: ["Esta liga no tiene activada la cláusula de rescisión: no se pueden hacer clausulazos."]
	};
	const formations = input.formations.length > 0 ? input.formations : [
		"4,4,2",
		"4,3,3",
		"3,5,2",
		"5,3,2",
		"4,5,1",
		"3,4,3"
	];
	const captainEnabled = input.captainEnabled === true;
	const ownIds = new Set(input.squad.map((tp) => tp.playerMaster.id));
	const squadScores = input.squad.map((tp) => scorePlayer(tp.playerMaster, input));
	const basePools = /* @__PURE__ */ new Map();
	for (const scored of squadScores) {
		if (!scored.eligible) continue;
		const list = basePools.get(scored.player.positionId) || [];
		list.push({
			id: scored.player.id,
			points: scored.riskAdjustedXp
		});
		basePools.set(scored.player.positionId, list);
	}
	for (const list of basePools.values()) list.sort((a, b) => b.points - a.points);
	const baselineXi = bestXi(basePools, formations, captainEnabled);
	if (!baselineXi) notes.push("No hay jugadores sanos suficientes para formar un once: la mejora del once no se puede calcular.");
	const baselineStarters = baselineXi?.starterIds ?? /* @__PURE__ */ new Set();
	const squadById = new Map(squadScores.map((s) => [s.player.id, s]));
	const referenceByPosition = /* @__PURE__ */ new Map();
	{
		const sum = /* @__PURE__ */ new Map();
		const count = /* @__PURE__ */ new Map();
		for (const scored of squadScores) {
			if (scored.player.playerStatus !== "ok") continue;
			sum.set(scored.player.positionId, (sum.get(scored.player.positionId) || 0) + scored.xp);
			count.set(scored.player.positionId, (count.get(scored.player.positionId) || 0) + 1);
		}
		for (const [positionId, total] of sum) referenceByPosition.set(positionId, total / Math.max(count.get(positionId) || 1, 1));
	}
	const flowsByManager = marketFlowByManager(input.leagueActivity ?? []);
	const spendingPowerByTeam = /* @__PURE__ */ new Map();
	let clauseAttackers = 0;
	for (const rival of input.rivals) {
		const flow = flowsByManager.get(rival.managerId);
		spendingPowerByTeam.set(rival.teamId, rivalSpendingPower(rival, flow));
		if ((flow?.clauseAttacks ?? 0) > 0) clauseAttackers += 1;
	}
	const needByPosition = new Map(input.ownNeeds.map((n) => [n.positionId, n.needScore]));
	const marketByPlayerId = new Map(input.market.map((m) => [m.playerMaster.id, m]));
	const targets = [];
	const upcoming = [];
	const owners = [];
	let rivalPlayers = 0;
	let lockedTotal = 0;
	let shieldedTotal = 0;
	for (const rival of input.rivals) {
		let availableCount = 0;
		let lockedCount = 0;
		let shieldedCount = 0;
		let affordableCount = 0;
		let cheapestClause = null;
		let totalClauseValue = 0;
		let bestTarget;
		for (const teamPlayer of rival.players) {
			const player = teamPlayer.playerMaster;
			rivalPlayers += 1;
			if (ownIds.has(player.id)) continue;
			if (player.positionId === COACH_POSITION_ID && input.coachEnabled !== true) continue;
			const clause = Number(teamPlayer.buyoutClause) || 0;
			const marketValue = Number(player.marketValue) || 0;
			const protection = getClauseProtection(teamPlayer);
			const owner = {
				teamId: rival.teamId,
				managerId: rival.managerId,
				managerName: rival.managerName
			};
			if (protection.status !== "available") {
				if (protection.status === "locked") {
					lockedCount += 1;
					lockedTotal += 1;
				} else {
					shieldedCount += 1;
					shieldedTotal += 1;
				}
				const scored = scorePlayer(player, input);
				const upcomingExternal = combinedSignal(input.externalSignals[player.id] || []);
				const daysLeft = protection.until ? Math.max(0, Math.ceil((Date.parse(protection.until) - Date.now()) / 864e5)) : void 0;
				upcoming.push({
					playerId: player.id,
					player,
					owner,
					clause,
					marketValue,
					expectedPoints: round1(scored.xp),
					status: protection.status,
					availableAt: protection.until,
					daysLeft: Number.isFinite(daysLeft) ? daysLeft : void 0,
					fitScore: computeFitScore({
						xiGain: Math.max(0, scored.xp - (referenceByPosition.get(player.positionId) ?? 0)),
						deltaXp: scored.xp - (referenceByPosition.get(player.positionId) ?? 0),
						clauseRatio: marketValue > 0 ? clause / marketValue : 1,
						needScore: needByPosition.get(player.positionId) ?? 0,
						pStarter: scored.pStarter,
						dataQuality: scored.dataQuality,
						healthy: player.playerStatus === "ok",
						badNews: upcomingExternal.signal === "sell" && upcomingExternal.confidence >= BAD_NEWS_CONFIDENCE,
						affordable: clause <= input.budget.available,
						fallingValue: false
					}),
					affordable: clause > 0 && clause <= input.budget.available
				});
				continue;
			}
			if (clause <= 0) continue;
			availableCount += 1;
			totalClauseValue += clause;
			if (cheapestClause === null || clause < cheapestClause) cheapestClause = clause;
			const affordable = clause <= input.budget.available;
			if (affordable) affordableCount += 1;
			const scored = scorePlayer(player, input);
			const signals = input.externalSignals[player.id] || [];
			const external = combinedSignal(signals);
			const badNews = external.signal === "sell" && external.confidence >= BAD_NEWS_CONFIDENCE;
			const healthy = player.playerStatus === "ok";
			const reference = referenceByPosition.get(player.positionId) ?? 0;
			const deltaXp = scored.xp - reference;
			let xiGain = 0;
			let replaces;
			if (baselineXi && scored.eligible) {
				const withPlayer = bestXi(poolsWith(basePools, [{
					positionId: player.positionId,
					entry: {
						id: player.id,
						points: scored.riskAdjustedXp
					}
				}]), formations, captainEnabled);
				if (withPlayer) {
					xiGain = withPlayer.total - baselineXi.total;
					if (withPlayer.starterIds.has(player.id)) {
						const droppedId = [...baselineStarters].find((id) => !withPlayer.starterIds.has(id));
						const dropped = droppedId ? squadById.get(droppedId) : void 0;
						if (dropped) replaces = {
							id: dropped.player.id,
							nickname: dropped.player.nickname,
							expectedPoints: round1(dropped.xp)
						};
					}
				}
			}
			xiGain = round1(Math.max(0, xiGain));
			const clauseRatio = marketValue > 0 ? clause / marketValue : 1;
			const trend = input.valueTrends?.get(player.id);
			const direction = trendDirection(trend);
			const rivalsThatCanAfford = input.rivals.filter((r) => r.teamId !== rival.teamId && (spendingPowerByTeam.get(r.teamId) ?? 0) >= clause).length;
			const fitScore = computeFitScore({
				xiGain,
				deltaXp,
				clauseRatio,
				needScore: needByPosition.get(player.positionId) ?? 0,
				pStarter: scored.pStarter,
				dataQuality: scored.dataQuality,
				healthy,
				badNews,
				affordable,
				fallingValue: direction === "falling"
			});
			const urgency = computeUrgency({
				rivalsThatCanAfford,
				totalRivals: Math.max(input.rivals.length - 1, 1),
				clauseRatio,
				xp: scored.xp,
				clauseAttackers
			});
			const reasons = [];
			const warnings = [];
			if (xiGain > .3) reasons.push(replaces ? `Entra en tu once (+${xiGain.toFixed(1)} pts) y deja fuera a ${replaces.nickname}.` : `Mejora tu once titular en +${xiGain.toFixed(1)} pts.`);
			if (deltaXp > .5) reasons.push(`Rinde ${deltaXp.toFixed(1)} pts por encima de la media de tus ${getPositionName(player.positionId).toLowerCase()}s.`);
			if (clauseRatio < .95) reasons.push(`Cláusula un ${Math.round((1 - clauseRatio) * 100)}% por debajo de su valor de mercado.`);
			if ((needByPosition.get(player.positionId) ?? 0) > .3) reasons.push(`Cubre una necesidad en ${getPositionName(player.positionId).toLowerCase()}.`);
			if (scored.pStarter !== null && scored.pStarter >= .75) reasons.push(`Titularidad ${Math.round(scored.pStarter * 100)}% en el once probable.`);
			if (direction === "rising" && trend) reasons.push(`Su valor sube (+${Math.round(trend.pct7d)}% en 7 días).`);
			if (external.signal === "buy") reasons.push("Las noticias recientes le son favorables.");
			if (affordable && reasons.length > 0) reasons.push(`Tras pagarla te quedarían ${formatCurrency(input.budget.available - clause)}.`);
			if (!healthy) warnings.push(`Está ${statusText(player.playerStatus)}: no puntuará hasta que se recupere.`);
			if (badNews) {
				const negative = signals.filter((s) => s.signal === "sell").sort((a, b) => b.confidence - a.confidence)[0];
				warnings.push(`Noticias negativas${negative?.reason ? `: ${negative.reason}` : ""}.`);
			}
			if (scored.source === "bye-week") warnings.push("Su equipo descansa esta jornada: no sumará puntos.");
			if (scored.pStarter !== null && scored.pStarter < SUBSTITUTE_SCORE) warnings.push(`Suplente en el once probable (${Math.round(scored.pStarter * 100)}% de titularidad).`);
			if (xiGain <= 0 && scored.eligible) warnings.push("No entra en tu mejor once: no mejora tu puntuación de esta jornada.");
			if (clauseRatio > 1.3) warnings.push(`Sobrecoste del ${Math.round((clauseRatio - 1) * 100)}% sobre su valor de mercado.`);
			if (affordable && clause > input.budget.available * .85) warnings.push("Te dejaría casi sin presupuesto para el resto del mercado.");
			if (direction === "falling" && trend) warnings.push(`Su valor baja (${Math.round(trend.pct7d)}% en 7 días).`);
			const missingBudget = Math.max(0, clause - input.budget.available);
			const funding = missingBudget > 0 ? buildFundingPlan(missingBudget, squadScores, baselineStarters) : void 0;
			const alsoOnMarketEntry = marketByPlayerId.get(player.id);
			targets.push({
				playerId: player.id,
				player,
				owner,
				clause,
				marketValue,
				clauseRatio: Math.round(clauseRatio * 100) / 100,
				premium: clause - marketValue,
				expectedPoints: round1(scored.xp),
				riskAdjustedXp: round1(scored.riskAdjustedXp),
				pStarter: scored.pStarter,
				expectedMinutes: scored.expectedMinutes,
				starterLabel: starterLabelFrom(scored.pStarter, player),
				dataQuality: scored.dataQuality,
				deltaXp: round1(deltaXp),
				xiGain,
				replaces,
				costPerXp: xiGain > 0 ? Math.round(clause / xiGain) : Number.POSITIVE_INFINITY,
				pointsPer10M: clause > 0 ? Math.round(scored.xp / (clause / 1e7) * 10) / 10 : 0,
				needScore: needByPosition.get(player.positionId) ?? 0,
				positionName: getPositionName(player.positionId),
				fitScore,
				urgency,
				rivalsThatCanAfford,
				affordable,
				missingBudget,
				funding,
				alsoOnMarket: alsoOnMarketEntry ? {
					marketId: alsoOnMarketEntry.id,
					salePrice: Number(alsoOnMarketEntry.salePrice) || 0,
					numberOfBids: alsoOnMarketEntry.numberOfBids || 0
				} : void 0,
				signals,
				valueTrend: trend ? {
					pct7d: Math.round(trend.pct7d),
					direction
				} : void 0,
				reasons,
				warnings,
				verdict: computeVerdict(fitScore, xiGain, deltaXp, healthy, badNews)
			});
			if (!bestTarget || xiGain > bestTarget.xiGain) bestTarget = {
				playerId: player.id,
				nickname: player.nickname,
				xiGain,
				clause
			};
		}
		const exposureScore = Math.round(clamp(affordableCount / Math.max(rival.players.length, 1) * 70 + availableCount / Math.max(rival.players.length, 1) * 30, 0, 100));
		owners.push({
			teamId: rival.teamId,
			managerId: rival.managerId,
			managerName: rival.managerName,
			teamValue: rival.teamValue,
			squadSize: rival.players.length,
			availableCount,
			lockedCount,
			shieldedCount,
			affordableCount,
			cheapestClause,
			bestTarget,
			totalClauseValue,
			exposureScore
		});
	}
	targets.sort((a, b) => b.fitScore - a.fitScore || b.xiGain - a.xiGain);
	upcoming.sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999) || b.fitScore - a.fitScore);
	const recommended = targets.filter((t) => t.affordable && t.verdict !== "avoid" && (t.xiGain > 0 || t.deltaXp > 0)).slice(0, 5);
	const combos = [];
	if (baselineXi) {
		const pool = targets.filter((t) => t.affordable && t.xiGain > 0 && t.verdict !== "avoid").slice(0, COMBO_POOL);
		const evaluate = (group) => {
			const totalCost = group.reduce((sum, t) => sum + t.clause, 0);
			if (totalCost > input.budget.available) return null;
			const withGroup = bestXi(poolsWith(basePools, group.map((t) => ({
				positionId: t.player.positionId,
				entry: {
					id: t.playerId,
					points: t.riskAdjustedXp
				}
			}))), formations, captainEnabled);
			if (!withGroup) return null;
			const totalXiGain = round1(withGroup.total - baselineXi.total);
			if (totalXiGain <= 0) return null;
			return {
				targets: group.map((t) => ({
					playerId: t.playerId,
					nickname: t.player.nickname,
					positionName: t.positionName,
					clause: t.clause
				})),
				totalCost,
				totalXiGain,
				remainingBudget: input.budget.available - totalCost
			};
		};
		for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
			const pair = evaluate([pool[i], pool[j]]);
			if (pair) combos.push(pair);
			for (let k = j + 1; k < pool.length; k++) {
				const triple = evaluate([
					pool[i],
					pool[j],
					pool[k]
				]);
				if (triple) combos.push(triple);
			}
		}
		combos.sort((a, b) => b.totalXiGain - a.totalXiGain || a.totalCost - b.totalCost);
	}
	owners.sort((a, b) => b.exposureScore - a.exposureScore || b.availableCount - a.availableCount);
	const affordableTargets = targets.filter((t) => t.affordable);
	const ratios = targets.map((t) => t.clauseRatio).sort((a, b) => a - b);
	const medianClauseRatio = ratios.length > 0 ? ratios[Math.floor(ratios.length / 2)] : 0;
	if (targets.length === 0) notes.push("Ahora mismo no hay jugadores rivales con la cláusula libre.");
	else if (affordableTargets.length === 0) notes.push("Ninguna cláusula libre entra en tu presupuesto: revisa los planes de financiación o espera a vender.");
	notes.push(`Al pagar una cláusula el jugador queda protegido ${POST_BUYOUT_PROTECTION_DAYS} días: nadie podrá clausulártelo durante ese tiempo.`);
	if (input.rivals.some((r) => r.teamMoney === null)) notes.push("El dinero de algunos rivales no lo expone la API: su poder de compra se estima con el 20% del valor de su plantilla y su actividad reciente.");
	return {
		enabled: true,
		budget: input.budget,
		targets,
		recommended,
		upcoming: upcoming.slice(0, 20),
		combos: combos.slice(0, MAX_COMBOS),
		owners,
		stats: {
			rivalPlayers,
			available: targets.length,
			locked: lockedTotal,
			shielded: shieldedTotal,
			affordable: affordableTargets.length,
			bargains: targets.filter((t) => t.clauseRatio < .9).length,
			bestXiGain: targets.reduce((max, t) => Math.max(max, t.xiGain), 0),
			cheapestAffordable: affordableTargets.length > 0 ? Math.min(...affordableTargets.map((t) => t.clause)) : null,
			medianClauseRatio
		},
		baseline: {
			formation: baselineXi?.formation ?? "-",
			expectedPoints: round1(baselineXi?.total ?? 0)
		},
		notes
	};
}
//#endregion
//#region src/pages/api/clause-market.ts
var clause_market_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
/**
* Sección Clausulazos: jugadores de los rivales con la cláusula libre,
* ordenados por lo que aportarían a tu once. Reutiliza el mismo pipeline de
* datos y el mismo estimador que /api/recommendations, sin la persistencia de
* track record ni el planificador multi-jornada (esta vista es interactiva).
*/
/** Candidatos a clausulazo que precalientan `playerStats` (acota peticiones). */
var CLAUSE_STATS_UNIVERSE = 30;
/** Candidatos para los que se buscan noticias externas. */
var CLAUSE_NEWS_UNIVERSE = 40;
/** Margen sobre el presupuesto para incluir objetivos financiables vendiendo. */
var AFFORDABILITY_MARGIN = 1.6;
var cache = /* @__PURE__ */ new Map();
var CACHE_TTL_MS = 18e4;
/** Proxy de rendimiento por partido para pre-rankear candidatos sin stats. */
function recentPointsPerGame(player) {
	return Math.max(Number(player.averagePoints) || 0, (Number(player.lastSeasonPoints) || 0) / 38);
}
var GET = async ({ url, cookies, session }) => {
	try {
		const leagueId = url.searchParams.get("leagueId");
		const teamIdParam = url.searchParams.get("teamId");
		if (!leagueId || !teamIdParam) return new Response(JSON.stringify({ error: "leagueId and teamId required" }), { status: 400 });
		const teamId = parseInt(teamIdParam, 10);
		const token = await getToken(cookies, session);
		if (!token) return new Response(JSON.stringify({ error: "No token configured" }), { status: 401 });
		const cacheKey = `${leagueId}:${teamId}`;
		const cached = cache.get(cacheKey);
		if (cached && cached.expiresAt > Date.now()) return new Response(JSON.stringify(cached.payload), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
		await loadEngineParams();
		const week = await fetchOfficialAPI(`${CMP}/week/current`, token);
		const currentWeek = week?.number ?? week?.weekNumber ?? 1;
		const [leagues, teamData, lineup, money, rawMarket, standing, allPlayers] = await Promise.all([
			fetchOfficialAPI(`${CMP}/leagues`, token),
			fetchOfficialAPI(`${CMP}/leagues/${leagueId}/teams/${teamId}`, token),
			fetchCurrentLineup(token, teamId, currentWeek, leagueId),
			fetchOfficialAPI(`${CMP}/teams/${teamId}/money`, token),
			fetchOfficialAPI(`${CMP}/league/${leagueId}/market`, token),
			fetchOfficialAPI(`${CMP}/leagues/${leagueId}/standing`, token),
			fetchOfficialAPI(`${CMP}/players`, token)
		]);
		const market = enrichMarketPlayers(rawMarket, allPlayers);
		const calendar = await fetchOfficialAPI(`${CMP}/calendar`, token, { weekNumber: String(currentWeek) });
		const league = leagues.find((l) => l.id === leagueId);
		if (!league) return new Response(JSON.stringify({ error: "League not found" }), { status: 404 });
		const analysis = await buildLeagueAnalysis(league, teamData, lineup, money, market, standing, week, calendar, allPlayers, {
			fetchTeamData: (lid, tid) => fetchOfficialAPI(`${CMP}/leagues/${lid}/teams/${tid}`, token),
			fetchTeamMoney: (tid) => fetchOfficialAPI(`${CMP}/teams/${tid}/money`, token)
		});
		const budget = computeAvailableBudget(money, league.team?.teamValue ?? 0);
		const ownPlayerIds = new Set(teamData.players.map((p) => p.playerMaster.id));
		const clauseCandidates = analysis.rivals.flatMap((rival) => rival.players).filter((tp) => {
			if (ownPlayerIds.has(tp.playerMaster.id)) return false;
			if (!(tp.buyoutClause > 0)) return false;
			if (tp.buyoutClause > budget.available * AFFORDABILITY_MARGIN) return false;
			return getClauseProtection(tp).status === "available";
		}).map((tp) => tp.playerMaster).sort((a, b) => recentPointsPerGame(b) - recentPointsPerGame(a));
		const newsUniverse = [...teamData.players.map((p) => p.playerMaster), ...clauseCandidates.slice(0, CLAUSE_NEWS_UNIVERSE)].map((p) => ({
			id: p.id,
			name: p.name,
			nickname: p.nickname,
			teamName: p.team?.name
		}));
		const externalResult = await fetchExternalSignals(newsUniverse);
		analysis.externalSignals = externalResult.signals;
		const leagueActivity = await fetchLeagueActivity(leagueId, token);
		analysis.leagueActivity = leagueActivity;
		const detailFetcher = (playerId) => fetchOfficialAPI(`${CMP}/player/${playerId}/league/${leagueId}`, token);
		const statsUniverse = [...teamData.players.map((p) => p.playerMaster), ...clauseCandidates.slice(0, CLAUSE_STATS_UNIVERSE)];
		const statsMap = await fetchPlayerStats(statsUniverse, detailFetcher);
		analysis.starterInfo = await fetchStarterInfo(teamData.players.map((p) => p.playerMaster), detailFetcher);
		const officialTeams = await fetchTeamsMaster(token);
		const teamElos = officialTeams.length > 0 ? await fetchTeamElos(officialTeams) : null;
		const probableData = officialTeams.length > 0 ? await fetchProbableLineups(officialTeams) : null;
		const probableLineups = /* @__PURE__ */ new Map();
		if (probableData) {
			const matchTeam = buildTeamMatcher(officialTeams);
			for (const match of probableData.matches) for (const probable of match.lineups) {
				const lineupTeamId = matchTeam(probable.sourceTeamName);
				if (lineupTeamId !== null) probableLineups.set(lineupTeamId, probable);
			}
		}
		const confirmedList = await fetchConfirmedLineups();
		const confirmedLineups = /* @__PURE__ */ new Map();
		if (confirmedList.length > 0 && officialTeams.length > 0) {
			const matchTeam = buildTeamMatcher(officialTeams);
			for (const confirmed of confirmedList) {
				const lineupTeamId = matchTeam(confirmed.sourceTeamName);
				if (lineupTeamId !== null) confirmedLineups.set(lineupTeamId, confirmed);
			}
		}
		const valueTrends = officialTeams.length > 0 ? await fetchValueTrends(allPlayers, officialTeams) : null;
		const teamTiers = buildTeamTiers(teamElos?.eloByTeamId ?? /* @__PURE__ */ new Map());
		const estimatorContext = {
			teamStrength: buildTeamStrength(allPlayers),
			starterInfo: analysis.starterInfo,
			externalSignals: analysis.externalSignals,
			playerStats: statsMap,
			positionAverages: buildPositionAverages(allPlayers),
			weekNumber: currentWeek,
			teamElos: teamElos?.eloByTeamId,
			probableLineups,
			injuryReport: probableData?.injuries,
			shrinkagePriors: buildShrinkagePriors(allPlayers, teamTiers),
			teamTiers,
			newsCoverage: {
				feedsOk: externalResult.coverage.feedsOk.length,
				feedsTotal: externalResult.coverage.feedsOk.length + externalResult.coverage.feedsFailed.length
			},
			confirmedLineups
		};
		const formations = await fetchAvailableFormations(token, league.config?.premiumFeatures?.formations === true);
		const clauseMarket = buildClauseMarket({
			squad: teamData.players,
			rivals: analysis.rivals,
			market,
			calendar,
			formations,
			budget,
			ownNeeds: analysis.ownNeeds,
			externalSignals: analysis.externalSignals,
			buyoutClauseEnabled: league.config?.features?.buyoutClause !== false,
			captainEnabled: league.config?.premiumFeatures?.captain === true,
			coachEnabled: league.config?.premiumFeatures?.coach === true,
			context: estimatorContext,
			leagueActivity,
			valueTrends: valueTrends?.trendsByPlayerId
		});
		console.log(`[clause-market] ${clauseMarket.targets.length} clausulables (${clauseMarket.stats.affordable} a tu alcance) de ${analysis.rivals.length} rivales · presupuesto ${budget.available}`);
		const payload = {
			generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
			week: currentWeek,
			leagueId,
			clauseMarket,
			league,
			money
		};
		cache.set(cacheKey, {
			expiresAt: Date.now() + CACHE_TTL_MS,
			payload
		});
		return new Response(JSON.stringify(payload), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error("[clause-market] Error:", message);
		return new Response(JSON.stringify({ error: message }), { status: 500 });
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/clause-market@_@ts
var page = () => clause_market_exports;
//#endregion
export { page };
