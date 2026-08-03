import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
import { a as analyzeClauseRisks, c as recommendCaptain, f as fetchExternalSignals, h as getToken, l as buildTeamStrength, m as fetchOfficialAPI, n as computeOptimalLineup, p as CMP, r as fetchStarterInfo, s as buildLeagueAnalysis, t as fetchFreeFormations } from "./formations_jKhUwF91.mjs";
//#region src/pages/api/league-analysis.ts
var league_analysis_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var cache = /* @__PURE__ */ new Map();
var CACHE_TTL_MS = 3e5;
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
		const payload = {
			analysis,
			league,
			money,
			week,
			marketCount: market.length
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
		console.error("[league-analysis] Error:", message);
		return new Response(JSON.stringify({ error: message }), { status: 500 });
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/league-analysis@_@ts
var page = () => league_analysis_exports;
//#endregion
export { page };
