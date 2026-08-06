import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
import { n as fetchOfficialAPI, r as getToken, t as CMP } from "./api-proxy_CJ5fp98A.mjs";
import { a as buildPositionAverages, b as fetchExternalSignals, f as buildShrinkagePriors, i as computeOptimalLineup, n as fetchTeamElos, o as buildTeamStrength, p as buildTeamTiers, r as fetchAvailableFormations, t as fetchProbableLineups } from "./jornadaperfecta_BETVXtqM.mjs";
import { a as fetchLeagueActivity, d as recommendCaptain, i as analyzeClauseRisks, t as fetchStarterInfo, u as buildLeagueAnalysis } from "./starter-status_LG-LwEuT.mjs";
import { i as fetchTeamsMaster, t as buildTeamMatcher } from "./team-names_DwPbX-En.mjs";
import { t as enrichMarketPlayers } from "./market-enrich_jyOnRCUq.mjs";
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
		analysis.leagueActivity = await fetchLeagueActivity(leagueId, token);
		analysis.starterInfo = await fetchStarterInfo(teamData.players.map((p) => p.playerMaster), (playerId) => fetchOfficialAPI(`${CMP}/player/${playerId}/league/${leagueId}`, token));
		const officialTeams = await fetchTeamsMaster(token);
		const teamElos = officialTeams.length > 0 ? await fetchTeamElos(officialTeams) : null;
		const probableData = officialTeams.length > 0 ? await fetchProbableLineups(officialTeams) : null;
		const probableLineups = /* @__PURE__ */ new Map();
		if (probableData) {
			const matchTeam = buildTeamMatcher(officialTeams);
			for (const match of probableData.matches) for (const lineup of match.lineups) {
				const lineupTeamId = matchTeam(lineup.sourceTeamName);
				if (lineupTeamId !== null) probableLineups.set(lineupTeamId, lineup);
			}
		}
		const teamTiers = buildTeamTiers(teamElos?.eloByTeamId ?? /* @__PURE__ */ new Map());
		const estimatorContext = {
			teamStrength: buildTeamStrength(allPlayers),
			starterInfo: analysis.starterInfo,
			externalSignals: analysis.externalSignals,
			teamElos: teamElos?.eloByTeamId,
			probableLineups,
			injuryReport: probableData?.injuries,
			shrinkagePriors: buildShrinkagePriors(allPlayers, teamTiers),
			teamTiers,
			positionAverages: buildPositionAverages(allPlayers),
			newsCoverage: {
				feedsOk: externalResult.coverage.feedsOk.length,
				feedsTotal: externalResult.coverage.feedsOk.length + externalResult.coverage.feedsFailed.length
			}
		};
		analysis.clauseRisks = analyzeClauseRisks(analysis, estimatorContext);
		analysis.captain = recommendCaptain(analysis, estimatorContext);
		const formations = await fetchAvailableFormations(token, league.config?.premiumFeatures?.formations === true);
		analysis.optimalLineup = computeOptimalLineup({
			squad: teamData.players,
			currentLineup: lineup,
			calendar,
			formations,
			context: estimatorContext,
			captainEnabled: league.config?.premiumFeatures?.captain === true
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
