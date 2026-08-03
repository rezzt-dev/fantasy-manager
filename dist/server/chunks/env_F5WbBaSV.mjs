//#region src/lib/env.ts
function getEnv(key, fallback) {
	const value = Object.assign({
		"ASSETS_PREFIX": void 0,
		"BASE_URL": "/",
		"DEV": false,
		"MODE": "production",
		"PROD": true,
		"SITE": void 0,
		"SSR": true
	}, {})?.[key] ?? process.env?.[key];
	if (value === void 0 || value === "") {
		if (fallback !== void 0) return fallback;
		throw new Error(`Missing environment variable: ${key}`);
	}
	return value;
}
function getEnvOptional(key) {
	const value = Object.assign({
		"ASSETS_PREFIX": void 0,
		"BASE_URL": "/",
		"DEV": false,
		"MODE": "production",
		"PROD": true,
		"SITE": void 0,
		"SSR": true
	}, {})?.[key] ?? process.env?.[key];
	return value === "" ? void 0 : value;
}
//#endregion
export { getEnvOptional as n, getEnv as t };
