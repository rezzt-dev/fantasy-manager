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
//#region src/lib/news/classifier.ts
/**
* Reglas por orden de prioridad: la primera categoría que coincide gana.
* Las palabras clave se comparan sobre el texto normalizado
* (minúsculas y sin diacríticos), con límite de palabra.
*/
var RULES = [
	{
		category: "injury",
		signal: "sell",
		confidence: .85,
		keywords: [
			"lesion",
			"lesionado",
			"lesionada",
			"rotura",
			"parte medico",
			"baja",
			"pubalgia",
			"esguince",
			"fractura",
			"desgarro",
			"sobrecarga",
			"molestias",
			"operado",
			"quirurgic",
			"codo roto",
			"fuera un mes",
			"semana de baja",
			"semanas de baja",
			"meses de baja"
		]
	},
	{
		category: "illness",
		signal: "sell",
		confidence: .8,
		keywords: [
			"enfermo",
			"enfermedad",
			"indispuesto",
			"indispuesta",
			"virus",
			"gripe",
			"fiebre",
			"gastroenteritis",
			"catarro",
			"infeccion",
			"covid",
			"migraña",
			"mareado"
		]
	},
	{
		category: "suspension",
		signal: "sell",
		confidence: .8,
		keywords: [
			"sancion",
			"sancionado",
			"sancionada",
			"quinta amarilla",
			"acumulacion de tarjetas",
			"ciclo de tarjetas",
			"expulsado",
			"expulsion",
			"tarjeta roja",
			"partido de sancion",
			"partidos de sancion",
			"cumple sancion"
		]
	},
	{
		category: "doubt",
		signal: "hold",
		confidence: .55,
		keywords: [
			"duda",
			"dudoso",
			"incierto",
			"incertidumbre",
			"a expensas",
			"entre algodones",
			"sera testado",
			"ultima prueba"
		]
	},
	{
		category: "return",
		signal: "buy",
		confidence: .65,
		keywords: [
			"vuelve",
			"reaparece",
			"alta medica",
			"recuperado",
			"regresa",
			"entrena con el grupo",
			"convocado",
			"ya entrena",
			"vuelve a entrenar",
			"regreso"
		]
	},
	{
		category: "form",
		signal: "buy",
		confidence: .5,
		keywords: [
			"racha",
			"goleador",
			"doblete",
			"hat-trick",
			"hat trick",
			"mvp",
			"estado de forma",
			"gran momento",
			"imparable",
			"lider del ataque"
		]
	},
	{
		category: "rotation",
		signal: "hold",
		confidence: .4,
		keywords: [
			"rotacion",
			"rotaciones",
			"descanso",
			"suplente",
			"banquillo"
		]
	},
	{
		category: "transfer",
		signal: "hold",
		confidence: .3,
		keywords: [
			"traspaso",
			"fichaje",
			"oferta por",
			"interes del",
			"renovacion",
			"clausula de rescision",
			"agente libre",
			"cesion"
		]
	}
];
/**
* Clasifica una noticia (título + descripción) en una categoría accionable.
* Devuelve null si el texto no contiene ninguna señal relevante.
*/
function classifyNews(text) {
	const normalized = normalize(text);
	for (const rule of RULES) for (const keyword of rule.keywords) if (containsPhrase(normalized, keyword)) return {
		category: rule.category,
		signal: rule.signal,
		confidence: rule.confidence
	};
	return null;
}
function normalize(value) {
	return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function containsPhrase(normalizedText, phrase) {
	const escaped = normalize(phrase).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(normalizedText);
}
//#endregion
//#region src/lib/news/matcher.ts
/** Noticias más antiguas que esto se ignoran (la jornada cambia cada semana). */
var MAX_NEWS_AGE_MS = 6048e5;
/**
* Contextos ajenos a LaLiga masculina: evitan falsos positivos al clasificar
* (p. ej. un "Andrés Martín" del fútbol femenino o de otro deporte).
*/
var CONTEXT_BLACKLIST = [
	"femenin",
	"femenil",
	"liga f",
	"womens",
	"baloncesto",
	"basket",
	"nba",
	"acb",
	"tenis",
	"padel",
	"ciclismo",
	"motogp",
	"formula 1",
	"atletismo",
	"natacion",
	"boxeo",
	"ufc",
	"balonmano",
	"futbol sala",
	"futsal",
	"hockey",
	"rugby",
	"golf"
];
/** true si la noticia es del contexto que nos interesa (fútbol masculino LaLiga). */
function isRelevantContext(item) {
	const text = normalize(`${item.title} ${item.description}`);
	return !CONTEXT_BLACKLIST.some((term) => text.includes(term));
}
/**
* Construye patrones de búsqueda para un jugador:
* - nombre completo (`name`) y apodo (`nickname`) si tienen >= 3 caracteres
* - apellidos individuales de >= 4 caracteres (evita falsos positivos con
*   nombres cortos tipo "An", "Unai" queda fuera si no hay más datos)
*/
function buildPatterns(player) {
	const patterns = [];
	const fullName = normalize(player.name || "");
	const nickname = normalize(player.nickname || "");
	if (fullName.length >= 3) patterns.push(wordBoundary(fullName));
	if (nickname.length >= 3 && nickname !== fullName) patterns.push(wordBoundary(nickname));
	for (const part of fullName.split(/\s+/)) if (part.length >= 4 && !STOPWORDS.has(part)) patterns.push(wordBoundary(part));
	return patterns;
}
var STOPWORDS = /* @__PURE__ */ new Set([
	"de",
	"del",
	"la",
	"los",
	"las",
	"el",
	"san",
	"santa",
	"van",
	"von",
	"jr"
]);
function wordBoundary(phrase) {
	const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
}
function isRecent(item, now = Date.now()) {
	if (!item.publishedAt) return true;
	const time = Date.parse(item.publishedAt);
	if (Number.isNaN(time)) return true;
	return now - time <= MAX_NEWS_AGE_MS;
}
/**
* Devuelve, para cada jugador, las noticias que lo mencionan.
* El texto analizado es título + descripción de cada noticia.
*/
function matchNewsToPlayers(players, items) {
	const playerPatterns = players.map((p) => ({
		playerId: p.id,
		patterns: buildPatterns(p)
	}));
	const result = {};
	for (const item of items) {
		if (!isRecent(item)) continue;
		if (!isRelevantContext(item)) continue;
		const text = normalize(`${item.title} ${item.description}`);
		for (const { playerId, patterns } of playerPatterns) {
			if (patterns.length === 0) continue;
			if (patterns.some((re) => re.test(text))) (result[playerId] ||= []).push(item);
		}
	}
	return result;
}
//#endregion
//#region src/lib/news/rss.ts
/**
* Parser tolerante de RSS 2.0 y Atom sin dependencias.
* Extrae título, descripción, enlace y fecha de cada <item>/<entry>.
*/
function parseFeed(xml) {
	const items = [];
	const blocks = matchBlocks(xml, "item");
	const isAtom = blocks.length === 0;
	const entries = isAtom ? matchBlocks(xml, "entry") : blocks;
	for (const block of entries) {
		const title = extractTag(block, "title");
		if (!title) continue;
		const description = extractTag(block, "description") || extractTag(block, "summary") || extractTag(block, "content") || "";
		let link = "";
		if (isAtom) link = block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] || extractTag(block, "link");
		else link = extractTag(block, "link");
		const rawDate = extractTag(block, "pubDate") || extractTag(block, "published") || extractTag(block, "updated") || extractTag(block, "dc:date");
		const publishedAt = rawDate ? toIso(rawDate) : void 0;
		items.push({
			title: cleanText(title),
			description: cleanText(description),
			link: link.trim(),
			publishedAt
		});
	}
	return items;
}
function matchBlocks(xml, tag) {
	const re = new RegExp(`<${tag}[\\s>][\\s\\S]*?<\\/${tag}>`, "gi");
	return xml.match(re) || [];
}
function extractTag(block, tag) {
	const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
	const match = block.match(re);
	if (!match) return "";
	return stripCdata(match[1]);
}
function stripCdata(value) {
	return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}
function cleanText(value) {
	return decodeEntities(stripCdata(value)).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function decodeEntities(value) {
	return value.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16))).replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, "\"").replace(/&apos;|&#39;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}
function toIso(raw) {
	const time = Date.parse(raw);
	return Number.isNaN(time) ? void 0 : new Date(time).toISOString();
}
//#endregion
//#region src/lib/news/sources.ts
/**
* Feeds RSS de prensa deportiva española verificados (HTTP 200).
* Se pueden sobrescribir con la variable de entorno NEWS_RSS_FEEDS
* (lista de URLs separadas por comas).
*/
var DEFAULT_NEWS_FEEDS = [
	{
		name: "Marca",
		url: "https://e00-marca.uecdn.es/rss/futbol/primera-division.xml"
	},
	{
		name: "AS",
		url: "https://feeds.as.com/mrss-s/pages/as/site/as.com/section/futbol/portada/"
	},
	{
		name: "Mundo Deportivo",
		url: "https://www.mundodeportivo.com/rss/futbol.xml"
	},
	{
		name: "Sport",
		url: "https://www.sport.es/es/rss/"
	},
	{
		name: "20minutos",
		url: "https://www.20minutos.es/rss/deportes/"
	}
];
function resolveNewsFeeds() {
	const fromEnv = getEnvOptional("NEWS_RSS_FEEDS")?.split(",").map((s) => s.trim()).filter(Boolean);
	if (!fromEnv || fromEnv.length === 0) return DEFAULT_NEWS_FEEDS;
	return fromEnv.map((url) => ({
		name: feedNameFromUrl(url),
		url
	}));
}
function feedNameFromUrl(url) {
	try {
		return new URL(url).hostname.replace(/^www\.|^e00-/, "");
	} catch {
		return url;
	}
}
//#endregion
//#region src/lib/news/index.ts
var DEFAULT_CACHE_TTL_MS$1 = 18e5;
var FETCH_TIMEOUT_MS = 8e3;
var USER_AGENT = "fantasy-manager/0.1 (+https://localhost)";
var cache$2 = null;
var inflight = null;
function cacheTtlMs$1() {
	const fromEnv = Number(getEnvOptional("NEWS_CACHE_TTL_MS"));
	return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_CACHE_TTL_MS$1;
}
async function fetchAllFeeds() {
	const feeds = resolveNewsFeeds();
	const results = await Promise.allSettled(feeds.map(async (feed) => {
		const res = await fetch(feed.url, {
			headers: {
				Accept: "application/rss+xml, application/xml, text/xml, */*",
				"User-Agent": USER_AGENT
			},
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return parseFeed(await res.text()).map((item) => ({
			source: feed.name,
			item
		}));
	}));
	const itemsBySource = [];
	for (let i = 0; i < results.length; i++) {
		const result = results[i];
		if (result.status === "fulfilled") itemsBySource.push(...result.value);
		else console.warn(`[news] Feed "${feeds[i].name}" failed:`, result.reason?.message || result.reason);
	}
	return {
		fetchedAt: Date.now(),
		itemsBySource
	};
}
/** Devuelve las noticias cacheadas; solo descarga cuando expira el TTL. */
async function getNews() {
	if (cache$2 && Date.now() - cache$2.fetchedAt < cacheTtlMs$1()) return cache$2;
	if (inflight) return inflight;
	inflight = fetchAllFeeds().then((fresh) => {
		if (fresh.itemsBySource.length === 0 && cache$2) return cache$2;
		cache$2 = fresh;
		return fresh;
	}).finally(() => {
		inflight = null;
	});
	return inflight;
}
/**
* Obtiene señales de noticias para los jugadores indicados.
* Devuelve un mapa playerId -> señales (vacío si nadie sale en las noticias).
*/
async function fetchNewsSignals(players) {
	const news = await getNews();
	if (news.itemsBySource.length === 0 || players.length === 0) return {};
	const matched = matchNewsToPlayers(players, news.itemsBySource.map((x) => x.item));
	const sourceByItem = /* @__PURE__ */ new Map();
	for (const { source, item } of news.itemsBySource) sourceByItem.set(item, source);
	const signals = {};
	for (const [playerId, playerItems] of Object.entries(matched)) for (const item of playerItems) {
		const classification = classifyNews(`${item.title} ${item.description}`);
		if (!classification) continue;
		(signals[playerId] ||= []).push({
			source: sourceByItem.get(item) || "news",
			signal: classification.signal,
			confidence: classification.confidence,
			category: classification.category,
			reason: item.title,
			url: item.link || void 0,
			publishedAt: item.publishedAt
		});
	}
	for (const list of Object.values(signals)) {
		list.sort((a, b) => b.confidence - a.confidence);
		if (list.length > 3) list.length = 3;
	}
	return signals;
}
//#endregion
//#region src/lib/recommendations/external-intelligence.ts
/**
* Combina dos fuentes de inteligencia externa:
*
* 1. Noticias de prensa deportiva (módulo `src/lib/news`): RSS de Marca, AS,
*    Mundo Deportivo, Sport y 20minutos clasificados por categorías
*    (lesión, enfermedad, sanción, duda, vuelta, racha...).
*    Configurable con NEWS_RSS_FEEDS y NEWS_CACHE_TTL_MS.
*
* 2. PLAYER_STATS_JSON_URL: URL opcional con un JSON de señales externas
*    ({ playerId, signal, confidence, reason }) para integraciones propias.
*/
async function fetchExternalSignals(players) {
	const signals = {};
	try {
		merge(signals, await fetchNewsSignals(players));
	} catch (error) {
		console.warn("[external-intelligence] news provider failed:", error);
	}
	const statsUrl = getEnvOptional("PLAYER_STATS_JSON_URL");
	if (statsUrl) try {
		merge(signals, await fetchStatsJSON(statsUrl, players.map((p) => p.id)));
	} catch (error) {
		console.warn("[external-intelligence] PLAYER_STATS_JSON_URL failed:", error);
	}
	return signals;
}
async function fetchStatsJSON(url, playerIds) {
	const res = await fetch(url, { headers: { Accept: "application/json" } });
	if (!res.ok) return {};
	const data = await res.json();
	const signals = {};
	const entries = Array.isArray(data) ? data : data?.players || [];
	for (const entry of entries) {
		if (!entry.playerId || !playerIds.includes(String(entry.playerId))) continue;
		const signal = {
			source: entry.source || "player-stats-json",
			signal: normalizeSignal(entry.signal),
			confidence: clamp$1(Number(entry.confidence) || .5, 0, 1),
			reason: String(entry.reason || "Sin detalle")
		};
		(signals[entry.playerId] ||= []).push(signal);
	}
	return signals;
}
function merge(target, source) {
	for (const [key, value] of Object.entries(source)) (target[key] ||= []).push(...value);
}
function normalizeSignal(signal) {
	const s = String(signal).toLowerCase();
	if (s === "buy" || s === "comprar" || s === "up") return "buy";
	if (s === "sell" || s === "vender" || s === "down") return "sell";
	return "hold";
}
function clamp$1(value, min, max) {
	return Math.min(max, Math.max(min, value));
}
function combinedSignal(signals) {
	if (signals.length === 0) return {
		signal: "hold",
		confidence: 0
	};
	let buyScore = 0;
	let sellScore = 0;
	for (const s of signals) if (s.signal === "buy") buyScore += s.confidence;
	else if (s.signal === "sell") sellScore += s.confidence;
	if (buyScore > sellScore) return {
		signal: "buy",
		confidence: Math.min(1, buyScore)
	};
	if (sellScore > buyScore) return {
		signal: "sell",
		confidence: Math.min(1, sellScore)
	};
	return {
		signal: "hold",
		confidence: Math.max(0, buyScore + sellScore)
	};
}
//#endregion
//#region src/lib/recommendations/points-estimator.ts
var POSITION_WEIGHT = {
	1: 1,
	2: .9,
	3: 1.1,
	4: 1.2,
	5: 1
};
var BAD_NEWS_CONFIDENCE$1 = .6;
/**
* Estima los puntos de un jugador para la próxima jornada.
*
* Base de rendimiento con datos de hasta 2 temporadas:
* - Si la temporada en curso ya tiene media (`averagePoints > 0`), mezcla
*   65% temporada actual + 35% temporada pasada (`lastSeasonPoints / 38`).
* - Si no (pretemporada), usa solo la temporada pasada.
* La API oficial no expone histórico más antiguo.
*
* Factores: posición, localía, dificultad del rival (valor agregado del
* catálogo), estado físico, titularidad habitual y noticias recientes.
*/
function estimatePoints(player, matches, context) {
	const teamId = player.teamId;
	const homeMatch = matches.find((m) => m.localId === teamId);
	const awayMatch = matches.find((m) => m.visitorId === teamId);
	const perGameLastSeason = (Number(player.lastSeasonPoints) || 0) / 38;
	const perGameCurrent = Number(player.averagePoints) || 0;
	let base = perGameCurrent > 0 ? perGameCurrent * .65 + perGameLastSeason * .35 : perGameLastSeason;
	base *= POSITION_WEIGHT[player.positionId] || 1;
	if (!Number.isFinite(base) || base <= 0) base = 2;
	if (homeMatch) base *= 1.05;
	if (awayMatch) base *= .98;
	const opponentId = homeMatch ? homeMatch.visitorId : awayMatch ? awayMatch.localId : void 0;
	if (opponentId !== void 0 && context?.teamStrength) base *= context.teamStrength.get(opponentId) ?? 1;
	if (player.playerStatus !== "ok") base *= .3;
	const starterScore = context?.starterInfo?.[player.id]?.score;
	if (starterScore !== void 0) base *= .9 + .1 * starterScore;
	const external = combinedSignal(context?.externalSignals?.[player.id] || []);
	if (external.signal === "sell" && external.confidence >= BAD_NEWS_CONFIDENCE$1) base *= .3;
	else if (external.signal === "buy" && external.confidence >= .5) base *= 1.08;
	return base;
}
/**
* Fuerza de cada equipo real de LaLiga a partir del valor de mercado agregado
* de sus jugadores del catálogo, normalizada a un multiplicador de dificultad
* (rival fuerte < 1, rival débil > 1).
*/
function buildTeamStrength(allPlayers) {
	const totalByTeam = /* @__PURE__ */ new Map();
	for (const p of allPlayers) totalByTeam.set(p.teamId, (totalByTeam.get(p.teamId) || 0) + (Number(p.marketValue) || 0));
	const totals = [...totalByTeam.values()];
	const avg = totals.reduce((sum, v) => sum + v, 0) / Math.max(totals.length, 1);
	const strength = /* @__PURE__ */ new Map();
	for (const [teamId, total] of totalByTeam) {
		const ratio = total / Math.max(avg, 1);
		strength.set(teamId, clamp(1 - (ratio - 1) * .16, .92, 1.08));
	}
	return strength;
}
function positionCaptainWeight(positionId) {
	switch (positionId) {
		case 4: return 1.15;
		case 3: return 1.1;
		case 1: return 1.05;
		case 5: return 1;
		default: return 1;
	}
}
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}
//#endregion
//#region src/lib/recommendations/captain.ts
function recommendCaptain(analysis, estimatorContext) {
	const { lineup, calendar, externalSignals, starterInfo } = analysis;
	const candidates = [
		...lineup.formation.goalkeeper || [],
		...lineup.formation.defender || [],
		...lineup.formation.midfielder || [],
		...lineup.formation.attacker || []
	].map((entry) => {
		const player = entry.playerMaster;
		const isHome = calendar.some((m) => m.localId === player.teamId);
		const isHealthy = player.playerStatus === "ok";
		const expected = estimatePoints(player, calendar, estimatorContext);
		const external = combinedSignal(externalSignals[player.id] || []);
		const hasBadNews = external.signal === "sell" && external.confidence >= .6;
		const starterScore = starterInfo[player.id]?.score;
		let score = expected * positionCaptainWeight(player.positionId);
		if (isHome) score *= 1.08;
		if (!isHealthy) score *= .25;
		if (hasBadNews) score *= .4;
		if (starterScore !== void 0) score *= .6 + .4 * starterScore;
		const reasons = [];
		reasons.push(`${expected.toFixed(1)} pts esperados`);
		if (isHome) reasons.push("juega en casa");
		else reasons.push("juega fuera");
		if (!isHealthy) reasons.push(`está ${statusText(player.playerStatus)}`);
		if (hasBadNews) reasons.push("noticias negativas recientes");
		if (starterScore !== void 0 && starterScore < .35) reasons.push("suplente habitual");
		else if (starterScore !== void 0 && starterScore >= .8) reasons.push("titular habitual");
		return {
			player,
			expectedPoints: expected,
			isHome,
			isHealthy,
			score,
			reasoning: reasons.join(" · ")
		};
	});
	candidates.sort((a, b) => b.score - a.score);
	const healthyOnes = candidates.filter((c) => c.isHealthy);
	const usable = healthyOnes.length > 0 ? healthyOnes : candidates;
	const captain = usable[0] || candidates[0];
	const alternatives = usable.slice(1, 3);
	return {
		captain: captain || alternatives[0],
		alternatives
	};
}
function statusText(status) {
	switch (status) {
		case "doubtful": return "dudoso";
		case "injured": return "lesionado";
		case "out_of_league": return "fuera de la liga";
		default: return status;
	}
}
//#endregion
//#region src/lib/analysis/league-analysis.ts
var POSITION_ORDER = {
	1: "Portero",
	2: "Defensa",
	3: "Centrocampista",
	4: "Delantero",
	5: "Entrenador"
};
var POSITION_COLORS = {
	1: "#f59e0b",
	2: "#3b82f6",
	3: "#10b981",
	4: "#ef4444",
	5: "#6366f1"
};
async function withConcurrency$1(items, fn, concurrency = 5) {
	const queue = [...items];
	const running = /* @__PURE__ */ new Set();
	while (queue.length > 0 || running.size > 0) {
		while (running.size < concurrency && queue.length > 0) {
			const promise = fn(queue.shift()).finally(() => running.delete(promise));
			running.add(promise);
		}
		if (running.size > 0) await Promise.race(running);
	}
}
/** Reintenta una vez tras 600 ms (la API devuelve 403 transitorios en ráfagas). */
async function fetchWithRetry(fn) {
	try {
		return await fn();
	} catch (error) {
		await new Promise((resolve) => setTimeout(resolve, 600));
		return fn();
	}
}
async function buildLeagueAnalysis(league, teamData, lineup, money, market, standing, week, calendar, allPlayers, deps) {
	const ownTeamId = league.team.id;
	const rivals = [];
	await withConcurrency$1(standing.filter((entry) => Number(entry.team.id) !== ownTeamId), async (entry) => {
		const teamId = Number(entry.team.id);
		try {
			const data = await fetchWithRetry(() => deps.fetchTeamData(league.id, teamId));
			let teamMoney = null;
			try {
				const rivalMoney = await deps.fetchTeamMoney(teamId);
				const value = Number(rivalMoney?.teamMoney);
				if (Number.isFinite(value)) teamMoney = value;
			} catch {}
			rivals.push({
				teamId,
				managerId: entry.team.managerId,
				managerName: entry.team.manager?.managerName || `Equipo ${teamId}`,
				teamValue: entry.team.teamValue,
				teamMoney,
				players: data.players || []
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : "unknown";
			console.warn(`[league-analysis] Failed to load rival ${teamId}: ${message}`);
		}
	}, 5);
	const ownNeeds = computeOwnNeeds(teamData.players, lineup);
	const rivalNeeds = computeRivalNeeds(rivals);
	const aggregates = computeAggregates(rivals, market, teamData, money);
	return {
		league,
		teamData,
		lineup,
		money,
		market,
		standing,
		week,
		calendar,
		allPlayers,
		rivals,
		rivalNeeds,
		ownNeeds,
		clauseRisks: [],
		captain: recommendCaptain({
			league,
			teamData,
			lineup,
			money,
			market,
			standing,
			week,
			calendar,
			allPlayers,
			rivals,
			rivalNeeds,
			ownNeeds,
			clauseRisks: [],
			aggregates,
			externalSignals: {},
			starterInfo: {}
		}),
		aggregates,
		externalSignals: {},
		starterInfo: {}
	};
}
function computeOwnNeeds(players, lineup) {
	const lineupEntries = [
		...lineup.formation.goalkeeper || [],
		...lineup.formation.defender || [],
		...lineup.formation.midfielder || [],
		...lineup.formation.attacker || []
	];
	const lineupIds = new Set(lineupEntries.map((e) => e.playerMaster.id));
	const counts = {};
	for (const p of players) {
		const pos = p.playerMaster.positionId;
		if (!counts[pos]) counts[pos] = {
			total: 0,
			healthy: 0,
			lineup: 0
		};
		counts[pos].total += 1;
		if (p.playerMaster.playerStatus === "ok") counts[pos].healthy += 1;
		if (lineupIds.has(p.playerMaster.id)) counts[pos].lineup += 1;
	}
	const idealMin = {
		1: 2,
		2: 5,
		3: 6,
		4: 4,
		5: 1
	};
	return Object.entries(counts).map(([posId, count]) => {
		const id = Number(posId);
		const recommendedMin = idealMin[id] ?? 2;
		const needScore = Math.min(1, Math.max(0, (recommendedMin - count.healthy) / recommendedMin));
		return {
			positionId: id,
			positionName: POSITION_ORDER[id] || "Otro",
			ownCount: count.total,
			ownHealthyCount: count.healthy,
			recommendedMin,
			needScore
		};
	});
}
function computeRivalNeeds(rivals) {
	const needs = [];
	const idealMin = {
		1: 2,
		2: 5,
		3: 6,
		4: 4,
		5: 1
	};
	for (const rival of rivals) {
		const counts = {};
		for (const p of rival.players) {
			if (p.playerMaster.playerStatus !== "ok") continue;
			counts[p.playerMaster.positionId] = (counts[p.playerMaster.positionId] || 0) + 1;
		}
		for (const [posIdStr, min] of Object.entries(idealMin)) {
			const posId = Number(posIdStr);
			const healthyCount = counts[posId] || 0;
			const needScore = Math.min(1, Math.max(0, (min - healthyCount) / min));
			if (needScore > 0) needs.push({
				teamId: rival.teamId,
				managerId: rival.managerId,
				managerName: rival.managerName,
				positionId: posId,
				positionName: POSITION_ORDER[posId] || "Otro",
				needScore
			});
		}
	}
	return needs;
}
function computeAggregates(rivals, market, ownTeam, ownMoney) {
	const allTeamPlayers = [...ownTeam.players];
	let totalLeagueValue = ownMoney.teamMoney;
	let totalMoneyAvailable = ownMoney.teamMoney;
	for (const rival of rivals) {
		totalLeagueValue += rival.teamValue;
		totalMoneyAvailable += rival.teamMoney ?? 0;
		allTeamPlayers.push(...rival.players);
	}
	const positionDistribution = {};
	for (const p of allTeamPlayers) {
		const pos = p.playerMaster.positionId;
		if (!positionDistribution[pos]) positionDistribution[pos] = {
			name: POSITION_ORDER[pos] || "Otro",
			count: 0,
			color: POSITION_COLORS[pos] || "#94a3b8"
		};
		positionDistribution[pos].count += 1;
	}
	const totalPoints = allTeamPlayers.map((p) => p.playerMaster.points || p.playerMaster.lastSeasonPoints || 0).reduce((sum, v) => sum + v, 0);
	return {
		totalLeagueValue,
		totalMoneyAvailable,
		totalPlayers: allTeamPlayers.length,
		playersOnSale: market.length,
		injuredPlayers: allTeamPlayers.filter((p) => p.playerMaster.playerStatus !== "ok").length,
		averageTeamValue: rivals.length > 0 ? totalLeagueValue / (rivals.length + 1) : totalLeagueValue,
		averageTeamPoints: rivals.length > 0 ? totalPoints / (rivals.length + 1) : totalPoints,
		positionDistribution
	};
}
//#endregion
//#region src/lib/clause-availability.ts
/**
* Disponibilidad de un jugador para ser clausulado.
*
* - `shielded`: el propietario lo ha blindado; no se puede clausular.
* - `locked`: la cláusula está bloqueada hasta `until`. Cubre tanto la
*   subida de cláusula reciente como las 2 semanas de protección tras un
*   clausulazo; en ambos casos el jugador no se puede clausular.
* - `available`: se puede pagar la cláusula ahora mismo.
*/
function getClauseProtection(player, now = Date.now()) {
	if (player.isShielded) return { status: "shielded" };
	if (player.buyoutClauseLockedEndTime) {
		const lockEnd = Date.parse(player.buyoutClauseLockedEndTime);
		if (!Number.isNaN(lockEnd) && lockEnd > now) return {
			status: "locked",
			until: player.buyoutClauseLockedEndTime
		};
	}
	return { status: "available" };
}
//#endregion
//#region src/lib/recommendations/clause-risk.ts
function analyzeClauseRisks(analysis) {
	const { teamData, rivals, calendar } = analysis;
	const results = [];
	const maxRivalMoney = rivals.length > 0 ? Math.max(0, ...rivals.map((r) => r.teamMoney ?? r.teamValue ?? 0)) : 0;
	for (const teamPlayer of teamData.players) {
		const player = teamPlayer.playerMaster;
		const currentClause = Number(teamPlayer.buyoutClause) || 0;
		const marketValue = Number(player.marketValue) || 1;
		const teamValue = Number(analysis.league.team.teamValue) || 0;
		const protection = getClauseProtection(teamPlayer);
		if (protection.status !== "available") {
			results.push({
				playerId: player.id,
				nickname: player.nickname,
				currentClause,
				marketValue,
				riskScore: 0,
				rivalsThatCanAfford: 0,
				rivalNeedScore: 0,
				recommendedClause: currentClause,
				reasoning: protection.status === "shielded" ? "Está blindado: no se puede clausular." : `Cláusula bloqueada hasta ${formatDate(protection.until)}: no se puede clausular.`
			});
			continue;
		}
		const expected = estimatePoints(player, calendar);
		let rivalsThatCanAfford = 0;
		let maxNeedScore = 0;
		for (const rival of rivals) {
			const spendingPower = rival.teamMoney ?? rival.teamValue;
			if (spendingPower >= currentClause) rivalsThatCanAfford += 1;
			if (!rival.players.some((p) => p.playerMaster.positionId === player.positionId && p.playerMaster.playerStatus === "ok" && (Number(p.playerMaster.marketValue) || 0) >= marketValue * .6)) {
				const needScore = Math.min(1, (spendingPower + 1) / (currentClause + 1));
				if (needScore > maxNeedScore) maxNeedScore = needScore;
			}
		}
		let risk = 0;
		if (rivalsThatCanAfford > 0) risk += 35;
		risk += Math.min(30, marketValue / currentClause * 30);
		risk += Math.min(25, expected * 4);
		risk += maxNeedScore * 20;
		if (player.playerStatus !== "ok") risk *= .5;
		risk = Math.min(100, Math.max(0, risk));
		const recommendedClause = computeRecommendedClause({
			currentClause,
			marketValue,
			maxRivalMoney,
			expected,
			teamValue
		});
		const reasoningParts = [
			`${rivalsThatCanAfford} rival${rivalsThatCanAfford === 1 ? "" : "es"} puede${rivalsThatCanAfford === 1 ? "" : "n"} pagar la cláusula`,
			`valor de mercado ${formatCurrency(marketValue)}`,
			`puntos esperados ${expected.toFixed(1)}`
		];
		if (player.playerStatus !== "ok") reasoningParts.push(`estado ${player.playerStatus}`);
		results.push({
			playerId: player.id,
			nickname: player.nickname,
			currentClause,
			marketValue,
			riskScore: Math.round(risk),
			rivalsThatCanAfford,
			rivalNeedScore: maxNeedScore,
			recommendedClause,
			reasoning: reasoningParts.join(" · ")
		});
	}
	return results.sort((a, b) => b.riskScore - a.riskScore);
}
function computeRecommendedClause(inputs) {
	const { currentClause, marketValue, maxRivalMoney, expected, teamValue } = inputs;
	const clauseBump = currentClause * 1.15;
	const valueBased = marketValue * 1.35;
	const rivalBased = Math.max(maxRivalMoney * 1.05, marketValue + maxRivalMoney * .5);
	const performanceBased = marketValue + expected * 15e5;
	let recommended = Math.max(clauseBump, valueBased, rivalBased, performanceBased);
	const absoluteMax = Math.max(5e8, teamValue * .6);
	recommended = Math.min(recommended, absoluteMax);
	recommended = Math.ceil(recommended / 1e5) * 1e5;
	return recommended;
}
function formatDate(iso) {
	if (!iso) return "fecha desconocida";
	const time = Date.parse(iso);
	if (Number.isNaN(time)) return iso;
	return new Date(time).toLocaleDateString("es-ES", {
		day: "numeric",
		month: "short"
	});
}
function formatCurrency(value) {
	return new Intl.NumberFormat("es-ES", {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: 0
	}).format(value);
}
//#endregion
//#region src/lib/analysis/starter-status.ts
var DEFAULT_CACHE_TTL_MS = 216e5;
var cache$1 = /* @__PURE__ */ new Map();
function cacheTtlMs() {
	const fromEnv = Number(getEnvOptional("STARTER_CACHE_TTL_MS"));
	return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_CACHE_TTL_MS;
}
function labelForScore(score) {
	if (score >= .8) return "Titular";
	if (score >= .55) return "Habitual";
	if (score >= .35) return "Rotación";
	return "Suplente";
}
/** Score 0-1 a partir de minutos jugados por jornada. */
function starterScoreFromMinutes(playerStats) {
	const weeksWithMinutes = playerStats.filter((s) => (s.stats?.mins_played?.[0] ?? 0) > 0);
	if (weeksWithMinutes.length === 0) return null;
	const avgMinutes = weeksWithMinutes.reduce((sum, s) => sum + (s.stats?.mins_played?.[0] ?? 0), 0) / weeksWithMinutes.length;
	const minutesRatio = Math.min(1, avgMinutes / 90);
	const weeksRatio = Math.min(1, weeksWithMinutes.length / Math.max(playerStats.length, 1) + .25);
	return Math.round(minutesRatio * (.5 + .5 * weeksRatio) * 100) / 100;
}
/** Proxy por puntos por partido de la temporada pasada. */
function starterScoreFromLastSeason(lastSeasonPoints) {
	const perGame = (Number(lastSeasonPoints) || 0) / 38;
	if (perGame >= 4) return .9;
	if (perGame >= 2.5) return .65;
	if (perGame >= 1.2) return .4;
	return .2;
}
function starterInfoFromPlayer(player) {
	const score = starterScoreFromLastSeason(player.lastSeasonPoints);
	return {
		playerId: player.id,
		score,
		label: labelForScore(score),
		source: "last-season"
	};
}
async function withConcurrency(items, fn, concurrency = 5) {
	const results = new Array(items.length);
	let index = 0;
	async function worker() {
		while (index < items.length) {
			const current = index++;
			results[current] = await fn(items[current]);
		}
	}
	await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
	return results;
}
/**
* Resuelve la titularidad de una lista de jugadores (típicamente la plantilla
* propia). Consulta el detalle de cada jugador con caché de 6 h; si falla o no
* hay minutos todavía (pretemporada), usa el proxy de la temporada pasada.
*/
async function fetchStarterInfo(players, fetchPlayerDetail) {
	const now = Date.now();
	const result = {};
	const pending = [];
	for (const player of players) {
		const cached = cache$1.get(player.id);
		if (cached && cached.expiresAt > now) result[player.id] = cached.info;
		else pending.push(player);
	}
	await withConcurrency(pending, async (player) => {
		let info;
		try {
			const minutesScore = starterScoreFromMinutes((await fetchPlayerDetail(player.id))?.playerMaster?.playerStats || []);
			info = minutesScore !== null ? {
				playerId: player.id,
				score: minutesScore,
				label: labelForScore(minutesScore),
				source: "minutes"
			} : starterInfoFromPlayer(player);
		} catch (error) {
			console.warn(`[starter-status] detail failed for player ${player.id}:`, error instanceof Error ? error.message : error);
			info = starterInfoFromPlayer(player);
		}
		cache$1.set(player.id, {
			expiresAt: now + cacheTtlMs(),
			info
		});
		result[player.id] = info;
	}, 5);
	return result;
}
//#endregion
//#region src/lib/analysis/lineup-optimizer.ts
var BAD_NEWS_CONFIDENCE = .6;
var BENCH_SIZE = 5;
var COACH_POSITION_ID = 5;
/**
* Calcula la alineación que maximiza los puntos esperados de la próxima
* jornada probando todas las formaciones disponibles.
*
* Elegibles: jugadores sanos (`playerStatus === 'ok'`) y sin noticias muy
* negativas (lesión/enfermedad/sanción reciente). El entrenador (positionId 5)
* no entra en las formaciones de campo.
*/
function computeOptimalLineup(input) {
	const { squad, currentLineup, calendar, formations, context } = input;
	const fieldPlayers = squad.map((tp) => tp.playerMaster).filter((p) => p.positionId !== COACH_POSITION_ID);
	let eligible = fieldPlayers.filter((p) => p.playerStatus === "ok").filter((p) => {
		const external = combinedSignal(context?.externalSignals?.[p.id] || []);
		return !(external.signal === "sell" && external.confidence >= BAD_NEWS_CONFIDENCE);
	});
	let degraded = false;
	let best = pickBestFormation(eligible, calendar, formations, context);
	if (!best) {
		eligible = fieldPlayers;
		degraded = true;
		best = pickBestFormation(eligible, calendar, formations, context);
	}
	if (!best) return void 0;
	const starterIds = new Set(best.starters.map((e) => e.player.id));
	const bench = eligible.filter((p) => !starterIds.has(p.id)).map((player) => ({
		player,
		expectedPoints: estimatePoints(player, calendar, context)
	})).sort((a, b) => b.expectedPoints - a.expectedPoints).slice(0, BENCH_SIZE);
	const currentEntries = [
		...currentLineup.formation.goalkeeper || [],
		...currentLineup.formation.defender || [],
		...currentLineup.formation.midfielder || [],
		...currentLineup.formation.attacker || []
	];
	const currentIds = new Set(currentEntries.map((e) => e.playerMaster.id));
	const currentExpected = currentEntries.reduce((sum, e) => sum + estimatePoints(e.playerMaster, calendar, context), 0);
	const outgoing = currentEntries.map((e) => e.playerMaster).filter((p) => !starterIds.has(p.id) && p.positionId !== COACH_POSITION_ID).sort((a, b) => a.positionId - b.positionId);
	const incoming = best.starters.map((e) => e.player).filter((p) => !currentIds.has(p.id)).sort((a, b) => a.positionId - b.positionId);
	const changes = outgoing.map((out, i) => ({
		out,
		in: incoming[i] || out
	}));
	const starters = [...best.starters].sort((a, b) => a.player.positionId - b.player.positionId || b.expectedPoints - a.expectedPoints);
	return {
		formation: best.formation,
		starters,
		bench,
		totalExpected: round1(best.total),
		currentExpected: round1(currentExpected),
		improvement: round1(best.total - currentExpected),
		changes,
		degraded
	};
}
/** Prueba todas las formaciones y devuelve la que más puntos esperados suma. */
function pickBestFormation(eligible, calendar, formations, context) {
	if (eligible.length === 0) return void 0;
	const byPosition = /* @__PURE__ */ new Map();
	for (const player of eligible) {
		const entry = {
			player,
			expectedPoints: estimatePoints(player, calendar, context)
		};
		const list = byPosition.get(player.positionId) || [];
		list.push(entry);
		byPosition.set(player.positionId, list);
	}
	for (const list of byPosition.values()) list.sort((a, b) => b.expectedPoints - a.expectedPoints);
	let best;
	for (const formation of formations) {
		const [defCount, midCount, attCount] = formation.split(",").map((n) => parseInt(n, 10));
		if (![
			defCount,
			midCount,
			attCount
		].every((n) => Number.isFinite(n))) continue;
		const gks = byPosition.get(1) || [];
		const defs = byPosition.get(2) || [];
		const mids = byPosition.get(3) || [];
		const atts = byPosition.get(4) || [];
		if (gks.length < 1 || defs.length < defCount || mids.length < midCount || atts.length < attCount) continue;
		const starters = [
			...gks.slice(0, 1),
			...defs.slice(0, defCount),
			...mids.slice(0, midCount),
			...atts.slice(0, attCount)
		];
		const total = starters.reduce((sum, e) => sum + e.expectedPoints, 0);
		if (!best || total > best.total) best = {
			formation: formatFormation(defCount, midCount, attCount),
			starters,
			total
		};
	}
	return best;
}
function formatFormation(def, mid, att) {
	return `${def}-${mid}-${att}`;
}
function round1(value) {
	return Math.round(value * 10) / 10;
}
//#endregion
//#region src/lib/fantasy/formations.ts
var CACHE_TTL_MS = 864e5;
var FALLBACK_FORMATIONS = [
	"4,4,2",
	"4,3,3",
	"5,3,2",
	"4,5,1",
	"3,5,2",
	"3,4,3",
	"5,4,1"
];
var cache = null;
/**
* Formaciones gratuitas disponibles para la alineación ("defensas,cents,dels").
* Se cachean 24 h; si el endpoint falla se usa la lista estándar.
*/
async function fetchFreeFormations(token) {
	if (cache && cache.expiresAt > Date.now()) return cache.formations;
	try {
		const formations = await fetchOfficialAPI("/v4/teams/lineup/formations", token, { option: "free" });
		if (Array.isArray(formations) && formations.length > 0) {
			cache = {
				expiresAt: Date.now() + CACHE_TTL_MS,
				formations
			};
			return formations;
		}
	} catch (error) {
		console.warn("[formations] fetch failed:", error instanceof Error ? error.message : error);
	}
	return FALLBACK_FORMATIONS;
}
//#endregion
export { analyzeClauseRisks as a, recommendCaptain as c, combinedSignal as d, fetchExternalSignals as f, getToken as h, starterScoreFromLastSeason as i, buildTeamStrength as l, fetchOfficialAPI as m, computeOptimalLineup as n, getClauseProtection as o, CMP as p, fetchStarterInfo as r, buildLeagueAnalysis as s, fetchFreeFormations as t, estimatePoints as u };
