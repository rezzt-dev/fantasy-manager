import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
import { o as readSession } from "./api-proxy_CUjR3F-2.mjs";
//#region src/pages/api/auth/token.ts
var token_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	POST: () => POST
});
function parseFullTokens(input) {
	let t = input.trim();
	if (t.startsWith("\"") && t.endsWith("\"") && t.length > 2) try {
		t = JSON.parse(t);
		t = t.trim();
	} catch {
		t = t.slice(1, -1).trim();
	}
	if (t.startsWith("{") && t.endsWith("}")) try {
		const obj = JSON.parse(t);
		const accessToken = (obj.access_token || obj.id_token || obj.token || "").trim();
		if (accessToken) return {
			access_token: accessToken,
			refresh_token: (obj.refresh_token || "").trim(),
			id_token: (obj.id_token || "").trim(),
			token_type: (obj.token_type || "Bearer").trim(),
			expires_in: obj.expires_in || obj.id_token_expires_in || 86400
		};
	} catch {}
	if (t.length > 10) return {
		access_token: t,
		refresh_token: "",
		id_token: "",
		token_type: "Bearer",
		expires_in: 86400
	};
	return null;
}
var POST = async ({ request, session }) => {
	try {
		const body = await request.json();
		const tokens = body.token ? parseFullTokens(body.token) : null;
		if (!tokens) return new Response(JSON.stringify({ error: "Token inválido. Pega el access_token JWT completo o el JSON de OAuth de LaLiga." }), { status: 400 });
		if (session) session.set("fantasy_tokens", tokens);
		else {
			const tokenCookie = `fantasy_tokens=${encodeURIComponent(JSON.stringify(tokens))}; HttpOnly; Path=/; Max-Age=${tokens.expires_in}; SameSite=Lax`;
			return new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: {
					"Set-Cookie": tokenCookie,
					"Content-Type": "application/json"
				}
			});
		}
		return new Response(JSON.stringify({ success: true }), { status: 200 });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return new Response(JSON.stringify({ error: message }), { status: 500 });
	}
};
var GET = async ({ session }) => {
	const tokens = session ? await readSession(session) : void 0;
	return new Response(JSON.stringify({ hasToken: Boolean(tokens?.access_token) }), { status: 200 });
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/auth/token@_@ts
var page = () => token_exports;
//#endregion
export { page };
