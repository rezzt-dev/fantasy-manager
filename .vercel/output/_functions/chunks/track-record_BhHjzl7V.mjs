import { t as XI_PER_DAY } from "./form_3qfbgRvD.mjs";
import { i as withFileLock, n as writeFileAtomic, r as writeJsonlAtomic, t as readJsonl } from "./jsonl_Db0ayhS6.mjs";
import { mkdir, readdir } from "node:fs/promises";
import nodePath from "node:path";
//#region src/lib/engine/track-record.ts
/**
* Track record del motor (§6.1 del diseño): persiste CADA predicción y CADA
* recomendación con su contexto y versión de modelo, y tras la jornada las
* liquida con los puntos reales de `playerStats[].totalPoints` (verdad
* absoluta vía API oficial). Sin esto ninguna mejora es demostrable.
*
* Almacenamiento: JSONL en data/track-record (una línea por registro y un
* fichero por jornada y tipo). Elegido frente a SQLite por no añadir ninguna
* dependencia, ser append-only, legible y suficiente a este volumen (~decenas
* de registros por jornada).
*
* La primera predicción de la jornada es la que cuenta: si un jugador ya está
* persistido para esa jornada no se sobrescribe (honestidad walk-forward).
*/
/** Versión del modelo: v1.2 añade shrinkage jerárquico, xP−λσ, capitán co-optimizado y noticias por categorías. */
var MODEL_VERSION = "components-v1.2";
var TRACK_RECORD_DIR = nodePath.join(process.cwd(), "data", "track-record");
function predictionsFile(week) {
	return nodePath.join(TRACK_RECORD_DIR, `predictions-w${week}.jsonl`);
}
function recommendationsFile(week) {
	return nodePath.join(TRACK_RECORD_DIR, `recommendations-w${week}.jsonl`);
}
async function appendJsonl(file, records) {
	if (records.length === 0) return;
	await mkdir(TRACK_RECORD_DIR, { recursive: true });
	const existing = await readJsonl(file);
	await writeJsonlAtomic(file, [...existing, ...records]);
}
/**
* Persiste las predicciones de una jornada. Devuelve cuántas se añadieron y
* cuántas se saltaron por existir ya (mismo jugador y jornada).
*/
async function persistPredictions(week, records) {
	const file = predictionsFile(week);
	return withFileLock(file, async () => {
		const existing = await readJsonl(file);
		const known = new Set(existing.map((r) => `${r.leagueId}:${r.playerId}`));
		const fresh = records.filter((r) => !known.has(`${r.leagueId}:${r.playerId}`));
		await appendJsonl(file, fresh);
		return {
			appended: fresh.length,
			skipped: records.length - fresh.length
		};
	});
}
/**
* Persiste las recomendaciones de una jornada (dedup por tipo + jugador).
*/
async function persistRecommendations(week, records) {
	const file = recommendationsFile(week);
	return withFileLock(file, async () => {
		const existing = await readJsonl(file);
		const known = new Set(existing.map((r) => `${r.leagueId}:${r.type}:${r.playerId}`));
		const fresh = records.filter((r) => !known.has(`${r.leagueId}:${r.type}:${r.playerId}`));
		await appendJsonl(file, fresh);
		return {
			appended: fresh.length,
			skipped: records.length - fresh.length
		};
	});
}
/**
* Liquida las jornadas ya cerradas: rellena `actualPoints` (y `idealXi` en las
* predicciones) de los registros pendientes usando los datos reales por
* jornada. `resolveOutcome` devuelve puntos y flag de once ideal de un
* jugador en una jornada (o null si no hay dato todavía).
*/
async function settleTrackRecord(currentWeek, resolveOutcome) {
	const summary = {
		weeksSettled: [],
		recordsSettled: 0,
		recordsPending: 0
	};
	let files = [];
	try {
		files = await readdir(TRACK_RECORD_DIR);
	} catch {
		return summary;
	}
	for (const fileName of files) {
		const match = /^(predictions|recommendations)-w(\d+)\.jsonl$/.exec(fileName);
		if (!match) continue;
		const week = Number(match[2]);
		if (!(week < currentWeek)) continue;
		const file = nodePath.join(TRACK_RECORD_DIR, fileName);
		await withFileLock(file, async () => {
			const records = await readJsonl(file);
			let touched = false;
			for (const record of records) {
				if (record.actualPoints !== null) continue;
				const outcome = await resolveOutcome(record.playerId, week);
				if (outcome === null) {
					summary.recordsPending += 1;
					continue;
				}
				record.actualPoints = outcome.points;
				if ("idealXi" in record || match[1] === "predictions") record.idealXi = outcome.idealXi;
				record.settledAt = (/* @__PURE__ */ new Date()).toISOString();
				summary.recordsSettled += 1;
				touched = true;
			}
			if (touched) await writeJsonlAtomic(file, records);
		});
		if (!summary.weeksSettled.includes(week)) summary.weeksSettled.push(week);
	}
	summary.weeksSettled.sort((a, b) => a - b);
	return summary;
}
/**
* Evaluación walk-forward (§6.2): para cada jornada W con al menos 2 jornadas
* previas de datos, predice solo con información anterior a W y compara con
* los puntos reales de W.
*
* - Baseline "motor viejo": media simple de los totalPoints previos (§6.2(a)).
* - Motor nuevo v1: media de los totalPoints previos con decaimiento
*   exponencial (la forma del modelo por componentes, sin factores de fixture:
*   ambas predicciones los omiten para que la comparación sea limpia).
*/
function evaluateWalkForward(statsByPlayer) {
	const errorsLegacy = [];
	const errorsV1 = [];
	const weeksEvaluated = /* @__PURE__ */ new Set();
	for (const stats of Object.values(statsByPlayer)) {
		const sorted = [...stats].filter((s) => Number.isFinite(s.weekNumber) && typeof s.totalPoints === "number").sort((a, b) => a.weekNumber - b.weekNumber);
		for (let i = 2; i < sorted.length; i++) {
			const prior = sorted.slice(0, i);
			const target = sorted[i];
			const actual = target.totalPoints;
			const predLegacy = prior.reduce((sum, s) => sum + (s.totalPoints ?? 0), 0) / prior.length;
			const weights = prior.map((s) => Math.exp(-XI_PER_DAY * 7 * Math.max(0, target.weekNumber - s.weekNumber)));
			const weightSum = weights.reduce((sum, w) => sum + w, 0);
			const predV1 = prior.reduce((sum, s, j) => sum + (s.totalPoints ?? 0) * weights[j], 0) / weightSum;
			errorsLegacy.push(Math.abs(predLegacy - actual));
			errorsV1.push(Math.abs(predV1 - actual));
			weeksEvaluated.add(target.weekNumber);
		}
	}
	const mae = (errors) => errors.length > 0 ? Math.round(errors.reduce((sum, e) => sum + e, 0) / errors.length * 100) / 100 : null;
	return {
		samples: errorsLegacy.length,
		maeLegacy: mae(errorsLegacy),
		maeV1: mae(errorsV1),
		weeks: [...weeksEvaluated].sort((a, b) => a - b),
		note: errorsLegacy.length === 0 ? "Sin puntos reales todavía (pretemporada): las métricas se calcularán en cuanto haya jornadas liquidadas." : "Baseline = media simple; v1 = media con decaimiento. Sin factores de fixture en ninguna de las dos."
	};
}
/**
* MAE del modelo actual frente al baseline sobre las predicciones YA
* liquidadas del track record (§6.1-6.3). Es la métrica que demuestra la
* mejora: mismas jornadas, mismos jugadores, puntos reales de la API.
*/
async function evaluateTrackRecord(currentWeek) {
	const errorsXp = [];
	const errorsLegacy = [];
	let files = [];
	try {
		files = await readdir(TRACK_RECORD_DIR);
	} catch {
		return {
			settled: 0,
			maeXp: null,
			maeLegacy: null
		};
	}
	for (const fileName of files) {
		const match = /^predictions-w(\d+)\.jsonl$/.exec(fileName);
		if (!match || Number(match[1]) >= currentWeek) continue;
		const records = await readJsonl(nodePath.join(TRACK_RECORD_DIR, fileName));
		for (const record of records) {
			if (record.actualPoints === null) continue;
			errorsXp.push(Math.abs(record.xp - record.actualPoints));
			errorsLegacy.push(Math.abs(record.xpLegacy - record.actualPoints));
		}
	}
	const mae = (errors) => errors.length > 0 ? Math.round(errors.reduce((sum, e) => sum + e, 0) / errors.length * 100) / 100 : null;
	return {
		settled: errorsXp.length,
		maeXp: mae(errorsXp),
		maeLegacy: mae(errorsLegacy)
	};
}
/** Persiste el último informe de métricas para consulta externa. */
async function persistMetrics(metrics) {
	const file = nodePath.join(TRACK_RECORD_DIR, "metrics-latest.json");
	await writeFileAtomic(file, JSON.stringify({
		computedAt: (/* @__PURE__ */ new Date()).toISOString(),
		...metrics
	}, null, 2));
}
/** Persiste la tabla de puntuación derivada de playerStats (§4.2). */
async function persistScoringTable(table) {
	const file = nodePath.join(TRACK_RECORD_DIR, "scoring-table.json");
	await writeFileAtomic(file, JSON.stringify(table, null, 2));
}
function lineupsFile(week) {
	return nodePath.join(TRACK_RECORD_DIR, `lineups-w${week}.jsonl`);
}
/** Persiste el once recomendado de una jornada (primera escritura gana). */
async function persistLineup(record) {
	const file = lineupsFile(record.week);
	return withFileLock(file, async () => {
		if ((await readJsonl(file)).some((r) => r.leagueId === record.leagueId && r.teamId === record.teamId)) return false;
		await appendJsonl(file, [record]);
		return true;
	});
}
function mean(values) {
	if (values.length === 0) return null;
	return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length * 100) / 100;
}
/** Correlación de Spearman entre dos series (null si no computable). */
function spearman(xs, ys) {
	if (xs.length < 3) return null;
	const ranksOf = (arr) => {
		const indexed = arr.map((v, i) => ({
			v,
			i
		})).sort((a, b) => a.v - b.v);
		const ranks = new Array(arr.length);
		indexed.forEach(({ i }, rank) => ranks[i] = rank);
		return ranks;
	};
	const rx = ranksOf(xs);
	const ry = ranksOf(ys);
	const n = xs.length;
	const mx = rx.reduce((s, v) => s + v, 0) / n;
	const my = ry.reduce((s, v) => s + v, 0) / n;
	let num = 0;
	let dx = 0;
	let dy = 0;
	for (let i = 0; i < n; i++) {
		const a = rx[i] - mx;
		const b = ry[i] - my;
		num += a * b;
		dx += a * a;
		dy += b * b;
	}
	if (dx === 0 || dy === 0) return null;
	return Math.round(num / Math.sqrt(dx * dy) * 100) / 100;
}
/**
* Lee todos los ficheros del track record y resume las métricas §6.3 por
* jornada y en total. Solo jornadas cerradas (< currentWeek); lo no
* computable todavía queda en null (nunca se presenta como "todo OK").
*/
async function summarizeTrackRecord(currentWeek, leagueId) {
	const summary = {
		weeks: [],
		totals: {
			predictions: 0,
			settled: 0,
			maeXp: null,
			maeLegacy: null,
			spearmanXp: null,
			top11HitRate: null,
			captainPointsAvg: null,
			buyPrecision5: null,
			buyRoiPerMillion: null
		}
	};
	let files = [];
	try {
		files = await readdir(TRACK_RECORD_DIR);
	} catch {
		return summary;
	}
	const weeks = /* @__PURE__ */ new Set();
	for (const fileName of files) {
		const m = /^(predictions|recommendations|lineups)-w(\d+)\.jsonl$/.exec(fileName);
		if (m) weeks.add(Number(m[2]));
	}
	const allErrorsXp = [];
	const allErrorsLegacy = [];
	const allXp = [];
	const allActual = [];
	const top11Rates = [];
	const captainPoints = [];
	const buyDelivered = [];
	const buyRoi = [];
	for (const week of [...weeks].sort((a, b) => a - b)) {
		const predictions = (await readJsonl(predictionsFile(week))).filter((r) => !leagueId || r.leagueId === leagueId);
		const recommendations = (await readJsonl(recommendationsFile(week))).filter((r) => !leagueId || r.leagueId === leagueId);
		const lineups = (await readJsonl(lineupsFile(week))).filter((r) => !leagueId || r.leagueId === leagueId);
		const settled = predictions.filter((r) => r.actualPoints !== null);
		const weekSummary = {
			week,
			predictions: predictions.length,
			settled: settled.length,
			maeXp: mean(settled.map((r) => Math.abs(r.xp - r.actualPoints))),
			maeLegacy: mean(settled.map((r) => Math.abs(r.xpLegacy - r.actualPoints))),
			spearmanXp: spearman(settled.map((r) => r.xp), settled.map((r) => r.actualPoints)),
			top11HitRate: null,
			captainPoints: null
		};
		allErrorsXp.push(...settled.map((r) => Math.abs(r.xp - r.actualPoints)));
		allErrorsLegacy.push(...settled.map((r) => Math.abs(r.xpLegacy - r.actualPoints)));
		allXp.push(...settled.map((r) => r.xp));
		allActual.push(...settled.map((r) => r.actualPoints));
		const idealByPlayer = new Map(settled.map((r) => [r.playerId, r.idealXi === true]));
		for (const lineup of lineups) {
			if (lineup.starters.length === 0) continue;
			const rate = lineup.starters.filter((s) => idealByPlayer.get(s.playerId)).length / lineup.starters.length;
			top11Rates.push(rate);
			weekSummary.top11HitRate = Math.round(rate * 100) / 100;
			if (lineup.captainId) {
				const captainActual = settled.find((r) => r.playerId === lineup.captainId)?.actualPoints;
				if (typeof captainActual === "number") {
					captainPoints.push(captainActual);
					weekSummary.captainPoints = captainActual;
				}
			}
		}
		const settledBuys = recommendations.filter((r) => (r.type === "buy" || r.type === "buyout") && r.actualPoints !== null).sort((a, b) => b.deltaXp - a.deltaXp).slice(0, 5);
		for (const buy of settledBuys) {
			buyDelivered.push((buy.actualPoints ?? 0) >= buy.deltaXp);
			if (buy.price && buy.price > 0) buyRoi.push((buy.actualPoints ?? 0) / (buy.price / 1e6));
		}
		summary.weeks.push(weekSummary);
	}
	summary.totals = {
		predictions: summary.weeks.reduce((sum, w) => sum + w.predictions, 0),
		settled: summary.weeks.reduce((sum, w) => sum + w.settled, 0),
		maeXp: mean(allErrorsXp),
		maeLegacy: mean(allErrorsLegacy),
		spearmanXp: spearman(allXp, allActual),
		top11HitRate: mean(top11Rates),
		captainPointsAvg: mean(captainPoints),
		buyPrecision5: buyDelivered.length > 0 ? Math.round(buyDelivered.filter(Boolean).length / buyDelivered.length * 100) / 100 : null,
		buyRoiPerMillion: mean(buyRoi)
	};
	return summary;
}
//#endregion
export { persistMetrics as a, persistScoringTable as c, persistLineup as i, settleTrackRecord as l, evaluateTrackRecord as n, persistPredictions as o, evaluateWalkForward as r, persistRecommendations as s, MODEL_VERSION as t, summarizeTrackRecord as u };
