import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
import { i as getToken } from "./api-proxy_CUjR3F-2.mjs";
import { u as summarizeTrackRecord } from "./track-record_BhHjzl7V.mjs";
import { readFile } from "node:fs/promises";
import nodePath from "node:path";
//#region src/pages/api/track-record.ts
var track_record_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
/**
* GET /api/track-record?leagueId={id}
*
* Métricas del track record (§6.3 del diseño) por jornada y en total: MAE del
* modelo frente al baseline, Spearman, top-11 hit rate, puntos del capitán,
* precisión y ROI de compras. Lee solo los ficheros locales de
* data/track-record (no llama a la API oficial): es rápido de servir.
*
* Lo que aún no tiene datos (pretemporada o jornadas sin liquidar) se
* devuelve en null con nota, nunca como "todo OK" (§4.6, honestidad de datos).
*/
var TRACK_RECORD_DIR = nodePath.join(process.cwd(), "data", "track-record");
async function readJson(file) {
	try {
		return JSON.parse(await readFile(file, "utf8"));
	} catch {
		return null;
	}
}
var GET = async ({ url, cookies, session }) => {
	try {
		const leagueId = url.searchParams.get("leagueId") ?? void 0;
		if (!await getToken(cookies, session)) return new Response(JSON.stringify({ error: "No token configured" }), { status: 401 });
		const metricsLatest = await readJson(nodePath.join(TRACK_RECORD_DIR, "metrics-latest.json"));
		const calibration = await readJson(nodePath.join(TRACK_RECORD_DIR, "calibration-latest.json"));
		const currentWeek = metricsLatest?.week ?? 1;
		const summary = await summarizeTrackRecord(currentWeek, leagueId);
		const hasData = summary.totals.settled > 0;
		const notes = [];
		if (!hasData) notes.push("Sin jornadas liquidadas todavía: las métricas se rellenan solas al cerrarse cada jornada (puntos reales vía API oficial).");
		return new Response(JSON.stringify({
			generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
			week: currentWeek,
			summary,
			walkForward: metricsLatest,
			calibration,
			notes
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error("[track-record] Error:", message);
		return new Response(JSON.stringify({ error: message }), { status: 500 });
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/track-record@_@ts
var page = () => track_record_exports;
//#endregion
export { page };
