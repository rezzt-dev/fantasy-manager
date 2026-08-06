import { n as getEnvOptional, t as getEnv } from "./env_F5WbBaSV.mjs";
//#region src/lib/fantasy/api-proxy.ts
var TARGET = getEnv("PROXY_FANTASY_TARGET", "https://fantasy-api.llt-services.com");
var X_APP = getEnv("PROXY_DEFAULT_X_APP", "2");
var X_LANG = getEnv("PROXY_DEFAULT_X_LANG", "es");
var CMP = "/v1/competition/1";
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
async function fetchOfficialAPI(path, token, query) {
	const usp = new URLSearchParams(query);
	usp.set("x-lang", X_LANG);
	const url = `${TARGET}/api${path}?${usp.toString()}`;
	const res = await fetch(url, { headers: {
		Authorization: `Bearer ${token}`,
		"x-app": X_APP,
		"x-lang": X_LANG,
		Accept: "application/json"
	} });
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`HTTP ${res.status}: ${text}`);
	}
	return res.json();
}
//#endregion
export { fetchOfficialAPI as n, getToken as r, CMP as t };
