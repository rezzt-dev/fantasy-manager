import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
import { n as getEnvOptional, t as getEnv } from "./env_F5WbBaSV.mjs";
//#region src/pages/api/proxy/[...path].ts
var ____path__exports = /* @__PURE__ */ __exportAll({
	DELETE: () => DELETE,
	GET: () => GET,
	OPTIONS: () => OPTIONS,
	PATCH: () => PATCH,
	POST: () => POST,
	PUT: () => PUT
});
var TARGET = getEnv("PROXY_FANTASY_TARGET", "https://fantasy-api.llt-services.com");
var X_APP = getEnv("PROXY_DEFAULT_X_APP", "2");
var X_LANG = getEnv("PROXY_DEFAULT_X_LANG", "es");
var TIMEOUT_MS = parseInt(getEnv("PROXY_TIMEOUT_MS", "15000"), 10);
async function getToken(cookies, session) {
	if (session) {
		const tokens = await session.get("fantasy_tokens");
		if (tokens?.access_token) return tokens.access_token;
	}
	const tokensRaw = cookies.get("fantasy_tokens")?.value;
	if (tokensRaw) try {
		const tokens = JSON.parse(decodeURIComponent(tokensRaw));
		if (tokens.access_token) return tokens.access_token;
	} catch {}
	return getEnvOptional("LALIGA_FANTASY_TOKEN");
}
async function proxyHandler({ request, params, cookies, session }) {
	const token = await getToken(cookies, session);
	if (!token) return new Response(JSON.stringify({ error: "No token configured. Login or set LALIGA_FANTASY_TOKEN." }), { status: 401 });
	const targetUrl = `${TARGET}/api/${Array.isArray(params.path) ? params.path.join("/") : params.path}${new URL(request.url).search}`;
	const headers = {
		"Authorization": `Bearer ${token}`,
		"x-app": X_APP,
		"x-lang": X_LANG,
		"Accept": "application/json",
		"User-Agent": getEnvOptional("PROXY_DEFAULT_USER_AGENT") || "fantasy-manager/0.1"
	};
	let body;
	if (request.body) {
		headers["Content-Type"] = request.headers.get("content-type") || "application/json";
		body = await request.arrayBuffer();
	}
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const upstream = await fetch(targetUrl, {
			method: request.method,
			headers,
			body,
			signal: controller.signal
		});
		clearTimeout(timeout);
		const responseBody = await upstream.arrayBuffer();
		const responseHeaders = new Headers();
		upstream.headers.forEach((value, key) => {
			if ([
				"content-encoding",
				"content-length",
				"transfer-encoding"
			].includes(key.toLowerCase())) return;
			responseHeaders.set(key, value);
		});
		responseHeaders.set("Access-Control-Allow-Origin", "*");
		return new Response(responseBody, {
			status: upstream.status,
			statusText: upstream.statusText,
			headers: responseHeaders
		});
	} catch (error) {
		clearTimeout(timeout);
		const message = error instanceof Error ? error.message : "Unknown error";
		return new Response(JSON.stringify({ error: message }), { status: 502 });
	}
}
var GET = proxyHandler;
var POST = proxyHandler;
var PUT = proxyHandler;
var DELETE = proxyHandler;
var PATCH = proxyHandler;
var OPTIONS = () => {
	return new Response(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization"
		}
	});
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/proxy/[...path]@_@ts
var page = () => ____path__exports;
//#endregion
export { page };
