import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
import { a as normalizeFormation, i as getToken, r as fetchOfficialAPI, t as CMP } from "./api-proxy_CUjR3F-2.mjs";
//#region src/pages/api/debug/lineup.ts
var lineup_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var GET = async ({ url, cookies, session }) => {
	try {
		const leagueId = url.searchParams.get("leagueId");
		const teamIdParam = url.searchParams.get("teamId");
		if (!leagueId || !teamIdParam) return new Response(JSON.stringify({ error: "leagueId and teamId required" }), { status: 400 });
		const teamId = parseInt(teamIdParam, 10);
		const token = await getToken(cookies, session);
		if (!token) return new Response(JSON.stringify({ error: "No token configured" }), { status: 401 });
		const week = await fetchOfficialAPI(`${CMP}/week/current`, token);
		const currentWeek = week?.number ?? week?.weekNumber ?? 1;
		const endpoints = [
			{
				name: "lineup-week",
				path: `${CMP}/teams/${teamId}/lineup/week/${currentWeek}`
			},
			{
				name: "lineup-week-prev",
				path: `${CMP}/teams/${teamId}/lineup/week/${currentWeek - 1}`
			},
			{
				name: "lineup-week-next",
				path: `${CMP}/teams/${teamId}/lineup/week/${currentWeek + 1}`
			},
			{
				name: "lineup-generic",
				path: `${CMP}/teams/${teamId}/lineup`
			},
			{
				name: "lineup-league",
				path: `${CMP}/leagues/${leagueId}/teams/${teamId}/lineup`
			},
			{
				name: "lineup-league-week",
				path: `${CMP}/leagues/${leagueId}/teams/${teamId}/lineup/week/${currentWeek}`
			}
		];
		const results = {};
		for (const { name, path } of endpoints) try {
			results[name] = {
				status: 200,
				body: await fetchOfficialAPI(path, token)
			};
		} catch (error) {
			results[name] = {
				status: 0,
				body: null,
				error: error instanceof Error ? error.message : String(error)
			};
		}
		const counts = {};
		const names = {};
		for (const [name, result] of Object.entries(results)) {
			const body = result.body;
			if (body && typeof body === "object" && "formation" in body) {
				const f = normalizeFormation(body).formation || {};
				const entries = [
					...f.goalkeeper || [],
					...f.defender || [],
					...f.midfielder || [],
					...f.attacker || []
				];
				const coachEntries = f.coach || [];
				counts[name] = {
					field: entries.length,
					coach: coachEntries.length
				};
				names[name] = entries.map((e) => e.playerMaster?.nickname || e.playerMaster?.name || "unknown");
			} else {
				counts[name] = null;
				names[name] = [];
			}
		}
		return new Response(JSON.stringify({
			teamId,
			leagueId,
			currentWeek,
			weekRaw: week,
			counts,
			names,
			results
		}, null, 2), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return new Response(JSON.stringify({ error: message }), { status: 500 });
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/debug/lineup@_@ts
var page = () => lineup_exports;
//#endregion
export { page };
