import { p as isSuspended, s as estimatePointsDetailed, y as combinedSignal } from "./jornadaperfecta__8wHAFaK.mjs";
//#region src/lib/analysis/lineup-optimizer.ts
var BAD_NEWS_CONFIDENCE = .6;
var BENCH_SIZE = 5;
var COACH_POSITION_ID = 5;
/** Puntos usados para decidir (xP penalizado por riesgo cuando hay σ). */
function selectionPoints(player, calendar, context) {
	return estimatePointsDetailed(player, calendar, context).riskAdjustedXp;
}
/**
* Calcula la alineación que maximiza los puntos esperados de la próxima
* jornada probando todas las formaciones disponibles.
*
* Con la feature de capitán activada, el objetivo es Σ puntos + puntos del
* mejor jugador (el capitán duplica): el once y el capitán se eligen a la
* vez (co-optimización, §5.2). La selección usa xP penalizado por riesgo
* (xP − λσ) cuando hay histórico para estimar σ.
*
* Elegibles: jugadores sanos (`playerStatus === 'ok'`) y sin noticias muy
* negativas (lesión/enfermedad/sanción reciente). El entrenador (positionId 5)
* no entra en las formaciones de campo.
*/
function computeOptimalLineup(input) {
	const { squad, currentLineup, calendar, formations, context, captainEnabled } = input;
	const fieldPlayers = squad.map((tp) => tp.playerMaster).filter((p) => p.positionId !== COACH_POSITION_ID);
	let eligible = fieldPlayers.filter((p) => p.playerStatus === "ok" && !isSuspended(p, context?.injuryReport)).filter((p) => {
		const external = combinedSignal(context?.externalSignals?.[p.id] || []);
		return !(external.signal === "sell" && external.confidence >= BAD_NEWS_CONFIDENCE);
	});
	let degraded = false;
	let best = pickBestFormation(eligible, calendar, formations, context, captainEnabled);
	if (!best) {
		eligible = fieldPlayers.filter((p) => !isSuspended(p, context?.injuryReport));
		degraded = true;
		best = pickBestFormation(eligible, calendar, formations, context, captainEnabled);
	}
	if (!best) return void 0;
	const starterIds = new Set(best.starters.map((e) => e.player.id));
	const bench = eligible.filter((p) => !starterIds.has(p.id)).map((player) => ({
		player,
		expectedPoints: selectionPoints(player, calendar, context)
	})).sort((a, b) => b.expectedPoints - a.expectedPoints).slice(0, BENCH_SIZE);
	const currentLineupOrEmpty = currentLineup ?? { formation: {
		goalkeeper: [],
		defender: [],
		midfielder: [],
		attacker: []
	} };
	const currentEntries = [
		...currentLineupOrEmpty.formation.goalkeeper || [],
		...currentLineupOrEmpty.formation.defender || [],
		...currentLineupOrEmpty.formation.midfielder || [],
		...currentLineupOrEmpty.formation.attacker || []
	];
	new Set(currentEntries.map((e) => e.playerMaster.id));
	const currentPoints = currentEntries.map((e) => selectionPoints(e.playerMaster, calendar, context));
	const captainBonusOf = (points) => captainEnabled && points.length > 0 ? Math.max(...points) : 0;
	const currentExpected = currentPoints.reduce((sum, v) => sum + v, 0) + captainBonusOf(currentPoints);
	const hasCurrentLineup = currentEntries.length > 0;
	let changes = [];
	if (hasCurrentLineup) {
		const currentFieldByPosition = /* @__PURE__ */ new Map();
		const recommendedByPosition = /* @__PURE__ */ new Map();
		for (const p of currentEntries.map((e) => e.playerMaster).filter((p) => p.positionId !== COACH_POSITION_ID)) {
			const list = currentFieldByPosition.get(p.positionId) || [];
			list.push(p);
			currentFieldByPosition.set(p.positionId, list);
		}
		for (const e of best.starters) {
			const list = recommendedByPosition.get(e.player.positionId) || [];
			list.push(e.player);
			recommendedByPosition.set(e.player.positionId, list);
		}
		for (const positionId of [
			1,
			2,
			3,
			4
		]) {
			const currentPos = currentFieldByPosition.get(positionId) || [];
			const recommendedPos = recommendedByPosition.get(positionId) || [];
			const currentIdsPos = new Set(currentPos.map((p) => p.id));
			const recommendedIdsPos = new Set(recommendedPos.map((p) => p.id));
			const outs = currentPos.filter((p) => !recommendedIdsPos.has(p.id));
			const ins = recommendedPos.filter((p) => !currentIdsPos.has(p.id));
			const n = Math.max(outs.length, ins.length);
			for (let i = 0; i < n; i++) changes.push({
				out: outs[i],
				in: ins[i]
			});
		}
		changes = changes.sort((a, b) => {
			const weight = (c) => c.out && c.in ? 0 : c.in ? 1 : 2;
			return weight(a) - weight(b);
		});
	}
	const starters = [...best.starters].sort((a, b) => a.player.positionId - b.player.positionId || b.expectedPoints - a.expectedPoints);
	return {
		formation: best.formation,
		starters,
		bench,
		captain: best.captain,
		totalExpected: round1(best.total),
		currentExpected: round1(currentExpected),
		improvement: round1(best.total - currentExpected),
		changes,
		degraded
	};
}
/** Prueba todas las formaciones y devuelve la que más puntos esperados suma. */
function pickBestFormation(eligible, calendar, formations, context, captainEnabled) {
	if (eligible.length === 0) return void 0;
	const byPosition = /* @__PURE__ */ new Map();
	for (const player of eligible) {
		const entry = {
			player,
			expectedPoints: selectionPoints(player, calendar, context)
		};
		const list = byPosition.get(player.positionId) || [];
		list.push(entry);
		byPosition.set(player.positionId, list);
	}
	for (const list of byPosition.values()) list.sort((a, b) => b.expectedPoints - a.expectedPoints);
	let best;
	for (const formation of formations) {
		const [defCount, midCount, attCount] = formation.split(",").map((n) => parseInt(n, 10));
		if (![
			defCount,
			midCount,
			attCount
		].every((n) => Number.isFinite(n))) continue;
		const gks = byPosition.get(1) || [];
		const defs = byPosition.get(2) || [];
		const mids = byPosition.get(3) || [];
		const atts = byPosition.get(4) || [];
		if (gks.length < 1 || defs.length < defCount || mids.length < midCount || atts.length < attCount) continue;
		const starters = [
			...gks.slice(0, 1),
			...defs.slice(0, defCount),
			...mids.slice(0, midCount),
			...atts.slice(0, attCount)
		];
		const captain = captainEnabled && starters.length > 0 ? starters.reduce((a, b) => b.expectedPoints > a.expectedPoints ? b : a) : void 0;
		const total = starters.reduce((sum, e) => sum + e.expectedPoints, 0) + (captain?.expectedPoints ?? 0);
		if (!best || total > best.total) best = {
			formation: formatFormation(defCount, midCount, attCount),
			starters,
			captain,
			total
		};
	}
	return best;
}
function formatFormation(def, mid, att) {
	return `${def}-${mid}-${att}`;
}
function round1(value) {
	return Math.round(value * 10) / 10;
}
//#endregion
export { computeOptimalLineup as t };
