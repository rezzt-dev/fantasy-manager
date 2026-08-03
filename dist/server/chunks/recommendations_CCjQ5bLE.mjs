import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
import { a as analyzeClauseRisks, c as recommendCaptain, d as combinedSignal, f as fetchExternalSignals, h as getToken, i as starterScoreFromLastSeason, l as buildTeamStrength, m as fetchOfficialAPI, n as computeOptimalLineup, o as getClauseProtection, p as CMP, r as fetchStarterInfo, s as buildLeagueAnalysis, t as fetchFreeFormations, u as estimatePoints } from "./formations_jKhUwF91.mjs";
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
function formatCurrency(value) {
	if (!Number.isFinite(value)) return "-";
	return new Intl.NumberFormat("es-ES", {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: 0
	}).format(value);
}
function generateRecommendations(input) {
	const { analysis, estimatorContext } = input;
	const { league, teamData, lineup, money, market, calendar, ownNeeds, clauseRisks, captain, externalSignals, starterInfo, rivals } = analysis;
	const recommendations = [];
	const teamPlayerIds = new Set(teamData.players.map((p) => p.playerMaster.id));
	for (const teamPlayer of teamData.players) {
		const player = teamPlayer.playerMaster;
		const expected = estimatePoints(player, calendar, estimatorContext);
		const marketValueRatio = teamPlayer.buyoutClause / Math.max(player.marketValue, 1);
		const signals = externalSignals[player.id] || [];
		const external = combinedSignal(signals);
		if (player.playerStatus !== "ok") recommendations.push({
			id: `sell-${player.id}`,
			type: "sell",
			priority: "high",
			player,
			reason: `Está ${statusText(player.playerStatus)} y no aportará puntos esta jornada.`,
			details: `Cláusula actual: ${formatCurrency(teamPlayer.buyoutClause)}. Valor de mercado: ${formatCurrency(player.marketValue)}.`,
			suggestedAction: "Ponlo a la venta o busca un sustituto.",
			externalSignals: signals,
			impactScore: 85
		});
		else if (marketValueRatio > 1.3 && expected < 3) recommendations.push({
			id: `sell-${player.id}`,
			type: "sell",
			priority: external.signal === "sell" ? "high" : "medium",
			player,
			reason: "Su cláusula está muy por encima del valor de mercado y su rendimiento esperado es bajo.",
			details: `Cláusula: ${formatCurrency(teamPlayer.buyoutClause)} vs valor mercado ${formatCurrency(player.marketValue)}. Puntos esperados: ${expected.toFixed(1)}.`,
			suggestedAction: "Evalúa venderlo para liberar dinero.",
			externalSignals: signals,
			impactScore: Math.round(Math.min(75, 55 + (marketValueRatio - 1.3) * 40))
		});
		else if (external.signal === "sell" && external.confidence >= SELL_NEWS_CONFIDENCE) {
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
				impactScore: Math.round(50 + external.confidence * 40)
			});
		} else if ((starterInfo[player.id]?.score ?? .5) < SUBSTITUTE_SCORE && expected < 2.5) {
			const starter = starterInfo[player.id];
			recommendations.push({
				id: `sell-sub-${player.id}`,
				type: "sell",
				priority: "low",
				player,
				reason: `Es ${starter ? starter.label.toLowerCase() : "suplente"} habitual en su equipo y apenas suma puntos.`,
				details: `Puntos esperados: ${expected.toFixed(1)}. Valor de mercado: ${formatCurrency(player.marketValue)}.`,
				suggestedAction: "Véndelo para liberar dinero y una plaza para un titular.",
				externalSignals: signals,
				impactScore: 30
			});
		}
	}
	const needByPosition = new Map(ownNeeds.map((n) => [n.positionId, n.needScore]));
	const affordableMarket = market.filter((m) => m.salePrice <= money.teamMoney && !teamPlayerIds.has(m.playerMaster.id) && m.playerMaster.playerStatus === "ok").filter((m) => {
		const ext = combinedSignal(externalSignals[m.playerMaster.id] || []);
		return !(ext.signal === "sell" && ext.confidence >= SELL_NEWS_CONFIDENCE);
	}).map((m) => ({
		...m,
		expectedPoints: estimatePoints(m.playerMaster, calendar, estimatorContext),
		valueRatio: m.salePrice / Math.max(m.playerMaster.marketValue, 1),
		needScore: needByPosition.get(m.playerMaster.positionId) || 0,
		starterScore: starterScoreFromLastSeason(m.playerMaster.lastSeasonPoints)
	})).sort((a, b) => {
		const scoreA = a.needScore * 2 + a.expectedPoints / Math.max(a.valueRatio, .5) + a.starterScore;
		return b.needScore * 2 + b.expectedPoints / Math.max(b.valueRatio, .5) + b.starterScore - scoreA;
	}).slice(0, 10);
	for (const marketPlayer of affordableMarket) {
		const player = marketPlayer.playerMaster;
		const signals = externalSignals[player.id] || [];
		const external = combinedSignal(signals);
		const isBargain = marketPlayer.valueRatio < .9;
		const coversNeed = marketPlayer.needScore > .3;
		recommendations.push({
			id: `buy-${player.id}`,
			type: "buy",
			priority: isBargain || coversNeed || external.signal === "buy" ? "high" : "medium",
			player,
			reason: buildBuyReason(marketPlayer, coversNeed),
			details: `Puntos esperados: ${marketPlayer.expectedPoints.toFixed(1)}. Valor de mercado: ${formatCurrency(player.marketValue)}. Pujas: ${marketPlayer.numberOfBids}.`,
			suggestedAction: `Puja por él si encaja en tu esquema táctico.`,
			estimatedValue: marketPlayer.salePrice,
			externalSignals: signals,
			impactScore: Math.round(Math.min(60, marketPlayer.expectedPoints * 10) + marketPlayer.needScore * 25 + (isBargain ? 15 : 0))
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
				recommendations.push({
					id: `change-${lineupPlayer.id}`,
					type: "change_lineup",
					priority: "high",
					player: lineupPlayer,
					reason: lineupPlayer.playerStatus !== "ok" ? `Está ${statusText(lineupPlayer.playerStatus)} en la alineación titular.` : `Noticias negativas recientes${negative?.category ? ` (${categoryText(negative.category)})` : ""} sobre este titular.`,
					details: `Sustituto sugerido: ${replacement.playerMaster.nickname} (${replacement.playerMaster.position}).`,
					suggestedAction: `Cambia a ${replacement.playerMaster.nickname} en la alineación.`,
					externalSignals: newsRisk ? signals : void 0,
					impactScore: 80
				});
			}
		}
	}
	if (league.config.features.buyoutClause) for (const risk of clauseRisks) {
		if (risk.riskScore < 30) continue;
		if (!Number.isFinite(risk.recommendedClause) || risk.recommendedClause <= 0) continue;
		const player = findPlayer(teamData, risk.playerId);
		if (!player) continue;
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
			impactScore: risk.riskScore
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
			if (!(tp.buyoutClause > 0) || tp.buyoutClause > money.teamMoney) return false;
			return getClauseProtection(tp).status === "available";
		}).map(({ rival, tp }) => {
			const p = tp.playerMaster;
			const expected = estimatePoints(p, calendar, estimatorContext);
			const needScore = needByPosition.get(p.positionId) || 0;
			const clauseRatio = tp.buyoutClause / Math.max(p.marketValue, 1);
			const external = combinedSignal(externalSignals[p.id] || []);
			let score = needScore * 2 + expected / Math.max(clauseRatio, .5);
			if (external.signal === "sell" && external.confidence >= SELL_NEWS_CONFIDENCE) score *= .3;
			else if (external.signal === "buy") score *= 1.2;
			return {
				rival,
				tp,
				expected,
				needScore,
				clauseRatio,
				external,
				score
			};
		}).filter((c) => c.score > 1.5).sort((a, b) => b.score - a.score).slice(0, 3);
		for (const candidate of buyoutCandidates) {
			const p = candidate.tp.playerMaster;
			recommendations.push({
				id: `buyout-${p.id}`,
				type: "buyout",
				priority: candidate.needScore > .3 || candidate.clauseRatio < .9 ? "high" : "medium",
				player: p,
				reason: `Disponible para clausulazo en el equipo de ${candidate.rival.managerName}.`,
				details: `Cláusula: ${formatCurrency(candidate.tp.buyoutClause)} (valor de mercado ${formatCurrency(p.marketValue)}). Puntos esperados: ${candidate.expected.toFixed(1)}.${candidate.needScore > .3 ? " Cubre una necesidad de tu plantilla." : ""}`,
				suggestedAction: `Paga su cláusula de ${formatCurrency(candidate.tp.buyoutClause)} antes de que la suban o lo blinden.`,
				estimatedValue: candidate.tp.buyoutClause,
				ownerName: candidate.rival.managerName,
				externalSignals: externalSignals[p.id] || [],
				impactScore: Math.round(Math.min(95, Math.max(20, candidate.score * 12)))
			});
		}
	}
	if (captain?.captain) {
		const cap = captain.captain;
		recommendations.push({
			id: `captain-${cap.player.id}`,
			type: "captain",
			priority: "high",
			player: cap.player,
			reason: `Mejor candidato a capitán para esta jornada: ${cap.reasoning}.`,
			details: captain.alternatives.length > 0 ? `Alternativas: ${captain.alternatives.map((a) => a.player.nickname).join(", ")}.` : "No hay alternativas claras.",
			suggestedAction: "Asígnale el brazalete de capitán para duplicar sus puntos.",
			impactScore: Math.round(Math.min(95, Math.max(40, cap.expectedPoints * 12)))
		});
	}
	return recommendations.map((rec) => ({
		...rec,
		source: rec.source ?? (rec.type === "buy" ? "market" : rec.type === "buyout" ? "rival" : "squad")
	})).sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority));
}
/**
* Selecciona los mejores movimientos de la jornada: top 5 por impacto con
* diversidad de tipos (máx. 2 por tipo), cubriendo plantilla, mercado y rivales.
*/
function computeBestMoves(recommendations) {
	const sorted = [...recommendations].sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0));
	const picks = [];
	const perType = /* @__PURE__ */ new Map();
	for (const rec of sorted) {
		if ((rec.impactScore ?? 0) < 30) continue;
		const count = perType.get(rec.type) || 0;
		if (count >= 2) continue;
		perType.set(rec.type, count + 1);
		picks.push(rec);
		if (picks.length >= 5) break;
	}
	return picks;
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
//#region src/pages/api/recommendations.ts
var recommendations_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var GET = async ({ url, cookies, session }) => {
	try {
		const leagueId = url.searchParams.get("leagueId");
		const teamIdParam = url.searchParams.get("teamId");
		if (!leagueId || !teamIdParam) return new Response(JSON.stringify({ error: "leagueId and teamId required" }), { status: 400 });
		const teamId = parseInt(teamIdParam, 10);
		const token = await getToken(cookies, session);
		if (!token) return new Response(JSON.stringify({ error: "No token configured" }), { status: 401 });
		const [leagues, teamData, lineup, money, market, standing, week, allPlayers] = await Promise.all([
			fetchOfficialAPI(`${CMP}/leagues`, token),
			fetchOfficialAPI(`${CMP}/leagues/${leagueId}/teams/${teamId}`, token),
			fetchOfficialAPI(`${CMP}/teams/${teamId}/lineup`, token),
			fetchOfficialAPI(`${CMP}/teams/${teamId}/money`, token),
			fetchOfficialAPI(`${CMP}/league/${leagueId}/market`, token),
			fetchOfficialAPI(`${CMP}/leagues/${leagueId}/standing`, token),
			fetchOfficialAPI(`${CMP}/week/current`, token),
			fetchOfficialAPI(`${CMP}/players`, token)
		]);
		const currentWeek = week?.number ?? 1;
		const calendar = await fetchOfficialAPI(`${CMP}/calendar`, token, { weekNumber: String(currentWeek) });
		const league = leagues.find((l) => l.id === leagueId);
		if (!league) return new Response(JSON.stringify({ error: "League not found" }), { status: 404 });
		const analysis = await buildLeagueAnalysis(league, teamData, lineup, money, market, standing, week, calendar, allPlayers, {
			fetchTeamData: (lid, tid) => fetchOfficialAPI(`${CMP}/leagues/${lid}/teams/${tid}`, token),
			fetchTeamMoney: (tid) => fetchOfficialAPI(`${CMP}/teams/${tid}/money`, token)
		});
		analysis.clauseRisks = analyzeClauseRisks(analysis);
		const ownPlayerIds = new Set(teamData.players.map((p) => p.playerMaster.id));
		const interestingPlayers = [...teamData.players.map((p) => p.playerMaster), ...market.filter((m) => !ownPlayerIds.has(m.playerMaster.id)).map((m) => m.playerMaster)];
		analysis.externalSignals = await fetchExternalSignals(interestingPlayers);
		analysis.starterInfo = await fetchStarterInfo(teamData.players.map((p) => p.playerMaster), (playerId) => fetchOfficialAPI(`${CMP}/player/${playerId}/league/${leagueId}`, token));
		const estimatorContext = {
			teamStrength: buildTeamStrength(allPlayers),
			starterInfo: analysis.starterInfo,
			externalSignals: analysis.externalSignals
		};
		analysis.captain = recommendCaptain(analysis, estimatorContext);
		const formations = await fetchFreeFormations(token);
		analysis.optimalLineup = computeOptimalLineup({
			squad: teamData.players,
			currentLineup: lineup,
			calendar,
			formations,
			context: estimatorContext
		});
		const recommendations = generateRecommendations({
			analysis,
			estimatorContext
		});
		const bestMoves = computeBestMoves(recommendations);
		return new Response(JSON.stringify({
			recommendations,
			bestMoves,
			optimalLineup: analysis.optimalLineup,
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
