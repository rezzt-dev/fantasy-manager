import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
//#region src/pages/api/auth/logout.ts
var logout_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = ({ session }) => {
	if (session) session.destroy();
	return new Response(JSON.stringify({ success: true }), {
		status: 200,
		headers: {
			"Set-Cookie": "fantasy_tokens=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax",
			"Content-Type": "application/json"
		}
	});
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/auth/logout@_@ts
var page = () => logout_exports;
//#endregion
export { page };
