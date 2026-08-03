import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
//#region src/pages/api/auth/token.ts
var token_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	POST: () => POST
});
function parseToken(input) {
	let t = input.trim();
	if (t.startsWith("\"") && t.endsWith("\"") && t.length > 2) try {
		t = JSON.parse(t);
	} catch {
		t = t.slice(1, -1);
	}
	if (t.startsWith("{") && t.endsWith("}")) try {
		const obj = JSON.parse(t);
		if (obj.access_token) return obj.access_token.trim();
		if (obj.token) return obj.token.trim();
	} catch {}
	if (t.length > 10) return t;
	return null;
}
var POST = async ({ request, session }) => {
	try {
		const body = await request.json();
		const token = body.token ? parseToken(body.token) : null;
		if (!token) return new Response(JSON.stringify({ error: "Token inválido. Pega el access_token JWT completo." }), { status: 400 });
		const tokens = {
			access_token: token,
			refresh_token: "",
			id_token: "",
			token_type: "Bearer",
			expires_in: 86400
		};
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
	const tokens = session ? await session.get("fantasy_tokens") : void 0;
	return new Response(JSON.stringify({ hasToken: Boolean(tokens?.access_token) }), { status: 200 });
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/auth/token@_@ts
var page = () => token_exports;
//#endregion
export { page };
