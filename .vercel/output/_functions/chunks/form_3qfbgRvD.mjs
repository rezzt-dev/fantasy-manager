//#region src/lib/engine/form.ts
/**
* Forma reciente y minutos esperados a partir de `playerStats` (§4.3 del
* diseño): ventana de 10 jornadas con decaimiento exponencial ξ ≈ 0.0065/día
* (vida media ~107 días, parámetro Dixon-Coles estándar). Como el dato llega
* por jornada, el decaimiento se aplica por semana: ξ_semana = 0.0065 × 7.
*
* Reglas:
* - Los minutos esperados promedian TODAS las jornadas de la ventana, incluidas
*   las de 0 minutos (no solo las jugadas).
* - Las medias por 90' se calculan solo con partidos de ≥60' (rendimiento
*   estable); si no hay ninguno, se usan los de >0' y se anota.
*/
/** Decaimiento exponencial por día (Dixon-Coles). */
var XI_PER_DAY = .0065;
function minutesOf(stat) {
	return stat.stats?.mins_played?.[0] ?? 0;
}
/** Media ponderada con decaimiento; devuelve null si no hay muestras. */
function decayedMean(values) {
	if (values.length === 0) return null;
	const weightSum = values.reduce((sum, v) => sum + v.weight, 0);
	if (weightSum <= 0) return null;
	return values.reduce((sum, v) => sum + v.value * v.weight, 0) / weightSum;
}
/**
* Calcula la forma de un jugador. `referenceWeek` es la jornada actual: el
* decaimiento se aplica respecto a ella para que las jornadas sin dato
* recientes (lesión, sanción) enfríen la forma. Si no se indica, se usa la
* última jornada con dato del propio jugador.
*/
function recentForm(playerStats, referenceWeek) {
	const sorted = [...playerStats].filter((s) => Number.isFinite(s.weekNumber)).sort((a, b) => b.weekNumber - a.weekNumber).slice(0, 10);
	if (sorted.length === 0) return {
		weeksUsed: 0,
		pointsPerGame: null,
		pointsStdDev: null,
		expectedMinutes: null,
		pointsPer90ByStat: null,
		pointsPer90: null,
		per90FromShortMatches: false
	};
	const refWeek = referenceWeek ?? sorted[0].weekNumber;
	const weightOf = (s) => Math.exp(-.0455 * Math.max(0, refWeek - s.weekNumber));
	const played = sorted.filter((s) => minutesOf(s) > 0);
	const pointsPerGame = decayedMean(played.map((s) => ({
		value: s.totalPoints ?? 0,
		weight: weightOf(s)
	})));
	const expectedMinutes = decayedMean(sorted.map((s) => ({
		value: minutesOf(s),
		weight: weightOf(s)
	})));
	let pointsStdDev = null;
	if (played.length >= 2) {
		const mean = played.reduce((sum, s) => sum + (s.totalPoints ?? 0), 0) / played.length;
		const variance = played.reduce((sum, s) => sum + ((s.totalPoints ?? 0) - mean) ** 2, 0) / (played.length - 1);
		pointsStdDev = Math.sqrt(variance);
	}
	let per90Pool = played.filter((s) => minutesOf(s) >= 60);
	let per90FromShortMatches = false;
	if (per90Pool.length === 0 && played.length > 0) {
		per90Pool = played;
		per90FromShortMatches = true;
	}
	let pointsPer90ByStat = null;
	let pointsPer90 = null;
	if (per90Pool.length > 0) {
		const statKeys = /* @__PURE__ */ new Set();
		for (const s of per90Pool) for (const key of Object.keys(s.stats || {})) statKeys.add(key);
		pointsPer90ByStat = {};
		for (const key of statKeys) {
			const rate = decayedMean(per90Pool.map((s) => ({
				value: (s.stats?.[key]?.[1] ?? 0) / minutesOf(s) * 90,
				weight: weightOf(s)
			})));
			pointsPer90ByStat[key] = rate ?? 0;
		}
		const sumComponents = Object.values(pointsPer90ByStat).reduce((sum, v) => sum + v, 0);
		if (statKeys.size > 0) pointsPer90 = sumComponents;
		else {
			pointsPer90ByStat = null;
			pointsPer90 = decayedMean(per90Pool.map((s) => ({
				value: (s.totalPoints ?? 0) / minutesOf(s) * 90,
				weight: weightOf(s)
			})));
		}
	}
	return {
		weeksUsed: sorted.length,
		pointsPerGame,
		pointsStdDev,
		expectedMinutes,
		pointsPer90ByStat,
		pointsPer90,
		per90FromShortMatches
	};
}
//#endregion
export { recentForm as n, XI_PER_DAY as t };
