import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
import { n as fetchOfficialAPI, r as getToken, t as CMP } from "./api-proxy_CJ5fp98A.mjs";
import { _ as loadEngineParams, a as buildPositionAverages, b as fetchExternalSignals, c as estimatePointsDetailed, d as resolveTeamId, f as buildShrinkagePriors, g as getEngineParams, h as DEFAULT_ENGINE_PARAMS, i as computeOptimalLineup, l as estimatePointsLegacy, m as normalizePlayerName, n as fetchTeamElos, o as buildTeamStrength, p as buildTeamTiers, r as fetchAvailableFormations, s as estimatePoints, t as fetchProbableLineups, u as predictPlayerPoints, v as saveEngineParams, y as combinedSignal } from "./jornadaperfecta_BETVXtqM.mjs";
import { a as fetchLeagueActivity, c as computeFormationFronts, d as recommendCaptain, i as analyzeClauseRisks, l as computeTacticalScheme, n as starterScoreFromLastSeason, o as getClauseProtection, r as fetchPlayerStats, s as computeAvailableBudget, t as fetchStarterInfo, u as buildLeagueAnalysis } from "./starter-status_LG-LwEuT.mjs";
import { i as fetchTeamsMaster, r as fetchTextWithCache, t as buildTeamMatcher } from "./team-names_DwPbX-En.mjs";
import { t as enrichMarketPlayers } from "./market-enrich_jyOnRCUq.mjs";
import { t as fetchConfirmedLineups } from "./sofascore_BdUL4Ys8.mjs";
import { a as persistMetrics, c as persistScoringTable, i as persistLineup, l as settleTrackRecord, n as evaluateTrackRecord, o as persistPredictions, r as evaluateWalkForward, s as persistRecommendations, t as MODEL_VERSION } from "./track-record_BcljYC3i.mjs";
import { existsSync } from "node:fs";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
//#region src/lib/recommendations/engine.ts
/** Categorías de noticias que implican que el jugador no debería jugar. */
var HARD_NEGATIVE_CATEGORIES = /* @__PURE__ */ new Set([
	"injury",
	"illness",
	"suspension"
]);
var SELL_NEWS_CONFIDENCE = .6;
/** Por debajo de este score de titularidad consideramos al jugador suplente habitual. */
var SUBSTITUTE_SCORE = .35;
/** Corte significativo de ΔxP para entrar en los mejores movimientos (puntos). */
var MIN_IMPACT_XP = 1;
/** Incremento mínimo sobre la puja actual para que la propuesta sea competitiva. */
var MIN_BID_INCREMENT = 5e4;
/** Múltiplo al que redondear los precios sugeridos de puja. */
var BID_PRICE_ROUNDING = 1e5;
function formatCurrency(value) {
	if (!Number.isFinite(value)) return "-";
	return new Intl.NumberFormat("es-ES", {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: 0
	}).format(value);
}
function round1(value) {
	return Math.round(value * 10) / 10;
}
/**
* Lectura de la tendencia de valor (FútbolFantasy) para el timing de mercado:
* comprar antes de subidas, vender antes de bajadas (§5.4). No altera el ΔxP
* (que mide puntos, no euros): solo prioridad y textos.
*/
function trendSignal(trend) {
	if (!trend) return {
		direction: "flat",
		note: null
	};
	const pct = Math.round(trend.pct7d);
	if (trend.trendScore > 0 && trend.pct7d >= 3) return {
		direction: "rising",
		note: `Sube de valor (+${pct}% en 7 días).`
	};
	if (trend.trendScore < 0 && trend.pct7d <= -3) return {
		direction: "falling",
		note: `Baja de valor (${pct}% en 7 días).`
	};
	return {
		direction: "flat",
		note: null
	};
}
function computeSuggestedBidPrice(salePrice, marketValue, numberOfBids, budgetAvailable) {
	if (!Number.isFinite(salePrice) || salePrice <= 0) return Math.min(marketValue, budgetAvailable);
	const baseBid = salePrice * (1 + (numberOfBids === 0 ? .05 : numberOfBids <= 2 ? .08 : .12));
	const valueRatio = salePrice / Math.max(marketValue, 1);
	const valueCap = marketValue * (valueRatio < .85 ? 1.2 : valueRatio > 1.05 ? 1 : 1.1);
	let suggested = Math.max(baseBid, salePrice + MIN_BID_INCREMENT);
	suggested = Math.min(suggested, valueCap, budgetAvailable);
	suggested = Math.ceil(suggested / BID_PRICE_ROUNDING) * BID_PRICE_ROUNDING;
	if (suggested > budgetAvailable) suggested = Math.floor(budgetAvailable / BID_PRICE_ROUNDING) * BID_PRICE_ROUNDING;
	return Math.max(suggested, salePrice + MIN_BID_INCREMENT);
}
function generateRecommendations(input) {
	const { analysis, estimatorContext, valueTrends } = input;
	const { league, teamData, lineup, money, market, calendar, ownNeeds, clauseRisks, captain, externalSignals, starterInfo, rivals } = analysis;
	const recommendations = [];
	const teamPlayerIds = new Set(teamData.players.map((p) => p.playerMaster.id));
	const budget = computeAvailableBudget(money, league.team?.teamValue ?? 0);
	const predictionOwn = /* @__PURE__ */ new Map();
	const expectedOwn = /* @__PURE__ */ new Map();
	for (const teamPlayer of teamData.players) {
		const prediction = estimatePointsDetailed(teamPlayer.playerMaster, calendar, estimatorContext);
		predictionOwn.set(teamPlayer.playerMaster.id, {
			xp: prediction.xp,
			pStarter: prediction.pStarter,
			expectedMinutes: prediction.expectedMinutes
		});
		expectedOwn.set(teamPlayer.playerMaster.id, prediction.xp);
	}
	const referenceByPosition = buildPositionReference(teamData, expectedOwn);
	const referenceFor = (positionId) => referenceByPosition.get(positionId) ?? 0;
	for (const teamPlayer of teamData.players) {
		const player = teamPlayer.playerMaster;
		const expected = expectedOwn.get(player.id) ?? 0;
		const marketValueRatio = teamPlayer.buyoutClause / Math.max(player.marketValue, 1);
		const signals = externalSignals[player.id] || [];
		const external = combinedSignal(signals);
		const sellImpact = round1(Math.max(0, referenceFor(player.positionId) - expected));
		if (player.playerStatus !== "ok") {
			const trendNote = trendSignal(valueTrends?.get(player.id)).note;
			recommendations.push({
				id: `sell-${player.id}`,
				type: "sell",
				priority: "high",
				player,
				reason: `Está ${statusText(player.playerStatus)} y no aportará puntos esta jornada.`,
				details: `Cláusula actual: ${formatCurrency(teamPlayer.buyoutClause)}. Valor de mercado: ${formatCurrency(player.marketValue)}.${trendNote ? ` ${trendNote}` : ""}`,
				suggestedAction: "Ponlo a la venta o busca un sustituto.",
				externalSignals: signals,
				impactScore: sellImpact
			});
		} else if (marketValueRatio > 1.3 && expected < 3) {
			const trend = trendSignal(valueTrends?.get(player.id));
			recommendations.push({
				id: `sell-${player.id}`,
				type: "sell",
				priority: external.signal === "sell" || trend.direction === "falling" ? "high" : "medium",
				player,
				reason: "Su cláusula está muy por encima del valor de mercado y su rendimiento esperado es bajo.",
				details: `Cláusula: ${formatCurrency(teamPlayer.buyoutClause)} vs valor mercado ${formatCurrency(player.marketValue)}. Puntos esperados: ${expected.toFixed(1)}.${trend.note ? ` ${trend.note}` : ""}`,
				suggestedAction: "Evalúa venderlo para liberar dinero.",
				externalSignals: signals,
				impactScore: sellImpact
			});
		} else if (external.signal === "sell" && external.confidence >= SELL_NEWS_CONFIDENCE) {
			const negative = strongestNegativeSignal(signals);
			const categoryLabel = negative?.category ? categoryText(negative.category) : null;
			recommendations.push({
				id: `sell-news-${player.id}`,
				type: "sell",
				priority: negative?.category && HARD_NEGATIVE_CATEGORIES.has(negative.category) ? "high" : "medium",
				player,
				reason: categoryLabel ? `Noticias recientes: ${categoryLabel}. ${negative?.reason || ""}`.trim() : "Señales externas recomiendan vender por noticias o estadísticas recientes.",
				details: `Confianza: ${(external.confidence * 100).toFixed(0)}%. Cláusula actual: ${formatCurrency(teamPlayer.buyoutClause)}.`,
				suggestedAction: "Revisa la noticia y evalúa venderlo antes de que pierda valor.",
				externalSignals: signals,
				impactScore: round1(sellImpact * external.confidence)
			});
		} else {
			const pStarter = predictionOwn.get(player.id)?.pStarter ?? null;
			const isBenchHabitual = (starterInfo[player.id]?.score ?? .5) < SUBSTITUTE_SCORE;
			const isBenchThisWeek = pStarter !== null && pStarter < SUBSTITUTE_SCORE;
			if ((isBenchHabitual || isBenchThisWeek) && expected < 2.5) {
				const starter = starterInfo[player.id];
				const starterLabel = starter ? starter.label.toLowerCase() : "suplente";
				const thisWeekNote = isBenchThisWeek ? ` Probabilidad de titularidad esta jornada: ${Math.round((pStarter ?? 0) * 100)}%.` : "";
				recommendations.push({
					id: `sell-sub-${player.id}`,
					type: "sell",
					priority: isBenchThisWeek ? "medium" : "low",
					player,
					reason: `Es ${starterLabel} en su equipo y apenas suma puntos esta jornada.`,
					details: `Puntos esperados: ${expected.toFixed(1)}.${thisWeekNote} Valor de mercado: ${formatCurrency(player.marketValue)}.`,
					suggestedAction: "Véndelo para liberar dinero y una plaza para un titular.",
					externalSignals: signals,
					impactScore: sellImpact
				});
			}
		}
	}
	const needByPosition = new Map(ownNeeds.map((n) => [n.positionId, n.needScore]));
	const affordableMarket = market.filter((m) => m.salePrice <= budget.available && !teamPlayerIds.has(m.playerMaster.id) && m.playerMaster.playerStatus === "ok").filter((m) => {
		const ext = combinedSignal(externalSignals[m.playerMaster.id] || []);
		return !(ext.signal === "sell" && ext.confidence >= SELL_NEWS_CONFIDENCE);
	}).map((m) => {
		const prediction = estimatePointsDetailed(m.playerMaster, calendar, estimatorContext);
		return {
			...m,
			expectedPoints: prediction.xp,
			pStarter: prediction.pStarter,
			valueRatio: m.salePrice / Math.max(m.playerMaster.marketValue, 1),
			needScore: needByPosition.get(m.playerMaster.positionId) || 0,
			starterScore: starterScoreFromLastSeason(m.playerMaster.lastSeasonPoints)
		};
	}).sort((a, b) => {
		const starterFactorA = Math.min(1, .4 + .6 * (a.pStarter ?? a.starterScore));
		const starterFactorB = Math.min(1, .4 + .6 * (b.pStarter ?? b.starterScore));
		const scoreA = a.needScore * 2 + a.expectedPoints * starterFactorA / Math.max(a.valueRatio, .5);
		return b.needScore * 2 + b.expectedPoints * starterFactorB / Math.max(b.valueRatio, .5) - scoreA;
	}).slice(0, 10);
	for (const marketPlayer of affordableMarket) {
		const player = marketPlayer.playerMaster;
		const signals = externalSignals[player.id] || [];
		const external = combinedSignal(signals);
		const trend = trendSignal(valueTrends?.get(player.id));
		const isBargain = marketPlayer.valueRatio < .9;
		const coversNeed = marketPlayer.needScore > .3;
		const pStarter = marketPlayer.pStarter;
		const isBenchThisWeek = pStarter !== null && pStarter < SUBSTITUTE_SCORE;
		const starterNote = isBenchThisWeek ? ` Atención: probabilidad de titularidad ${Math.round(pStarter * 100)}% esta jornada.` : pStarter !== null ? ` Titularidad: ${Math.round(pStarter * 100)}%.` : "";
		const priority = trend.direction === "falling" || isBenchThisWeek ? "low" : isBargain || coversNeed || external.signal === "buy" || trend.direction === "rising" ? "high" : "medium";
		recommendations.push({
			id: `buy-${player.id}`,
			type: "buy",
			priority,
			player,
			reason: buildBuyReason(marketPlayer, coversNeed),
			details: `Puntos esperados: ${marketPlayer.expectedPoints.toFixed(1)}.${starterNote} Valor de mercado: ${formatCurrency(player.marketValue)}. Pujas: ${marketPlayer.numberOfBids}.${trend.note ? ` ${trend.note}` : ""}`,
			suggestedAction: isBenchThisWeek ? "Es suplente en el once probable; solo puja si crees que jugará o a largo plazo." : trend.direction === "falling" ? "Espera a que frene la bajada antes de pujar." : "Puja por él si encaja en tu esquema táctico.",
			estimatedValue: marketPlayer.salePrice,
			suggestedBidPrice: computeSuggestedBidPrice(marketPlayer.salePrice, player.marketValue, marketPlayer.numberOfBids, budget.available),
			externalSignals: signals,
			impactScore: round1(Math.max(0, marketPlayer.expectedPoints - referenceFor(player.positionId)))
		});
	}
	const replacementScore = (teamPlayer) => estimatePoints(teamPlayer.playerMaster, calendar, estimatorContext) * (.7 + .3 * (starterInfo[teamPlayer.playerMaster.id]?.score ?? .5));
	const lineupPlayers = [
		...lineup.formation.goalkeeper || [],
		...lineup.formation.defender || [],
		...lineup.formation.midfielder || [],
		...lineup.formation.attacker || []
	].map((entry) => entry.playerMaster);
	for (const lineupPlayer of lineupPlayers) {
		const signals = externalSignals[lineupPlayer.id] || [];
		const external = combinedSignal(signals);
		const newsRisk = external.signal === "sell" && external.confidence >= SELL_NEWS_CONFIDENCE;
		if (lineupPlayer.playerStatus !== "ok" || newsRisk) {
			const replacement = teamData.players.filter((p) => p.playerMaster.positionId === lineupPlayer.positionId && p.playerMaster.playerStatus === "ok" && p.playerMaster.id !== lineupPlayer.id && combinedSignal(externalSignals[p.playerMaster.id] || []).signal !== "sell").sort((a, b) => replacementScore(b) - replacementScore(a))[0];
			if (replacement) {
				const negative = newsRisk ? strongestNegativeSignal(signals) : void 0;
				const changeImpact = round1(Math.max(0, estimatePoints(replacement.playerMaster, calendar, estimatorContext) - estimatePoints(lineupPlayer, calendar, estimatorContext)));
				recommendations.push({
					id: `change-${lineupPlayer.id}`,
					type: "change_lineup",
					priority: "high",
					player: lineupPlayer,
					reason: lineupPlayer.playerStatus !== "ok" ? `Está ${statusText(lineupPlayer.playerStatus)} en la alineación titular.` : `Noticias negativas recientes${negative?.category ? ` (${categoryText(negative.category)})` : ""} sobre este titular.`,
					details: `Sustituto sugerido: ${replacement.playerMaster.nickname} (${replacement.playerMaster.position}).`,
					suggestedAction: `Cambia a ${replacement.playerMaster.nickname} en la alineación.`,
					externalSignals: newsRisk ? signals : void 0,
					impactScore: changeImpact
				});
			}
		}
	}
	if (league.config.features.buyoutClause) for (const risk of clauseRisks) {
		if (risk.riskScore < 30) continue;
		if (!Number.isFinite(risk.recommendedClause) || risk.recommendedClause <= 0) continue;
		const player = findPlayer(teamData, risk.playerId);
		if (!player) continue;
		const expected = expectedOwn.get(player.id) ?? 0;
		recommendations.push({
			id: `protect-${player.id}`,
			type: "protect_clause",
			priority: risk.riskScore >= 70 ? "high" : "medium",
			player,
			reason: `Riesgo ${risk.riskScore}/100 de que otro manager lo fiche pagando la cláusula.`,
			details: `${risk.rivalsThatCanAfford} rival${risk.rivalsThatCanAfford === 1 ? "" : "es"} puede pagar ${formatCurrency(risk.currentClause)}. Recomendado: ${formatCurrency(risk.recommendedClause)}.`,
			suggestedAction: `Sube la cláusula a ${formatCurrency(risk.recommendedClause)} para asegurarlo.`,
			recommendedClause: risk.recommendedClause,
			riskScore: risk.riskScore,
			impactScore: round1(risk.riskScore / 100 * Math.max(0, expected - referenceFor(player.positionId)))
		});
	}
	if (league.config.features.buyoutClause) {
		const buyoutCandidates = rivals.flatMap((rival) => rival.players.map((tp) => ({
			rival,
			tp
		}))).filter(({ tp }) => {
			const p = tp.playerMaster;
			if (teamPlayerIds.has(p.id)) return false;
			if (p.playerStatus !== "ok") return false;
			if (!(tp.buyoutClause > 0) || tp.buyoutClause > budget.available) return false;
			return getClauseProtection(tp).status === "available";
		}).map(({ rival, tp }) => {
			const p = tp.playerMaster;
			const prediction = estimatePointsDetailed(p, calendar, estimatorContext);
			const expected = prediction.xp;
			const pStarter = prediction.pStarter;
			const needScore = needByPosition.get(p.positionId) || 0;
			const clauseRatio = tp.buyoutClause / Math.max(p.marketValue, 1);
			const external = combinedSignal(externalSignals[p.id] || []);
			const starterScore = starterScoreFromLastSeason(p.lastSeasonPoints);
			const starterFactor = Math.min(1, .4 + .6 * (pStarter ?? starterScore));
			let score = needScore * 2 + expected * starterFactor / Math.max(clauseRatio, .5);
			if (external.signal === "sell" && external.confidence >= SELL_NEWS_CONFIDENCE) score *= .3;
			else if (external.signal === "buy") score *= 1.2;
			return {
				rival,
				tp,
				expected,
				pStarter,
				needScore,
				clauseRatio,
				external,
				score
			};
		}).filter((c) => c.score > 1.5).sort((a, b) => b.score - a.score).slice(0, 3);
		for (const candidate of buyoutCandidates) {
			const p = candidate.tp.playerMaster;
			const pStarter = candidate.pStarter;
			const isBenchThisWeek = pStarter !== null && pStarter < SUBSTITUTE_SCORE;
			const starterNote = isBenchThisWeek ? ` Atención: probabilidad de titularidad ${Math.round(pStarter * 100)}% esta jornada.` : pStarter !== null ? ` Titularidad: ${Math.round(pStarter * 100)}%.` : "";
			recommendations.push({
				id: `buyout-${p.id}`,
				type: "buyout",
				priority: isBenchThisWeek ? "medium" : candidate.needScore > .3 || candidate.clauseRatio < .9 ? "high" : "medium",
				player: p,
				reason: `Disponible para clausulazo en el equipo de ${candidate.rival.managerName}.`,
				details: `Cláusula: ${formatCurrency(candidate.tp.buyoutClause)} (valor de mercado ${formatCurrency(p.marketValue)}). Puntos esperados: ${candidate.expected.toFixed(1)}.${starterNote}${candidate.needScore > .3 ? " Cubre una necesidad de tu plantilla." : ""}`,
				suggestedAction: isBenchThisWeek ? `Es suplente en el once probable; valora si merece pagar ${formatCurrency(candidate.tp.buyoutClause)}.` : `Paga su cláusula de ${formatCurrency(candidate.tp.buyoutClause)} antes de que la suban o lo blinden.`,
				estimatedValue: candidate.tp.buyoutClause,
				ownerName: candidate.rival.managerName,
				externalSignals: externalSignals[p.id] || [],
				impactScore: round1(Math.max(0, candidate.expected - referenceFor(p.positionId)))
			});
		}
	}
	if (league.config.premiumFeatures.captain !== false && captain?.captain) {
		const cap = captain.captain;
		const bestAlternative = captain.alternatives[0];
		const captainImpact = round1(bestAlternative ? Math.max(0, cap.expectedPoints - bestAlternative.expectedPoints) : cap.expectedPoints);
		recommendations.push({
			id: `captain-${cap.player.id}`,
			type: "captain",
			priority: "high",
			player: cap.player,
			reason: `Mejor candidato a capitán para esta jornada: ${cap.reasoning}.`,
			details: captain.alternatives.length > 0 ? `Alternativas: ${captain.alternatives.map((a) => a.player.nickname).join(", ")}.` : "No hay alternativas claras.",
			suggestedAction: "Asígnale el brazalete de capitán para duplicar sus puntos.",
			impactScore: captainImpact
		});
	}
	return dedupeByPlayer(recommendations).map((rec) => ({
		...rec,
		source: rec.source ?? (rec.type === "buy" ? "market" : rec.type === "buyout" ? "rival" : "squad")
	})).sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority));
}
/**
* Selecciona los mejores movimientos de la jornada: top 5 por impacto (ΔxP en
* puntos) con diversidad de tipos (máx. 2 por tipo), cubriendo plantilla,
* mercado y rivales.
*/
function computeBestMoves(recommendations) {
	const sorted = [...recommendations].sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0));
	const picks = [];
	const perType = /* @__PURE__ */ new Map();
	for (const rec of sorted) {
		if ((rec.impactScore ?? 0) < MIN_IMPACT_XP) continue;
		const count = perType.get(rec.type) || 0;
		if (count >= 2) continue;
		perType.set(rec.type, count + 1);
		picks.push(rec);
		if (picks.length >= 5) break;
	}
	return picks;
}
/**
* Deduplicación por jugador (§5.4): una acción coherente por jugador, la de
* mayor ΔxP. Evita recomendaciones contradictorias (p. ej. vender y proteger
* la cláusula del mismo jugador a la vez).
*/
function dedupeByPlayer(recommendations) {
	const byPlayer = /* @__PURE__ */ new Map();
	for (const rec of recommendations) {
		const existing = byPlayer.get(rec.player.id);
		if (!existing || (rec.impactScore ?? 0) > (existing.impactScore ?? 0)) byPlayer.set(rec.player.id, rec);
	}
	return [...byPlayer.values()];
}
/** Media de puntos esperados de los jugadores sanos de la plantilla por posición. */
function buildPositionReference(teamData, expectedOwn) {
	const sum = /* @__PURE__ */ new Map();
	const count = /* @__PURE__ */ new Map();
	for (const teamPlayer of teamData.players) {
		const player = teamPlayer.playerMaster;
		if (player.playerStatus !== "ok") continue;
		const expected = expectedOwn.get(player.id);
		if (expected === void 0) continue;
		sum.set(player.positionId, (sum.get(player.positionId) || 0) + expected);
		count.set(player.positionId, (count.get(player.positionId) || 0) + 1);
	}
	const reference = /* @__PURE__ */ new Map();
	for (const [positionId, total] of sum) reference.set(positionId, total / Math.max(count.get(positionId) || 0, 1));
	return reference;
}
function buildBuyReason(marketPlayer, coversNeed) {
	return `${marketPlayer.valueRatio < .9 ? "Oportunidad de mercado por debajo de su valor." : "Opción de mercado a precio ajustado."}${coversNeed ? " Cubre una necesidad de tu plantilla." : ""}`;
}
function findPlayer(teamData, playerId) {
	return teamData.players.find((p) => p.playerMaster.id === playerId)?.playerMaster;
}
function strongestNegativeSignal(signals) {
	return signals.filter((s) => s.signal === "sell").sort((a, b) => b.confidence - a.confidence)[0];
}
function categoryText(category) {
	switch (category) {
		case "injury": return "posible lesión";
		case "illness": return "enfermo o indispuesto";
		case "suspension": return "posible sanción";
		case "doubt": return "duda para el próximo partido";
		case "return": return "vuelve de una baja";
		case "form": return "gran momento de forma";
		case "rotation": return "riesgo de rotación";
		case "transfer": return "rumores de mercado";
		default: return category;
	}
}
function statusText(status) {
	switch (status) {
		case "doubtful": return "dudoso";
		case "injured": return "lesionado";
		case "out_of_league": return "fuera de la liga";
		default: return status;
	}
}
function priorityWeight(priority) {
	switch (priority) {
		case "high": return 3;
		case "medium": return 2;
		case "low": return 1;
		default: return 0;
	}
}
//#endregion
//#region src/lib/engine/sources/futbolfantasy.ts
/**
* Adaptador FútbolFantasy Analytics — Mercado (§3.2, riesgo medio): tendencia
* de valor de cada jugador de LaLiga Fantasy (variación € y % a 1/7 días e
* indicador de tendencia). Base del timing de compra/venta (§5.4): comprar
* antes de subidas, vender antes de bajadas.
*
* Estructura verificada (agosto 2026): tabla HTML con una fila `<tr>` por
* jugador con atributos data-tendencia, data-diferencia1/7 (€) y
* data-diferencia-pct1/7 (%); nombre en `.player-name span`, equipo en
* `.player-equipo span` y posición en la clase `icon-{POR|DFC|MED|DEL}`.
* La página es grande (~3,5 MB): una sola petición cada 12 h.
*/
var URL = "https://www.futbolfantasy.com/analytics/laliga-fantasy/mercado";
var TTL_MS = 432e5;
function parseTrendRows(html) {
	const trends = [];
	for (const m of html.matchAll(/<tr[^>]*data-tendencia="(-?\d+)"[^>]*data-aceleracion="[^"]*"[^>]*data-diferencia1="(-?\d+)"[^>]*data-diferencia2="[^"]*"[^>]*data-diferencia3="[^"]*"[^>]*data-diferencia7="(-?\d+)"[^>]*data-diferencia14="[^"]*"[^>]*data-diferencia30="[^"]*"[^>]*data-diferencia-pct1="([^"]*)"[^>]*data-diferencia-pct2="[^"]*"[^>]*data-diferencia-pct3="[^"]*"[^>]*data-diferencia-pct7="([^"]*)"[\s\S]*?(?=<tr[^>]*data-tendencia=|$)/g)) {
		const row = m[0];
		const name = /<span class="d-none d-md-inline">([^<]+)<\/span>/.exec(row)?.[1];
		const team = /<div class="player-equipo">[\s\S]*?<span>([^<]+)<\/span>/.exec(row)?.[1];
		const position = /class="icon icon-([A-Z]+)"/.exec(row)?.[1];
		if (!name || !team) continue;
		trends.push({
			playerName: name.trim(),
			sourceTeamName: team.trim(),
			positionCode: position ?? "",
			trendScore: Number(m[1]) || 0,
			diff1d: Number(m[2]) || 0,
			diff7d: Number(m[3]) || 0,
			pct1d: Number(m[4]) || 0,
			pct7d: Number(m[5]) || 0
		});
	}
	return trends;
}
/**
* Descarga y cruza las tendencias con el catálogo oficial (nombre + equipo).
* El mismo jugador puede aparecer en varias tablas de la página: se conserva
* la primera aparición.
*/
async function fetchValueTrends(officialPlayers, officialTeams) {
	const fetched = await fetchTextWithCache("ff-analytics-mercado", URL, TTL_MS);
	if (!fetched) return null;
	const rows = parseTrendRows(fetched.text);
	if (rows.length === 0) {
		console.warn("[futbolfantasy] página sin filas de tendencias (¿estructura cambiada?)");
		return null;
	}
	const matchTeam = buildTeamMatcher(officialTeams);
	const entries = [];
	for (const player of officialPlayers) {
		const forms = /* @__PURE__ */ new Set();
		if (player.name) forms.add(normalizePlayerName(player.name));
		if (player.nickname) forms.add(normalizePlayerName(player.nickname));
		for (const norm of forms) if (norm) entries.push({
			player,
			norm
		});
	}
	const findPlayer = (row, teamId) => {
		const ffNorm = normalizePlayerName(row.playerName);
		if (!ffNorm) return void 0;
		const byTeam = (list) => list.filter((e) => teamId === null || Number(e.player.teamId) === teamId);
		const exact = byTeam(entries.filter((e) => e.norm === ffNorm));
		if (exact.length > 0) return exact[0].player;
		const contained = byTeam(entries.filter((e) => {
			const shorter = e.norm.length <= ffNorm.length ? e.norm : ffNorm;
			const longer = e.norm.length <= ffNorm.length ? ffNorm : e.norm;
			return shorter.split(" ").length >= 2 && longer.includes(shorter);
		}));
		if (contained.length > 0) return contained[0].player;
		const surname = ffNorm.split(" ").pop() ?? ffNorm;
		if (surname.length >= 3) {
			const bySurname = byTeam(entries.filter((e) => e.norm.split(" ").includes(surname)));
			if ([...new Set(bySurname.map((e) => e.player.id))].length === 1) return bySurname[0].player;
		}
	};
	const trendsByPlayerId = /* @__PURE__ */ new Map();
	let unmatched = 0;
	for (const row of rows) {
		const player = findPlayer(row, matchTeam(row.sourceTeamName));
		if (!player || trendsByPlayerId.has(player.id)) {
			if (!player) unmatched += 1;
			continue;
		}
		trendsByPlayerId.set(player.id, row);
	}
	return {
		trendsByPlayerId,
		matched: trendsByPlayerId.size,
		unmatched,
		origin: fetched.origin
	};
}
//#endregion
//#region src/lib/engine/scoring-table.ts
function median(values) {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
/**
* Deriva la tabla de puntuación a partir de las jornadas de varios jugadores.
* `statsByPlayer` es playerId -> playerStats junto a su positionId.
* Devuelve null si no hay ninguna muestra (p. ej. pretemporada).
*/
function deriveScoringTable(entries) {
	const ratios = /* @__PURE__ */ new Map();
	for (const { positionId, playerStats } of entries) for (const week of playerStats) for (const [stat, tuple] of Object.entries(week.stats || {})) {
		const value = tuple?.[0] ?? 0;
		const points = tuple?.[1] ?? 0;
		if (value === 0) continue;
		let byStat = ratios.get(positionId);
		if (!byStat) ratios.set(positionId, byStat = /* @__PURE__ */ new Map());
		let list = byStat.get(stat);
		if (!list) byStat.set(stat, list = []);
		list.push(points / value);
	}
	if (ratios.size === 0) return null;
	const table = {
		byPosition: {},
		samples: {},
		derivedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
	for (const [positionId, byStat] of ratios) {
		table.byPosition[positionId] = {};
		table.samples[positionId] = {};
		for (const [stat, list] of byStat) {
			table.byPosition[positionId][stat] = median(list);
			table.samples[positionId][stat] = list.length;
		}
	}
	return table;
}
//#endregion
//#region src/lib/engine/snapshots.ts
/**
* Snapshot diario (§7.2 del diseño): catálogo de jugadores (valor, puntos,
* estado) y mercado de la liga, en data/snapshots/YYYY-MM-DD.json. Es la base
* de las tendencias de valor, el comportamiento rival y el backtesting.
*
* Se escribe como mucho una vez al día (si ya existe el fichero de hoy, no se
* toca). Formato JSON único por día: volumen pequeño (~cientos de jugadores),
* sin dependencias.
*/
var SNAPSHOT_DIR = path.join(process.cwd(), "data", "snapshots");
function slimPlayer(p) {
	return {
		id: p.id,
		teamId: Number(p.teamId) || void 0,
		positionId: Number(p.positionId) || 0,
		marketValue: Number(p.marketValue) || 0,
		points: Number(p.points) || 0,
		averagePoints: Number(p.averagePoints) || 0,
		lastSeasonPoints: Number(p.lastSeasonPoints) || 0,
		playerStatus: p.playerStatus
	};
}
function slimMarketPlayer(m) {
	return {
		marketId: m.id,
		playerId: m.playerMaster.id,
		salePrice: Number(m.salePrice) || 0,
		numberOfBids: Number(m.numberOfBids) || 0,
		numberOfOffers: m.numberOfOffers,
		directOffer: m.directOffer,
		expirationDate: m.expirationDate,
		sellerManagerName: m.sellerTeam?.manager?.managerName,
		marketValue: Number(m.playerMaster.marketValue) || 0,
		playerStatus: m.playerMaster.playerStatus
	};
}
/**
* Escribe el snapshot de hoy si no existe. Devuelve true si se ha escrito.
* Nunca lanza: un fallo de disco no debe romper la request que lo dispara.
*/
async function maybeWriteDailySnapshot(input) {
	try {
		const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
		const file = path.join(SNAPSHOT_DIR, `${date}.json`);
		if (existsSync(file)) return false;
		const snapshot = {
			date,
			leagueId: input.leagueId,
			week: input.week,
			catalog: input.allPlayers.map(slimPlayer),
			market: input.market.map(slimMarketPlayer)
		};
		await mkdir(SNAPSHOT_DIR, { recursive: true });
		await writeFile(file, JSON.stringify(snapshot));
		console.log(`[snapshots] daily snapshot written: ${file} (${snapshot.catalog.length} jugadores, ${snapshot.market.length} en mercado)`);
		return true;
	} catch (error) {
		console.warn("[snapshots] write failed:", error instanceof Error ? error.message : error);
		return false;
	}
}
//#endregion
//#region src/lib/engine/optimize.ts
/**
* Planificador multi-jornada (§5.3 del diseño): planifica fichajes, onces y
* capitanes varias jornadas por delante maximizando
*
*   Σ_w [ puntos del once_w + bonus de capitán_w − fricción × nº movimientos_w
*         + bonus de holdeo × jugadores mantenidos_w ]
*
* sujeto a presupuesto dinámico (el dinero no gastado una jornada pasa a la
* siguiente, siempre bajo la regla efectivo + 20% del valor de plantilla) y a
* un tope de movimientos por jornada para evitar recomendar rotar el equipo
* completo cada semana.
*
* Implementación: DP sobre los frentes de Pareto (coste, puntos) de cada
* jornada (los del esquema táctico), con el efectivo como estado. Es la
* versión exacta del MILP del diseño para este tamaño, sin dependencias
* externas de solver.
*
* Simplificaciones v1 (anotadas en `note`): no se modelan ventas (el dinero
* solo entra por el crédito semanal), el mercado se asume congelado entre
* jornadas, y xMins solo usa onces probables de la jornada actual.
*/
/** Tope del frente semanal tras muestrear por coste (el DP crece con su tamaño). */
var FRONT_SAMPLE = 60;
/** Tope de estados del DP por jornada (poda por valor). */
var DP_STATE_CAP = 200;
function captainBonus(members) {
	return members.length > 0 ? Math.max(...members.map((m) => m.expectedPoints)) : 0;
}
/** Muestreo uniforme por coste del frente unido de todas las formaciones. */
function sampleWeekFront(fronts) {
	const union = fronts.flatMap(({ formation, front }) => front.map((combo) => ({
		formation,
		cost: combo.cost,
		points: combo.points,
		members: combo.members
	})));
	union.sort((a, b) => a.cost - b.cost || b.points - a.points);
	const pareto = [];
	let bestPoints = -Infinity;
	for (const combo of union) if (combo.points > bestPoints) {
		pareto.push(combo);
		bestPoints = combo.points;
	}
	if (pareto.length <= FRONT_SAMPLE) return pareto;
	const step = pareto.length / FRONT_SAMPLE;
	return pareto.filter((_, i) => i % step < 1 || i === pareto.length - 1);
}
function planMultiWeek(input, calendars, budgetAvailable) {
	const weekly = calendars.map(({ week, matches }) => {
		const context = input.context ? {
			...input.context,
			weekNumber: week,
			probableLineups: week === input.context.weekNumber ? input.context.probableLineups : void 0,
			injuryReport: week === input.context.weekNumber ? input.context.injuryReport : void 0
		} : void 0;
		return {
			week,
			combos: sampleWeekFront(computeFormationFronts({
				...input,
				calendar: matches,
				context
			}))
		};
	});
	if (weekly.some((w) => w.combos.length === 0)) return void 0;
	const params = getEngineParams();
	const initialOwned = new Set(input.squad.map((tp) => tp.playerMaster.id));
	let states = /* @__PURE__ */ new Map([[budgetAvailable, {
		value: 0,
		ownedIds: initialOwned,
		path: []
	}]]);
	for (const { combos } of weekly) {
		const next = /* @__PURE__ */ new Map();
		for (const [cash, state] of states) for (const combo of combos) {
			const newMembers = combo.members.filter((m) => m.source !== "squad" && !state.ownedIds.has(m.player.id));
			if (newMembers.length > params.maxMovesPerWeek) continue;
			const effectiveCost = newMembers.reduce((sum, m) => sum + m.cost, 0);
			if (effectiveCost > cash) continue;
			const heldIds = combo.members.filter((m) => state.ownedIds.has(m.player.id)).map((m) => m.player.id);
			const holdBonus = params.holdBonusXp * new Set(heldIds).size;
			const gain = combo.points + (input.captainEnabled ? captainBonus(combo.members) : 0) - params.moveFrictionXp * newMembers.length + holdBonus;
			const cashAfter = cash - effectiveCost;
			const value = state.value + gain;
			const existing = next.get(cashAfter);
			if (!existing || value > existing.value) {
				const ownedIds = new Set(state.ownedIds);
				for (const m of newMembers) ownedIds.add(m.player.id);
				for (const m of combo.members) ownedIds.add(m.player.id);
				next.set(cashAfter, {
					value,
					ownedIds,
					path: [...state.path, {
						combo,
						cashAfter,
						ownedIds
					}]
				});
			}
		}
		if (next.size > DP_STATE_CAP) {
			const sorted = [...next.entries()].sort((a, b) => b[1].value - a[1].value).slice(0, DP_STATE_CAP);
			states = new Map(sorted);
		} else states = next;
		if (states.size === 0) return void 0;
	}
	const best = [...states.values()].reduce((a, b) => b.value > a.value ? b : a);
	const weeks = best.path.map(({ combo, cashAfter, ownedIds }, i) => {
		const captain = input.captainEnabled && combo.members.length > 0 ? combo.members.reduce((a, b) => b.expectedPoints > a.expectedPoints ? b : a) : void 0;
		const previouslyOwned = i > 0 ? best.path[i - 1].ownedIds : /* @__PURE__ */ new Set();
		return {
			week: weekly[i].week,
			formation: combo.formation,
			starters: [...combo.members].sort((a, b) => a.player.positionId - b.player.positionId || b.expectedPoints - a.expectedPoints),
			captain,
			moves: combo.members.filter((m) => m.source !== "squad" && !previouslyOwned.has(m.player.id)).map((m) => ({
				type: m.source === "market" ? "buy_market" : "pay_clause",
				player: m.player,
				cost: m.cost,
				sellerManagerName: m.sellerManagerName
			})),
			expectedPoints: Math.round((combo.points + (input.captainEnabled ? captainBonus(combo.members) : 0)) * 10) / 10,
			cashAfter
		};
	});
	const totalMoves = weeks.reduce((sum, w) => sum + w.moves.length, 0);
	return {
		weeks,
		totalExpected: Math.round(best.value * 10) / 10,
		totalMoves,
		note: `Plan multi-jornada con presupuesto dinámico, máximo ${params.maxMovesPerWeek} fichajes/clausulazos por jornada y bonus de holdeo (${params.holdBonusXp} pts/jugador mantenido) para evitar rotar el equipo cada semana. Sin ventas ni límite de plazas modelados, mercado congelado y xMins con onces probables solo en la jornada actual.`
	};
}
//#endregion
//#region src/lib/engine/calibrate.ts
/**
* Calibración automática de pesos por backtesting walk-forward (§8, Fase 3):
* búsqueda en rejilla sobre los parámetros calibrables del motor (k de
* shrinkage × divisor Elo) minimizando el MAE de las predicciones jugador-
* jornada, prediciendo cada jornada SOLO con información anterior a ella.
*
* La replay usa exactamente `predictPlayerPoints` (el código de producción
* con overrides de parámetros): lo que se evalúa es lo que se ejecuta.
*
* Se activa sola cuando hay suficientes muestras liquidadas (≥ MIN_SAMPLES
* predicciones jugador-jornada); con menos, devuelve 'insufficient-data' y no
* toca los parámetros en producción.
*/
var MIN_SAMPLES = 30;
var GRID_SHRINKAGE_K = [
	3,
	5,
	8,
	12
];
var GRID_ELO_DIVISOR = [
	600,
	1e3,
	1400
];
var CALIBRATION_FILE = path.join(process.cwd(), "data", "track-record", "calibration-latest.json");
/** Muestras jugador-jornada con al menos 2 jornadas previas de historial. */
function buildSamples(statsByPlayer, playersById) {
	const samples = [];
	for (const [playerId, stats] of Object.entries(statsByPlayer)) {
		const player = playersById.get(playerId);
		if (!player) continue;
		const sorted = [...stats].sort((a, b) => a.weekNumber - b.weekNumber);
		for (let i = 2; i < sorted.length; i++) {
			const target = sorted[i];
			if (typeof target.totalPoints !== "number") continue;
			samples.push({
				player,
				week: target.weekNumber,
				priorStats: sorted.slice(0, i),
				actualPoints: target.totalPoints
			});
		}
	}
	return samples;
}
async function calibrateEngine(input) {
	const { statsByPlayer, playersById, calendarsByWeek, context } = input;
	const currentParams = input.currentParams ?? DEFAULT_ENGINE_PARAMS;
	const samples = buildSamples(statsByPlayer, playersById);
	if (samples.length < MIN_SAMPLES) return {
		status: "insufficient-data",
		samples: samples.length,
		note: `Hacen falta al menos ${MIN_SAMPLES} muestras jugador-jornada liquidadas (hay ${samples.length}). La calibración se activará sola al acumular jornadas.`,
		computedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
	const grid = [];
	for (const shrinkageK of GRID_SHRINKAGE_K) for (const eloDiffDivisor of GRID_ELO_DIVISOR) {
		const errors = [];
		for (const sample of samples) {
			const prediction = predictPlayerPoints(sample.player, calendarsByWeek.get(sample.week) ?? [], {
				...context,
				playerStats: { [sample.player.id]: sample.priorStats },
				weekNumber: sample.week,
				paramOverrides: {
					shrinkageK,
					eloDiffDivisor
				}
			});
			errors.push(Math.abs(prediction.xp - sample.actualPoints));
		}
		const mae = errors.reduce((sum, e) => sum + e, 0) / Math.max(errors.length, 1);
		grid.push({
			shrinkageK,
			eloDiffDivisor,
			mae: Math.round(mae * 1e3) / 1e3
		});
	}
	const best = grid.reduce((a, b) => b.mae < a.mae ? b : a);
	const baselineMae = grid.find((g) => g.shrinkageK === currentParams.shrinkageK && g.eloDiffDivisor === currentParams.eloDiffDivisor)?.mae ?? null;
	let applied = false;
	if (baselineMae !== null && best.mae < baselineMae) {
		await saveEngineParams({
			...currentParams,
			shrinkageK: best.shrinkageK,
			eloDiffDivisor: best.eloDiffDivisor
		});
		applied = true;
	}
	return {
		status: "ok",
		samples: samples.length,
		best,
		baselineMae: baselineMae ?? void 0,
		grid,
		note: applied ? `Parámetros actualizados (MAE ${baselineMae} → ${best.mae}).` : "Los parámetros en producción ya son los mejores de la rejilla; sin cambios.",
		computedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
}
async function persistCalibration(result) {
	await mkdir(path.dirname(CALIBRATION_FILE), { recursive: true });
	await writeFile(CALIBRATION_FILE, JSON.stringify(result, null, 2));
}
//#endregion
//#region src/lib/fantasy/calendar-cache.ts
/**
* Caché en disco de calendarios por jornada (data/cache/calendar/w{N}.json).
* Las jornadas pasadas son inmutables (TTL infinito); la actual caduca en 6 h.
* La usa el backtesting walk-forward (calibración, Fase 3) para no repetir
* peticiones a la API oficial.
*/
var CACHE_DIR = path.join(process.cwd(), "data", "cache", "calendar");
var CURRENT_TTL_MS = 216e5;
async function readCache(week, currentWeek) {
	try {
		const raw = JSON.parse(await readFile(path.join(CACHE_DIR, `w${week}.json`), "utf8"));
		if (!Array.isArray(raw.matches)) return null;
		if (week === currentWeek && Date.now() - raw.fetchedAt > CURRENT_TTL_MS) return null;
		return raw.matches;
	} catch {
		return null;
	}
}
async function fetchCalendarCached(week, currentWeek, token) {
	const cached = await readCache(week, currentWeek);
	if (cached) return cached;
	try {
		const matches = await fetchOfficialAPI(`${CMP}/calendar`, token, { weekNumber: String(week) });
		if (Array.isArray(matches) && matches.length > 0) {
			await mkdir(CACHE_DIR, { recursive: true });
			await writeFile(path.join(CACHE_DIR, `w${week}.json`), JSON.stringify({
				fetchedAt: Date.now(),
				matches
			}));
			return matches;
		}
	} catch (error) {
		console.warn(`[calendar-cache] week ${week} fetch failed:`, error instanceof Error ? error.message : error);
	}
	return [];
}
//#endregion
//#region src/pages/api/recommendations.ts
var recommendations_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
/** Plantilla + mejores candidatos de mercado y clausulables (acotado para no multiplicar peticiones). */
var MARKET_STATS_UNIVERSE = 20;
var CLAUSE_STATS_UNIVERSE = 15;
/** Proxy de rendimiento por partido para pre-rankear candidatos sin stats. */
function recentPointsPerGame(player) {
	return Math.max(Number(player.averagePoints) || 0, (Number(player.lastSeasonPoints) || 0) / 38);
}
function round2(value) {
	return Math.round(value * 100) / 100;
}
var GET = async ({ url, cookies, session }) => {
	try {
		const leagueId = url.searchParams.get("leagueId");
		const teamIdParam = url.searchParams.get("teamId");
		if (!leagueId || !teamIdParam) return new Response(JSON.stringify({ error: "leagueId and teamId required" }), { status: 400 });
		const teamId = parseInt(teamIdParam, 10);
		const token = await getToken(cookies, session);
		if (!token) return new Response(JSON.stringify({ error: "No token configured" }), { status: 401 });
		await loadEngineParams();
		const [leagues, teamData, lineup, money, rawMarket, standing, week, allPlayers] = await Promise.all([
			fetchOfficialAPI(`${CMP}/leagues`, token),
			fetchOfficialAPI(`${CMP}/leagues/${leagueId}/teams/${teamId}`, token),
			fetchOfficialAPI(`${CMP}/teams/${teamId}/lineup`, token),
			fetchOfficialAPI(`${CMP}/teams/${teamId}/money`, token),
			fetchOfficialAPI(`${CMP}/league/${leagueId}/market`, token),
			fetchOfficialAPI(`${CMP}/leagues/${leagueId}/standing`, token),
			fetchOfficialAPI(`${CMP}/week/current`, token),
			fetchOfficialAPI(`${CMP}/players`, token)
		]);
		const market = enrichMarketPlayers(rawMarket, allPlayers);
		const currentWeek = week?.number ?? week?.weekNumber ?? 1;
		const calendar = await fetchOfficialAPI(`${CMP}/calendar`, token, { weekNumber: String(currentWeek) });
		const league = leagues.find((l) => l.id === leagueId);
		if (!league) return new Response(JSON.stringify({ error: "League not found" }), { status: 404 });
		const officialTeams = await fetchTeamsMaster(token);
		const teamElos = officialTeams.length > 0 ? await fetchTeamElos(officialTeams) : null;
		if (teamElos && teamElos.origin === "stale") console.warn("[recommendations] ClubElo en modo stale (caché caducada).");
		const leagueActivity = await fetchLeagueActivity(leagueId, token);
		const probableData = officialTeams.length > 0 ? await fetchProbableLineups(officialTeams) : null;
		const probableLineups = /* @__PURE__ */ new Map();
		if (probableData) {
			const matchTeam = buildTeamMatcher(officialTeams);
			for (const match of probableData.matches) for (const lineup of match.lineups) {
				const lineupTeamId = matchTeam(lineup.sourceTeamName);
				if (lineupTeamId !== null) probableLineups.set(lineupTeamId, lineup);
			}
		}
		const valueTrends = officialTeams.length > 0 ? await fetchValueTrends(allPlayers, officialTeams) : null;
		if (valueTrends) console.log(`[recommendations] tendencias FF: ${valueTrends.matched} cruzadas, ${valueTrends.unmatched} sin cruzar (${valueTrends.origin})`);
		const confirmedList = await fetchConfirmedLineups();
		const confirmedLineups = /* @__PURE__ */ new Map();
		if (confirmedList.length > 0 && officialTeams.length > 0) {
			const matchTeam = buildTeamMatcher(officialTeams);
			for (const lineup of confirmedList) {
				const lineupTeamId = matchTeam(lineup.sourceTeamName);
				if (lineupTeamId !== null) confirmedLineups.set(lineupTeamId, lineup);
			}
			console.log(`[recommendations] alineaciones confirmadas (Sofascore): ${confirmedLineups.size} equipos`);
		}
		const analysis = await buildLeagueAnalysis(league, teamData, lineup, money, market, standing, week, calendar, allPlayers, {
			fetchTeamData: (lid, tid) => fetchOfficialAPI(`${CMP}/leagues/${lid}/teams/${tid}`, token),
			fetchTeamMoney: (tid) => fetchOfficialAPI(`${CMP}/teams/${tid}/money`, token)
		});
		const ownPlayerIds = new Set(teamData.players.map((p) => p.playerMaster.id));
		const interestingPlayers = [...teamData.players.map((p) => p.playerMaster), ...market.filter((m) => !ownPlayerIds.has(m.playerMaster.id)).map((m) => m.playerMaster)].map((p) => ({
			id: p.id,
			name: p.name,
			nickname: p.nickname,
			teamName: p.team?.name
		}));
		const externalResult = await fetchExternalSignals(interestingPlayers);
		analysis.externalSignals = externalResult.signals;
		analysis.leagueActivity = leagueActivity;
		const detailFetcher = (playerId) => fetchOfficialAPI(`${CMP}/player/${playerId}/league/${leagueId}`, token);
		const budget = computeAvailableBudget(money, league.team?.teamValue ?? 0);
		const marketCandidates = market.filter((m) => m.salePrice <= budget.available && !ownPlayerIds.has(m.playerMaster.id) && m.playerMaster.playerStatus === "ok").map((m) => m.playerMaster).sort((a, b) => recentPointsPerGame(b) - recentPointsPerGame(a)).slice(0, MARKET_STATS_UNIVERSE);
		const clauseCandidates = analysis.rivals.flatMap((rival) => rival.players).filter((tp) => {
			const player = tp.playerMaster;
			if (ownPlayerIds.has(player.id) || player.playerStatus !== "ok") return false;
			if (!(tp.buyoutClause > 0) || tp.buyoutClause > budget.available) return false;
			return getClauseProtection(tp).status === "available";
		}).map((tp) => tp.playerMaster).sort((a, b) => recentPointsPerGame(b) - recentPointsPerGame(a)).slice(0, CLAUSE_STATS_UNIVERSE);
		const statsUniverse = [
			...teamData.players.map((p) => p.playerMaster),
			...marketCandidates,
			...clauseCandidates
		];
		const statsMap = await fetchPlayerStats(statsUniverse, detailFetcher);
		analysis.starterInfo = await fetchStarterInfo(teamData.players.map((p) => p.playerMaster), detailFetcher);
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
		analysis.clauseRisks = analyzeClauseRisks(analysis, estimatorContext);
		analysis.captain = league.config?.premiumFeatures?.captain === false ? void 0 : recommendCaptain(analysis, estimatorContext);
		const formations = await fetchAvailableFormations(token, league.config?.premiumFeatures?.formations === true);
		const captainEnabled = league.config?.premiumFeatures?.captain === true;
		analysis.optimalLineup = computeOptimalLineup({
			squad: teamData.players,
			currentLineup: lineup,
			calendar,
			formations,
			context: estimatorContext,
			captainEnabled
		});
		const schemeInput = {
			squad: teamData.players,
			market,
			rivals: analysis.rivals,
			money,
			teamValue: league.team?.teamValue ?? 0,
			buyoutClauseEnabled: league.config?.features?.buyoutClause ?? false,
			calendar,
			formations,
			context: estimatorContext,
			captainEnabled
		};
		const tacticalScheme = computeTacticalScheme(schemeInput);
		let multiWeekPlan;
		try {
			const futureCalendars = await Promise.all([currentWeek + 1, currentWeek + 2].map((w) => fetchOfficialAPI(`${CMP}/calendar`, token, { weekNumber: String(w) }).catch(() => [])));
			const calendars = [{
				week: currentWeek,
				matches: calendar
			}, ...futureCalendars.map((matches, i) => ({
				week: currentWeek + 1 + i,
				matches
			}))].filter((c) => c.matches.length > 0);
			if (calendars.length > 1) multiWeekPlan = planMultiWeek(schemeInput, calendars, budget.available) ?? void 0;
		} catch (planError) {
			console.warn("[recommendations] multi-week plan failed:", planError instanceof Error ? planError.message : planError);
		}
		const recommendations = generateRecommendations({
			analysis,
			estimatorContext,
			valueTrends: valueTrends?.trendsByPlayerId
		});
		const bestMoves = computeBestMoves(recommendations);
		try {
			await maybeWriteDailySnapshot({
				leagueId,
				week: currentWeek,
				allPlayers,
				market
			});
			const recordedAt = (/* @__PURE__ */ new Date()).toISOString();
			const predictionRecords = statsUniverse.map((player) => {
				const prediction = estimatePointsDetailed(player, calendar, estimatorContext);
				const playerTeamId = resolveTeamId(player);
				const homeMatch = playerTeamId !== void 0 ? calendar.find((m) => m.localId === playerTeamId) : void 0;
				const awayMatch = playerTeamId !== void 0 ? calendar.find((m) => m.visitorId === playerTeamId) : void 0;
				return {
					playerId: player.id,
					week: currentWeek,
					leagueId,
					recordedAt,
					modelVersion: MODEL_VERSION,
					xp: round2(prediction.xp),
					xpLegacy: round2(estimatePointsLegacy(player, calendar, estimatorContext)),
					expectedMinutes: prediction.expectedMinutes !== null ? Math.round(prediction.expectedMinutes) : null,
					pStarter: prediction.pStarter !== null ? round2(prediction.pStarter) : null,
					source: prediction.source,
					dataQuality: prediction.dataQuality.level,
					context: {
						positionId: player.positionId,
						teamId: playerTeamId,
						opponentTeamId: homeMatch ? homeMatch.visitorId : awayMatch ? awayMatch.localId : void 0,
						isHome: homeMatch ? true : awayMatch ? false : void 0
					},
					actualPoints: null,
					settledAt: null
				};
			});
			const predictionsResult = await persistPredictions(currentWeek, predictionRecords);
			const recommendationRecords = recommendations.map((rec) => ({
				playerId: rec.player.id,
				week: currentWeek,
				leagueId,
				teamId,
				recordedAt,
				modelVersion: MODEL_VERSION,
				type: rec.type,
				deltaXp: round2(rec.impactScore ?? 0),
				price: rec.estimatedValue,
				actualPoints: null,
				settledAt: null
			}));
			const recommendationsResult = await persistRecommendations(currentWeek, recommendationRecords);
			const resolveOutcome = async (playerId, weekNumber) => {
				let stats = statsMap[playerId];
				if (!stats) stats = (await fetchPlayerStats([{ id: playerId }], detailFetcher))[playerId] || [];
				const entry = stats.find((s) => s.weekNumber === weekNumber);
				return typeof entry?.totalPoints === "number" ? {
					points: entry.totalPoints,
					idealXi: entry.isInIdealFormation === true
				} : null;
			};
			const settle = await settleTrackRecord(currentWeek, resolveOutcome);
			if (analysis.optimalLineup) await persistLineup({
				week: currentWeek,
				leagueId,
				teamId,
				recordedAt,
				modelVersion: MODEL_VERSION,
				formation: analysis.optimalLineup.formation,
				starters: analysis.optimalLineup.starters.map((e) => ({
					playerId: e.player.id,
					xp: round2(e.expectedPoints)
				})),
				captainId: analysis.optimalLineup.captain?.player.id,
				source: "recommended"
			});
			const metrics = evaluateWalkForward(statsMap);
			const trackRecordMetrics = await evaluateTrackRecord(currentWeek);
			await persistMetrics({
				leagueId,
				week: currentWeek,
				...metrics,
				trackRecord: trackRecordMetrics
			});
			const scoringTable = deriveScoringTable(statsUniverse.map((player) => ({
				positionId: player.positionId,
				playerStats: statsMap[player.id] || []
			})));
			if (scoringTable) await persistScoringTable(scoringTable);
			const statsWeeks = /* @__PURE__ */ new Set();
			for (const stats of Object.values(statsMap)) for (const s of stats) statsWeeks.add(s.weekNumber);
			const pastWeeks = [...statsWeeks].filter((w) => w < currentWeek);
			const calendarsByWeek = /* @__PURE__ */ new Map();
			await Promise.all(pastWeeks.map(async (w) => calendarsByWeek.set(w, await fetchCalendarCached(w, currentWeek, token))));
			await persistCalibration(await calibrateEngine({
				statsByPlayer: statsMap,
				playersById: new Map(statsUniverse.map((p) => [p.id, p])),
				calendarsByWeek,
				context: estimatorContext,
				currentParams: await loadEngineParams()
			}));
			console.log(`[track-record] predicciones +${predictionsResult.appended} (${predictionsResult.skipped} ya estaban), recomendaciones +${recommendationsResult.appended}, liquidados ${settle.recordsSettled}, MAE legacy=${metrics.maeLegacy} v1=${metrics.maeV1} (n=${metrics.samples})`);
		} catch (persistError) {
			console.warn("[track-record] persist failed:", persistError instanceof Error ? persistError.message : persistError);
		}
		return new Response(JSON.stringify({
			recommendations,
			bestMoves,
			optimalLineup: analysis.optimalLineup,
			tacticalScheme,
			multiWeekPlan: multiWeekPlan ?? null,
			league,
			money,
			week,
			marketCount: market.length
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error("[recommendations] Error:", message);
		return new Response(JSON.stringify({ error: message }), { status: 500 });
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/recommendations@_@ts
var page = () => recommendations_exports;
//#endregion
export { page };
