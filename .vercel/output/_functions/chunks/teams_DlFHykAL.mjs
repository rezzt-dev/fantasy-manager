import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
import { i as getToken } from "./api-proxy_CUjR3F-2.mjs";
import { t as fetchTeamsCatalog } from "./teams_B9ggIAoL.mjs";
//#region src/pages/api/teams.ts
var teams_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
/**
* Catálogo de equipos de la competición (id, nombre, nombre corto, escudos).
* La UI lo usa para resolver los `localId`/`visitorId` que devuelve `/calendar`
* a escudos y nombres legibles.
*/
var GET = async ({ cookies, session }) => {
	try {
		const token = await getToken(cookies, session) ?? "";
		const teams = await fetchTeamsCatalog(token);
		return new Response(JSON.stringify({ teams }), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "private, max-age=3600"
			}
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error("[teams] Error:", message);
		return new Response(JSON.stringify({ error: message }), { status: 500 });
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/teams@_@ts
var page = () => teams_exports;
//#endregion
export { page };
