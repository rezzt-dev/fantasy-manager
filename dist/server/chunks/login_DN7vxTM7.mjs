import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
import { t as getEnv } from "./env_F5WbBaSV.mjs";
//#region src/pages/api/auth/login.ts
var login_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	POST: () => POST
});
var AUTH_BASE_URL = getEnv("LALIGA_AUTH_BASE_URL", "https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token");
var CLIENT_ID = getEnv("LALIGA_CLIENT_ID", "af88bcff-1157-40a0-b579-030728aacf0b");
var REDIRECT_URI = getEnv("LALIGA_REDIRECT_URI", "authredirect://com.lfp.laligafantasy");
var POST = async ({ request, session, redirect }) => {
	try {
		const body = await request.json();
		const username = body.username;
		const password = body.password;
		if (!username || !password) return new Response(JSON.stringify({ error: "Username and password required" }), { status: 400 });
		const params = new URLSearchParams();
		params.set("grant_type", "password");
		params.set("client_id", CLIENT_ID);
		params.set("scope", `openid ${CLIENT_ID} offline_access`);
		params.set("redirect_uri", REDIRECT_URI);
		params.set("response_type", "id_token");
		params.set("username", username);
		params.set("password", password);
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 2e4);
		const res = await fetch(`${AUTH_BASE_URL}?p=B2C_1A_ResourceOwnerv2`, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: params.toString(),
			signal: controller.signal
		});
		clearTimeout(timeout);
		const data = await res.json();
		if (!res.ok) return new Response(JSON.stringify({
			error: data.error || "Login failed",
			description: data.error_description
		}), { status: 401 });
		if (session) session.set("fantasy_tokens", data);
		else {
			const tokenCookie = `fantasy_tokens=${encodeURIComponent(JSON.stringify(data))}; HttpOnly; Path=/; Max-Age=${data.expires_in}; SameSite=Lax`;
			return new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: {
					"Set-Cookie": tokenCookie,
					"Content-Type": "application/json"
				}
			});
		}
		return new Response(JSON.stringify({
			success: true,
			expires_in: data.expires_in
		}), { status: 200 });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return new Response(JSON.stringify({ error: message }), { status: 500 });
	}
};
var GET = async ({ session }) => {
	const tokens = session ? await session.get("fantasy_tokens") : void 0;
	return new Response(JSON.stringify({ authenticated: Boolean(tokens?.access_token) }), { status: 200 });
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/auth/login@_@ts
var page = () => login_exports;
//#endregion
export { page };
