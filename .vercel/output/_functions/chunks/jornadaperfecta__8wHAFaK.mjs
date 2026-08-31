import { c as getEnvOptional, r as fetchOfficialAPI } from "./api-proxy_CUjR3F-2.mjs";
import { n as recentForm } from "./form_3qfbgRvD.mjs";
import { n as fetchTextWithCache, t as buildTeamMatcher } from "./team-names_C8XSvDvH.mjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import nodePath from "node:path";
//#region src/lib/news/classifier.ts
/**
* Reglas por orden de prioridad. A diferencia del clasificador anterior,
* classifyNewsAll devuelve TODAS las categorías con evidencia (no gana la
* primera que casa), y cada acierto se ajusta por negación y especulación
* (§4.6 del diseño).
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
/** Negadores en la ventana previa a la palabra clave ("descartan lesión", "sin lesión"). */
var NEGATORS = /* @__PURE__ */ new Set([
	"no",
	"sin",
	"nunca",
	"jamas",
	"niega",
	"descarta",
	"descartan",
	"descartado",
	"descartada"
]);
/** Marcadores de especulación: la confianza baja (rumor ≠ hecho). */
var SPECULATION_MARKERS = [
	"podria",
	"podrian",
	"se teme",
	"rumorea",
	"rumor",
	"en el aire",
	"posible",
	"posibilidad",
	"suena",
	"apunta a",
	"parece"
];
var SPECULATION_FACTOR = .6;
var NEGATION_FACTOR = .25;
function normalize(value) {
	return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function containsPhrase(normalizedText, phrase) {
	return phraseIndex(normalizedText, phrase) >= 0;
}
function phraseIndex(normalizedText, phrase) {
	const escaped = normalize(phrase).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).exec(normalizedText);
	return match ? match.index : -1;
}
/** true si hay un negador en las 4 palabras anteriores a la posición dada. */
function isNegated(normalizedText, index) {
	return normalizedText.slice(0, index).trim().split(/\s+/).slice(-4).some((token) => NEGATORS.has(token));
}
function isSpeculative(normalizedText) {
	return SPECULATION_MARKERS.some((marker) => containsPhrase(normalizedText, marker));
}
/**
* Clasifica una noticia (título + descripción) devolviendo TODAS las
* categorías con evidencia, ajustadas por negación y especulación (§4.6).
* Una coincidencia negada ("descartan lesión") pasa a hold con confianza
* reducida en vez de ser una falsa alarma de venta.
*/
function classifyNewsAll(text) {
	const normalized = normalize(text);
	const speculative = isSpeculative(normalized);
	const results = [];
	for (const rule of RULES) for (const keyword of rule.keywords) {
		const index = phraseIndex(normalized, keyword);
		if (index < 0) continue;
		const negated = isNegated(normalized, index);
		let confidence = rule.confidence;
		let signal = rule.signal;
		if (negated) {
			confidence *= NEGATION_FACTOR;
			signal = "hold";
		}
		if (speculative) confidence *= SPECULATION_FACTOR;
		results.push({
			category: rule.category,
			signal,
			confidence,
			negated,
			speculative
		});
		break;
	}
	return results.sort((a, b) => b.confidence - a.confidence);
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
/**
* Construye patrones de búsqueda para un jugador:
* - fuertes: nombre completo (`name`) y apodo (`nickname`)
* - débiles: apellidos (tokens tras el nombre de pila) de >= 4 caracteres
*/
function buildPatterns(player) {
	const strong = [];
	const weak = [];
	const fullName = normalize(player.name || "");
	const nickname = normalize(player.nickname || "");
	if (fullName.length >= 3) strong.push(wordBoundary(fullName));
	if (nickname.length >= 3 && nickname !== fullName) strong.push(wordBoundary(nickname));
	for (const part of fullName.split(/\s+/).slice(1)) if (part.length >= 4 && !STOPWORDS.has(part)) weak.push({
		token: part,
		re: wordBoundary(part)
	});
	const teamTokens = normalize(player.teamName || "").split(/\s+/).filter((t) => t.length >= 4 && !STOPWORDS.has(t));
	return {
		playerId: player.id,
		strong,
		weak,
		teamTokens
	};
}
function isRecent(item, now = Date.now()) {
	if (!item.publishedAt) return true;
	const time = Date.parse(item.publishedAt);
	if (Number.isNaN(time)) return true;
	return now - time <= MAX_NEWS_AGE_MS;
}
/**
* Devuelve, para cada jugador, las noticias que lo mencionan.
* Desambiguación por equipo (§4.6): si un apellido es compartido por varios
* jugadores seguidos, la coincidencia débil solo cuenta si la noticia menciona
* también al equipo (acaba con los García/López cruzados).
*/
function matchNewsToPlayers(players, items) {
	const playerPatterns = players.map(buildPatterns);
	const surnameCount = /* @__PURE__ */ new Map();
	for (const pattern of playerPatterns) for (const { token } of pattern.weak) surnameCount.set(token, (surnameCount.get(token) || 0) + 1);
	const result = {};
	for (const item of items) {
		if (!isRecent(item)) continue;
		if (!isRelevantContext(item)) continue;
		const text = normalize(`${item.title} ${item.description}`);
		for (const pattern of playerPatterns) {
			if (pattern.strong.length === 0 && pattern.weak.length === 0) continue;
			const strongHit = pattern.strong.some((re) => re.test(text));
			const weakHitToken = pattern.weak.find(({ re }) => re.test(text))?.token;
			if (!strongHit && !weakHitToken) continue;
			if (!strongHit && weakHitToken && (surnameCount.get(weakHitToken) || 0) > 1) {
				if (!(pattern.teamTokens.length > 0 && pattern.teamTokens.some((t) => text.includes(t)))) continue;
			}
			(result[pattern.playerId] ||= []).push(item);
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
var DEFAULT_CACHE_TTL_MS = 18e5;
var FETCH_TIMEOUT_MS = 8e3;
var USER_AGENT = "fantasy-manager/0.1 (+https://localhost)";
/**
* Peso de cada fuente (priors iniciales; se calibrarán con el track record
* de señales, §4.6). 20minutos es generalista: menor peso que la prensa
* deportiva.
*/
var SOURCE_WEIGHTS = {
	Marca: .9,
	AS: .9,
	"Mundo Deportivo": .85,
	Sport: .85,
	"20minutos": .7
};
var DEFAULT_SOURCE_WEIGHT = .75;
/** Decaimiento exponencial por antigüedad (τ = 3 días; a los 7 días ≈ 0.1). */
var DECAY_TAU_DAYS = 3;
/** Similitud mínima de titulares para considerar la misma historia en dos medios. */
var STORY_JACCARD = .6;
var cache$1 = null;
var inflight = null;
function cacheTtlMs() {
	const fromEnv = Number(getEnvOptional("NEWS_CACHE_TTL_MS"));
	return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_CACHE_TTL_MS;
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
	const feedsOk = [];
	const feedsFailed = [];
	for (let i = 0; i < results.length; i++) {
		const result = results[i];
		if (result.status === "fulfilled") {
			itemsBySource.push(...result.value);
			feedsOk.push(feeds[i].name);
		} else {
			feedsFailed.push(feeds[i].name);
			console.warn(`[news] Feed "${feeds[i].name}" failed:`, result.reason?.message || result.reason);
		}
	}
	return {
		fetchedAt: Date.now(),
		itemsBySource,
		feedsOk,
		feedsFailed
	};
}
/** Devuelve las noticias cacheadas; solo descarga cuando expira el TTL. */
async function getNews() {
	if (cache$1 && Date.now() - cache$1.fetchedAt < cacheTtlMs()) return cache$1;
	if (inflight) return inflight;
	inflight = fetchAllFeeds().then((fresh) => {
		if (fresh.itemsBySource.length === 0 && cache$1) return cache$1;
		cache$1 = fresh;
		return fresh;
	}).finally(() => {
		inflight = null;
	});
	return inflight;
}
/** Peso por antigüedad: decaimiento exponencial dentro de la ventana (no binario). */
function ageWeight(publishedAt) {
	if (!publishedAt) return 1;
	const time = Date.parse(publishedAt);
	if (Number.isNaN(time)) return 1;
	const days = Math.max(0, (Date.now() - time) / 864e5);
	return Math.exp(-days / DECAY_TAU_DAYS);
}
function sourceWeight(source) {
	return SOURCE_WEIGHTS[source] ?? DEFAULT_SOURCE_WEIGHT;
}
var TITLE_STOPWORDS = /* @__PURE__ */ new Set([
	"el",
	"la",
	"los",
	"las",
	"de",
	"del",
	"en",
	"y",
	"a",
	"al",
	"con",
	"por",
	"para",
	"un",
	"una",
	"su",
	"sus",
	"es",
	"se"
]);
function titleTokens(title) {
	return new Set(normalize(title).split(/[^a-z0-9]+/).filter((t) => t.length >= 4 && !TITLE_STOPWORDS.has(t)));
}
function jaccard(a, b) {
	if (a.size === 0 || b.size === 0) return 0;
	let intersection = 0;
	for (const token of a) if (b.has(token)) intersection += 1;
	return intersection / (a.size + b.size - intersection);
}
/**
* Deduplicación de la misma historia en varios medios (§4.6): titulares
* similares (Jaccard ≥ 0.6) de la misma categoría cuentan una sola vez, la
* de mayor confianza. Así la cobertura mediática no infla la confianza.
*/
function dedupeStories(signals) {
	const kept = [];
	for (const signal of signals.sort((a, b) => b.confidence - a.confidence)) if (!kept.some((other) => other.category === signal.category && jaccard(other.storyTokens, signal.storyTokens) >= STORY_JACCARD)) kept.push(signal);
	return kept;
}
/**
* Obtiene señales de noticias para los jugadores indicados, con cobertura
* real de fuentes para propagar a dataQuality (ausencia de señal ≠ "todo OK").
*/
async function fetchNewsSignals(players) {
	const news = await getNews();
	const coverage = {
		feedsOk: news.feedsOk,
		feedsFailed: news.feedsFailed,
		items: news.itemsBySource.length
	};
	if (news.itemsBySource.length === 0 || players.length === 0) return {
		signals: {},
		coverage
	};
	const matched = matchNewsToPlayers(players, news.itemsBySource.map((x) => x.item));
	const sourceByItem = /* @__PURE__ */ new Map();
	for (const { source, item } of news.itemsBySource) sourceByItem.set(item, source);
	const signals = {};
	for (const [playerId, playerItems] of Object.entries(matched)) {
		const scored = [];
		for (const item of playerItems) {
			const source = sourceByItem.get(item) || "news";
			const classifications = classifyNewsAll(`${item.title} ${item.description}`);
			for (const classification of classifications) scored.push({
				source,
				signal: classification.signal,
				confidence: Math.min(1, classification.confidence * sourceWeight(source) * ageWeight(item.publishedAt)),
				category: classification.category,
				reason: item.title,
				url: item.link || void 0,
				publishedAt: item.publishedAt,
				storyTokens: titleTokens(item.title)
			});
		}
		const deduped = dedupeStories(scored);
		if (deduped.length > 0) signals[playerId] = deduped.slice(0, 3).map(({ storyTokens: _storyTokens, ...signal }) => signal);
	}
	return {
		signals,
		coverage
	};
}
//#endregion
//#region src/lib/recommendations/external-intelligence.ts
/**
* Combina dos fuentes de inteligencia externa:
*
* 1. Noticias de prensa deportiva (módulo `src/lib/news`): RSS de Marca, AS,
*    Mundo Deportivo, Sport y 20minutos clasificados por categorías
*    (lesión, enfermedad, sanción, duda, vuelta, racha...), con peso por
*    fuente, decaimiento por antigüedad y deduplicación de la misma historia
*    en varios medios (§4.6).
*    Configurable con NEWS_RSS_FEEDS y NEWS_CACHE_TTL_MS.
*
* 2. PLAYER_STATS_JSON_URL: URL opcional con un JSON de señales externas
*    ({ playerId, signal, confidence, reason }) para integraciones propias.
*/
async function fetchExternalSignals(players) {
	const signals = {};
	let coverage = {
		feedsOk: [],
		feedsFailed: [],
		items: 0
	};
	try {
		const news = await fetchNewsSignals(players);
		merge(signals, news.signals);
		coverage = news.coverage;
	} catch (error) {
		console.warn("[external-intelligence] news provider failed:", error);
	}
	const statsUrl = getEnvOptional("PLAYER_STATS_JSON_URL");
	if (statsUrl) try {
		merge(signals, await fetchStatsJSON(statsUrl, players.map((p) => p.id)));
	} catch (error) {
		console.warn("[external-intelligence] PLAYER_STATS_JSON_URL failed:", error);
	}
	return {
		signals,
		coverage
	};
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
			confidence: clamp$2(Number(entry.confidence) || .5, 0, 1),
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
function clamp$2(value, min, max) {
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
var HARD_NEGATIVE_CATEGORIES = [
	"injury",
	"illness",
	"suspension"
];
var POSITIVE_CATEGORIES = ["return", "form"];
function noisyOr(signals, categories) {
	let product = 1;
	for (const s of signals) if (s.category && categories.includes(s.category)) product *= 1 - s.confidence;
	return 1 - product;
}
function categoryEvidence(signals) {
	return {
		hardNegative: noisyOr(signals, HARD_NEGATIVE_CATEGORIES),
		doubt: noisyOr(signals, ["doubt"]),
		rotation: noisyOr(signals, ["rotation"]),
		positive: noisyOr(signals, POSITIVE_CATEGORIES)
	};
}
//#endregion
//#region src/lib/engine/params.ts
/**
* Parámetros calibrables del motor (§8, Fase 3): se buscan por backtesting
* walk-forward sobre el track record y se persisten en data/engine-params.json.
* El modelo los lee de forma síncrona (caché en memoria); sin fichero, los
* valores por defecto del diseño.
*/
var PARAMS_FILE = nodePath.join(process.cwd(), "data", "engine-params.json");
var MEM_CACHE_MS = 6e4;
/** Valores por defecto del diseño (antes de cualquier calibración). */
var DEFAULT_ENGINE_PARAMS = {
	shrinkageK: 8,
	eloDiffDivisor: 1e3,
	riskLambda: .3,
	moveFrictionXp: 1.5,
	maxMovesPerWeek: 3,
	holdBonusXp: .2
};
var cached = null;
/** Carga los parámetros (disco + caché 60 s). Llamar una vez por request. */
async function loadEngineParams() {
	if (cached && Date.now() - cached.loadedAt < MEM_CACHE_MS) return cached.params;
	let params = DEFAULT_ENGINE_PARAMS;
	try {
		const raw = JSON.parse(await readFile(PARAMS_FILE, "utf8"));
		params = {
			...DEFAULT_ENGINE_PARAMS,
			...raw
		};
	} catch {}
	cached = {
		loadedAt: Date.now(),
		params
	};
	return params;
}
/** Lectura síncrona desde la caché (o defaults si aún no se ha cargado). */
function getEngineParams() {
	return cached?.params ?? DEFAULT_ENGINE_PARAMS;
}
/** Persiste parámetros calibrados y actualiza la caché. */
async function saveEngineParams(params) {
	await mkdir(nodePath.dirname(PARAMS_FILE), { recursive: true });
	await writeFile(PARAMS_FILE, JSON.stringify(params, null, 2));
	cached = {
		loadedAt: Date.now(),
		params
	};
}
//#endregion
//#region src/lib/engine/features/fixture.ts
/**
* Dificultad del fixture desde ratings Elo reales (ClubElo), sustituyendo al
* proxy de "valor de mercado agregado" del motor anterior (efecto máximo ±8%,
* claramente insuficiente según §2.1.6 del diseño).
*
* v1: multiplicador continuo a partir de la diferencia de Elo con ventaja de
* campo dentro del propio factor (nunca duplicada). La tabla posición × tier
* × localía del diseño se estimará sobre el histórico acumulado del track
* record cuando haya datos; hasta entonces esta fórmula es el factor único.
* El divisor es calibrable por backtesting (Fase 3, data/engine-params.json).
*/
/** Ventaja de campo en puntos Elo (estándar ClubElo en ligas europeas). */
var HOME_ELO_ADVANTAGE = 65;
/** Rango del multiplicador de fixture. */
var MIN_MULTIPLIER = .85;
var MAX_MULTIPLIER = 1.15;
function clamp$1(value, min, max) {
	return Math.min(max, Math.max(min, value));
}
/**
* Multiplicador de puntos esperados por fixture: >1 si el rival es más débil
* o se juega en casa, <1 si es más fuerte o fuera. Equipos iguales: ~1.065 en
* casa, ~0.935 fuera.
*/
function fixtureMultiplierFromElo(eloOwn, eloOpponent, isHome, divisor) {
	const eloDiffDivisor = divisor ?? getEngineParams().eloDiffDivisor;
	return clamp$1(1 + (isHome ? eloOwn + HOME_ELO_ADVANTAGE - eloOpponent : eloOwn - (eloOpponent + HOME_ELO_ADVANTAGE)) / eloDiffDivisor, MIN_MULTIPLIER, MAX_MULTIPLIER);
}
//#endregion
//#region src/lib/engine/features/minutes.ts
var P_STARTER_IN_PROBABLE_XI = .85;
var P_STARTER_ON_BENCH = .15;
var DOUBT_FACTOR = .45;
/** E[mins] condicionales por defecto cuando no hay histórico. */
var DEFAULT_MINS_IF_STARTER = 75;
var DEFAULT_MINS_IF_BENCH = 15;
function normalizePlayerName(name) {
	return String(name ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
/**
* Cruce jugador oficial ↔ nombre/slug de fuente externa, en orden:
* 1. slug exacto; 2. slug uno sufijo del otro ('r-de-galarreta'/'de-galarreta');
* 3. nombre completo contenido ('Inigo Ruiz de Galarreta' ⊇ 'De Galarreta');
* 4. apellido único dentro de la lista candidata (evita los García/López).
* Devuelve el índice del candidato que casa, o -1.
*/
function findPlayerIndex(player, candidates) {
	const officialSlug = player.slug?.toLowerCase();
	if (officialSlug) {
		const exact = candidates.findIndex((c) => c.slug && c.slug.toLowerCase() === officialSlug);
		if (exact >= 0) return exact;
		const suffix = candidates.findIndex((c) => {
			const slug = c.slug?.toLowerCase();
			return slug && (officialSlug.endsWith(slug) || slug.endsWith(officialSlug));
		});
		if (suffix >= 0) return suffix;
	}
	const officialName = normalizePlayerName(player.name);
	const normalized = candidates.map((c) => normalizePlayerName(c.name));
	const exactName = normalized.findIndex((n) => n === officialName);
	if (exactName >= 0) return exactName;
	const contained = normalized.findIndex((n) => {
		const shorter = n.length <= officialName.length ? n : officialName;
		const longer = n.length <= officialName.length ? officialName : n;
		return shorter.split(" ").length >= 2 && longer.includes(shorter);
	});
	if (contained >= 0) return contained;
	const surname = officialName.split(" ").pop() ?? officialName;
	if (surname.length >= 3) {
		const matches = normalized.map((n, i) => n.split(" ").includes(surname) ? i : -1).filter((i) => i >= 0);
		if (matches.length === 1) return matches[0];
	}
	return -1;
}
function findInjury(player, injuries) {
	const index = findPlayerIndex(player, injuries);
	return index >= 0 ? injuries[index] : void 0;
}
/** true si el jugador está suspendido según la API oficial o el injury report externo. */
function isSuspended(player, injuries) {
	if (player.playerStatus === "suspended") return true;
	return (injuries && injuries.length > 0 ? findInjury(player, injuries) : void 0)?.status === "suspended";
}
function estimateMinutes(input) {
	const { player, historicalMinutes, probableLineups, injuries, confirmedLineups, teamId } = input;
	const injury = injuries && injuries.length > 0 ? findInjury(player, injuries) : void 0;
	if (injury && (injury.status === "injured" || injury.status === "suspended")) return {
		pStarter: 0,
		expectedMinutes: 0,
		source: "injury-report",
		note: `Baja según Jornada Perfecta (${injury.status}${injury.note ? `: ${injury.note}` : ""}).`
	};
	const minsIfStarter = historicalMinutes !== null && historicalMinutes >= 45 ? historicalMinutes : DEFAULT_MINS_IF_STARTER;
	const confirmed = teamId !== void 0 ? confirmedLineups?.get(teamId) : void 0;
	if (confirmed) {
		const inStarters = findPlayerIndex(player, confirmed.starters.map((name) => ({ name })));
		const inBench = inStarters < 0 ? findPlayerIndex(player, confirmed.bench.map((name) => ({ name }))) : -1;
		if (inStarters >= 0 || inBench >= 0) {
			const pStarter = inStarters >= 0 ? 1 : 0;
			return {
				pStarter,
				expectedMinutes: Math.round(pStarter * minsIfStarter + (1 - pStarter) * DEFAULT_MINS_IF_BENCH),
				source: "confirmed-lineup",
				note: inStarters >= 0 ? "Titular confirmado (Sofascore)." : "Suplente confirmado (Sofascore)."
			};
		}
	}
	const lineup = teamId !== void 0 ? probableLineups?.get(teamId) : void 0;
	if (lineup) {
		const starterIndex = findPlayerIndex(player, lineup.starters);
		const starter = starterIndex >= 0 ? lineup.starters[starterIndex] : void 0;
		let pStarter;
		if (starter) pStarter = P_STARTER_IN_PROBABLE_XI * (starter.probability > 0 && starter.probability < 100 ? starter.probability / 100 : 1);
		else pStarter = P_STARTER_ON_BENCH;
		if (injury?.status === "doubt" || injury?.status === "other") pStarter *= DOUBT_FACTOR;
		const expectedMinutes = Math.round(pStarter * minsIfStarter + (1 - pStarter) * DEFAULT_MINS_IF_BENCH);
		return {
			pStarter,
			expectedMinutes,
			source: "probable-lineup",
			note: starter ? "En el once probable (Jornada Perfecta)." : "Fuera del once probable (Jornada Perfecta)."
		};
	}
	if (historicalMinutes !== null) {
		let pStarter = Math.min(1, historicalMinutes / 90);
		let expectedMinutes = historicalMinutes;
		if (injury?.status === "doubt" || injury?.status === "other") {
			pStarter *= DOUBT_FACTOR;
			expectedMinutes *= DOUBT_FACTOR;
		}
		return {
			pStarter,
			expectedMinutes: Math.round(expectedMinutes),
			source: "historical",
			note: injury ? `Duda según Jornada Perfecta (${injury.note ?? "sin detalle"}).` : void 0
		};
	}
	return null;
}
function partialPool(observed, n, prior, k = 8) {
	if (n <= 0) return prior;
	return (n * observed + k * prior) / (n + k);
}
/** Puntos por partido de referencia de un jugador del catálogo. */
function perGameOf(player) {
	const averagePoints = Number(player.averagePoints) || 0;
	if (averagePoints > 0) return averagePoints;
	return (Number(player.lastSeasonPoints) || 0) / 38;
}
/** Tier de equipo 1 (top) a 5 desde los ratings Elo, por quintiles. */
function buildTeamTiers(eloByTeamId) {
	const sorted = [...eloByTeamId.entries()].sort((a, b) => b[1] - a[1]);
	const tiers = /* @__PURE__ */ new Map();
	const size = Math.max(sorted.length, 1);
	sorted.forEach(([teamId], index) => {
		tiers.set(teamId, Math.min(5, Math.floor(index * 5 / size) + 1));
	});
	return tiers;
}
/**
* Medias de posición × tier de equipo sobre el catálogo completo (el baseline
* correcto, no el pool de candidatos).
*/
function buildShrinkagePriors(allPlayers, teamTiers) {
	const sum = /* @__PURE__ */ new Map();
	const count = /* @__PURE__ */ new Map();
	for (const player of allPlayers) {
		const perGame = perGameOf(player);
		if (perGame <= 0) continue;
		const positionId = Number(player.positionId);
		const teamId = resolveTeamId(player);
		const key = `${positionId}:${(teamId !== void 0 ? teamTiers.get(teamId) : void 0) ?? 3}`;
		sum.set(key, (sum.get(key) || 0) + perGame);
		count.set(key, (count.get(key) || 0) + 1);
	}
	const byPositionTier = /* @__PURE__ */ new Map();
	for (const [key, total] of sum) byPositionTier.set(key, total / Math.max(count.get(key) || 0, 1));
	return byPositionTier;
}
/**
* Prior de puntos por partido de un jugador siguiendo la jerarquía del
* diseño: su temporada pasada → posición×tier de su equipo → posición global.
*/
function priorForPlayer(player, priors) {
	const lastSeason = (Number(player.lastSeasonPoints) || 0) / 38;
	if (lastSeason > 0) return {
		prior: lastSeason,
		note: "prior: temporada pasada del jugador"
	};
	const teamId = resolveTeamId(player);
	const tier = (teamId !== void 0 ? priors.teamTiers?.get(teamId) : void 0) ?? 3;
	const byTier = priors.byPositionTier.get(`${player.positionId}:${tier}`);
	if (byTier !== void 0) return {
		prior: byTier,
		note: `prior: media posición×tier (tier ${tier})`
	};
	return {
		prior: priors.positionAverages?.get(player.positionId) ?? 0,
		note: "prior: media global de posición"
	};
}
//#endregion
//#region src/lib/engine/model.ts
var HOME_MULTIPLIER = 1.05;
var AWAY_MULTIPLIER = .98;
var BAD_STATUS_MULTIPLIER = .3;
var BAD_NEWS_CONFIDENCE = .6;
var BAD_NEWS_MULTIPLIER = .3;
var GOOD_NEWS_CONFIDENCE = .5;
var GOOD_NEWS_MULTIPLIER = 1.08;
function predictPlayerPoints(player, matches, context) {
	const teamId = resolveTeamId(player);
	const homeMatch = teamId !== void 0 ? matches.find((m) => m.localId === teamId) : void 0;
	const awayMatch = teamId !== void 0 ? matches.find((m) => m.visitorId === teamId) : void 0;
	if (matches.length > 0 && teamId !== void 0 && !homeMatch && !awayMatch) return {
		xp: 0,
		riskAdjustedXp: 0,
		expectedMinutes: 0,
		pStarter: 0,
		pointsStdDev: null,
		source: "bye-week",
		dataQuality: {
			level: "high",
			notes: ["Su equipo descansa esta jornada."]
		}
	};
	const notes = [];
	let base = null;
	let source = "position-average";
	let expectedMinutes = null;
	let level = "low";
	const stats = context?.playerStats?.[player.id];
	let weeksUsed = 0;
	let pointsStdDev = null;
	if (stats && stats.length > 0) {
		const form = recentForm(stats, context?.weekNumber);
		weeksUsed = form.weeksUsed;
		pointsStdDev = form.pointsStdDev;
		expectedMinutes = form.expectedMinutes;
		if (form.pointsPer90 !== null && form.expectedMinutes !== null) {
			base = form.pointsPer90;
			source = "components";
			level = form.weeksUsed >= 5 ? "high" : "medium";
			notes.push(`Componentes de ${form.weeksUsed} jornada(s) con decaimiento exponencial.`);
			if (form.per90FromShortMatches) notes.push("Medias por 90' calculadas con partidos de menos de 60 minutos.");
		}
	}
	if (base === null) {
		const averagePoints = Number(player.averagePoints) || 0;
		if (averagePoints > 0) {
			base = averagePoints;
			source = "season-average";
			level = "medium";
			notes.push("Sin stats por jornada: media de la temporada en curso.");
		}
	}
	if (base === null) {
		const lastSeasonPoints = Number(player.lastSeasonPoints) || 0;
		if (lastSeasonPoints > 0) {
			base = lastSeasonPoints / 38;
			source = "last-season";
			level = "low";
			notes.push("Sin datos de la temporada en curso: temporada pasada (asume 38 partidos jugados).");
		}
	}
	if (base === null) {
		const { prior, note } = priorForPlayer(player, {
			byPositionTier: context?.shrinkagePriors ?? /* @__PURE__ */ new Map(),
			teamTiers: context?.teamTiers,
			positionAverages: context?.positionAverages
		});
		base = prior;
		notes.push(`Sin histórico del jugador: ${note}.`);
	}
	const minutesEst = estimateMinutes({
		player,
		historicalMinutes: expectedMinutes,
		probableLineups: context?.probableLineups,
		injuries: context?.injuryReport,
		confirmedLineups: context?.confirmedLineups,
		teamId
	});
	let pStarter = null;
	if (minutesEst) {
		pStarter = minutesEst.pStarter;
		expectedMinutes = minutesEst.expectedMinutes;
		if (minutesEst.source !== "historical" && minutesEst.note) notes.push(minutesEst.note);
	}
	if (expectedMinutes !== null) base *= Math.min(1, expectedMinutes / 90);
	const params = getEngineParams();
	const shrinkageK = context?.paramOverrides?.shrinkageK ?? params.shrinkageK;
	if (source === "components" && context?.shrinkagePriors) {
		const { prior, note } = priorForPlayer(player, {
			byPositionTier: context.shrinkagePriors,
			teamTiers: context.teamTiers,
			positionAverages: context.positionAverages
		});
		const shrunk = partialPool(base, weeksUsed, prior, shrinkageK);
		if (Math.abs(shrunk - base) > .01) notes.push(`Shrinkage hacia ${note} (n=${weeksUsed}, k=${shrinkageK}).`);
		base = shrunk;
	}
	const opponentId = homeMatch ? homeMatch.visitorId : awayMatch ? awayMatch.localId : void 0;
	const eloOwn = teamId !== void 0 ? context?.teamElos?.get(teamId) : void 0;
	const eloOpponent = opponentId !== void 0 ? context?.teamElos?.get(opponentId) : void 0;
	if (eloOwn !== void 0 && eloOpponent !== void 0) {
		base *= fixtureMultiplierFromElo(eloOwn, eloOpponent, Boolean(homeMatch), context?.paramOverrides?.eloDiffDivisor);
		notes.push("Fixture: Elo ClubElo.");
	} else {
		if (homeMatch) base *= HOME_MULTIPLIER;
		else if (awayMatch) base *= AWAY_MULTIPLIER;
		if (opponentId !== void 0 && context?.teamStrength) base *= context.teamStrength.get(opponentId) ?? 1;
		notes.push("Fixture: proxy por valor de mercado (sin Elo).");
	}
	if (player.playerStatus !== "ok") base *= BAD_STATUS_MULTIPLIER;
	const starterScore = context?.starterInfo?.[player.id]?.score;
	if (starterScore !== void 0) base *= .9 + .1 * starterScore;
	const evidence = categoryEvidence(context?.externalSignals?.[player.id] || []);
	if (evidence.hardNegative >= BAD_NEWS_CONFIDENCE) base *= BAD_NEWS_MULTIPLIER;
	else if (evidence.doubt >= .5) base *= .7;
	else if (evidence.rotation >= .5) base *= .85;
	if (evidence.hardNegative < BAD_NEWS_CONFIDENCE && evidence.positive >= GOOD_NEWS_CONFIDENCE) base *= GOOD_NEWS_MULTIPLIER;
	if (context?.newsCoverage && context.newsCoverage.feedsOk === 0 && context.newsCoverage.feedsTotal > 0) notes.push("Sin cobertura de noticias: todos los feeds han fallado.");
	const xp = Math.max(0, base);
	const riskLambda = context?.paramOverrides?.riskLambda ?? params.riskLambda;
	return {
		xp,
		riskAdjustedXp: pointsStdDev !== null ? Math.max(0, xp - riskLambda * pointsStdDev) : xp,
		expectedMinutes,
		pStarter,
		pointsStdDev,
		source,
		dataQuality: {
			level,
			notes
		}
	};
}
/** teamId del jugador sea cual sea la forma de la respuesta de la API. */
function resolveTeamId(player) {
	const direct = Number(player.teamId);
	if (Number.isFinite(direct) && direct > 0) return direct;
	const fromTeam = Number(player.team?.id);
	if (Number.isFinite(fromTeam) && fromTeam > 0) return fromTeam;
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
/**
* Estima los puntos de un jugador para la próxima jornada con el modelo por
* componentes (`src/lib/engine/model.ts`): forma reciente con decaimiento
* desde `playerStats` cuando existe, con fallback a media de temporada,
* temporada pasada o media del catálogo por posición.
*/
function estimatePoints(player, matches, context) {
	return predictPlayerPoints(player, matches, context).xp;
}
/** Igual que estimatePoints pero devolviendo fuente, minutos y dataQuality. */
function estimatePointsDetailed(player, matches, context) {
	return predictPlayerPoints(player, matches, context);
}
/**
* Estimador ANTERIOR al motor por componentes, conservado tal cual como
* baseline del track record (§6.2: "media simple de puntos ≈ el motor
* actual"). No usar en lógica de negocio nueva.
*
* Defectos conocidos (§2.3 del diseño): asume 38 partidos la temporada pasada,
* pondera la posición sobre medias que ya la reflejan, no detecta jornadas de
* descanso y da base plana de 2 puntos a jugadores sin datos.
*/
function estimatePointsLegacy(player, matches, context) {
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
	return base;
}
/**
* Fuerza de cada equipo real de LaLiga a partir del valor de mercado agregado
* de sus jugadores del catálogo, normalizada a un multiplicador de dificultad
* (rival fuerte < 1, rival débil > 1).
*/
function buildTeamStrength(allPlayers) {
	const totalByTeam = /* @__PURE__ */ new Map();
	for (const p of allPlayers) {
		const teamId = Number(p.teamId);
		if (!Number.isFinite(teamId) || teamId <= 0) continue;
		totalByTeam.set(teamId, (totalByTeam.get(teamId) || 0) + (Number(p.marketValue) || 0));
	}
	const totals = [...totalByTeam.values()];
	const avg = totals.reduce((sum, v) => sum + v, 0) / Math.max(totals.length, 1);
	const strength = /* @__PURE__ */ new Map();
	for (const [teamId, total] of totalByTeam) {
		const ratio = total / Math.max(avg, 1);
		strength.set(teamId, clamp(1 - (ratio - 1) * .16, .92, 1.08));
	}
	return strength;
}
/**
* Media de puntos por partido del catálogo por posición. Último fallback del
* estimador para jugadores sin ningún histórico (sustituye a la base plana de
* 2 puntos del motor anterior).
*/
function buildPositionAverages(allPlayers) {
	const sum = /* @__PURE__ */ new Map();
	const count = /* @__PURE__ */ new Map();
	for (const p of allPlayers) {
		const perGame = (Number(p.averagePoints) || 0) > 0 ? Number(p.averagePoints) : (Number(p.lastSeasonPoints) || 0) / 38;
		const positionId = Number(p.positionId);
		if (perGame <= 0 || !Number.isFinite(positionId) || positionId <= 0) continue;
		sum.set(positionId, (sum.get(positionId) || 0) + perGame);
		count.set(positionId, (count.get(positionId) || 0) + 1);
	}
	const averages = /* @__PURE__ */ new Map();
	for (const [positionId, total] of sum) averages.set(positionId, total / Math.max(count.get(positionId) || 0, 1));
	return averages;
}
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
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
var cache = /* @__PURE__ */ new Map();
async function fetchFormations(token, option) {
	const cached = cache.get(option);
	if (cached && cached.expiresAt > Date.now()) return cached.formations;
	const formations = await fetchOfficialAPI("/v4/teams/lineup/formations", token, { option });
	if (Array.isArray(formations) && formations.length > 0) {
		cache.set(option, {
			expiresAt: Date.now() + CACHE_TTL_MS,
			formations
		});
		return formations;
	}
	return [];
}
/**
* Formaciones gratuitas disponibles para la alineación ("defensas,cents,dels").
* Se cachean 24 h; si el endpoint falla se usa la lista estándar.
*/
async function fetchFreeFormations(token) {
	try {
		const formations = await fetchFormations(token, "free");
		if (formations.length > 0) return formations;
	} catch (error) {
		console.warn("[formations] fetch failed:", error instanceof Error ? error.message : error);
	}
	return FALLBACK_FORMATIONS;
}
/**
* Formaciones disponibles según la configuración de la liga: gratuitas y, si
* la liga tiene activada la feature premium de formaciones, también las
* premium. Si el endpoint falla se usa la lista estándar gratuita.
*/
async function fetchAvailableFormations(token, includePremium) {
	const free = await fetchFreeFormations(token);
	if (!includePremium) return free;
	try {
		const premium = await fetchFormations(token, "premium");
		return [.../* @__PURE__ */ new Set([...free, ...premium])];
	} catch (error) {
		console.warn("[formations] premium fetch failed:", error instanceof Error ? error.message : error);
		return free;
	}
}
//#endregion
//#region src/lib/engine/sources/clubelo.ts
/**
* Adaptador ClubElo (§3.3, riesgo bajo): CSV sin auth con el rating Elo de
* cada club a fecha de hoy. TTL 24 h. Si la fuente cae se sirve la última
* caché (stale) y se anota en dataQuality.
*/
var TTL_MS$1 = 864e5;
function eloCsvUrl() {
	return `http://api.clubelo.com/${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}`;
}
async function fetchTeamElos(officialTeams) {
	const fetched = await fetchTextWithCache("clubelo-ranking", eloCsvUrl(), TTL_MS$1);
	if (!fetched) return null;
	const matchTeam = buildTeamMatcher(officialTeams);
	const eloByTeamId = /* @__PURE__ */ new Map();
	const unmatched = [];
	const lines = fetched.text.split("\n").slice(1);
	for (const line of lines) {
		const parts = line.split(",");
		if (parts.length < 5) continue;
		const sourceName = parts[1].trim();
		const elo = Number(parts[4]);
		if (!sourceName || !Number.isFinite(elo)) continue;
		const teamId = matchTeam(sourceName);
		if (teamId !== null) eloByTeamId.set(teamId, elo);
		else if (parts[2] === "ESP") unmatched.push(sourceName);
	}
	if (unmatched.length > 0) console.warn("[clubelo] equipos ESP sin cruzar:", unmatched.join(", "));
	if (eloByTeamId.size === 0) return null;
	return {
		eloByTeamId,
		unmatched,
		origin: fetched.origin
	};
}
//#endregion
//#region src/lib/engine/sources/jornadaperfecta.ts
/**
* Adaptador Jornada Perfecta (§3.2, riesgo bajo-medio): onces probables por
* partido y bajas/dudas de la jornada. Es la fuente principal de probabilidad
* de titularidad (§4.4).
*
* Estructura verificada (agosto 2026): el índice /onces-posibles/ enlaza las
* páginas de partido de la jornada actual (`match-link current-round-content`
* → /partido/{id}/{local}-{visitante}); cada página tiene dos bloques
* `campo-futbol` (local y visitante) con 11 jugadores (slug, probabilidad en
* `percent-budget`, alternativas "Nombre 40%") y una sección `#unavailable`
* con las bajas (slug, estado, nota de vuelta).
*
* TTL 3 h (los onces cambian conforme se acerca el partido). ~11 peticiones
* por refresco como máximo.
*/
var BASE_URL = "https://www.jornadaperfecta.com";
var TTL_MS = 108e5;
function extractMatchLinks(indexHtml) {
	const links = [];
	const seen = /* @__PURE__ */ new Set();
	for (const m of indexHtml.matchAll(/match-link current-round-content[^>]*href="(https:\/\/www\.jornadaperfecta\.com\/partido\/(\d+)\/([^"]+))"/g)) {
		if (seen.has(m[2])) continue;
		seen.add(m[2]);
		links.push({
			url: m[1],
			slug: m[3]
		});
	}
	return links;
}
function parsePlayers(block) {
	const players = [];
	for (const m of block.matchAll(/<a class='player[^']*'[^>]*href='https:\/\/www\.jornadaperfecta\.com\/jugador\/([^']+)'[^>]*>[\s\S]*?alt='([^']+)'[^>]*\/>(?:<div class='percent-budget'>(\d+)<\/div>)?/g)) players.push({
		slug: m[1],
		name: m[2].trim(),
		probability: m[3] ? Number(m[3]) : 100
	});
	return players;
}
function parseAlternatives(block) {
	const alternatives = [];
	for (const m of block.matchAll(/<div class='alternative'><span>([^<]+)<\/span><\/div>/g)) {
		const text = m[1].trim();
		const pctMatch = /(\d+)\s*%?\s*$/.exec(text);
		const probability = pctMatch ? Number(pctMatch[1]) : 50;
		const name = pctMatch ? text.slice(0, pctMatch.index).trim() : text;
		alternatives.push({
			slug: "",
			name,
			probability
		});
	}
	return alternatives;
}
function parseStatus(text) {
	const t = text.toLowerCase();
	if (t.includes("lesionado")) return "injured";
	if (t.includes("sancionado")) return "suspended";
	if (t.includes("duda")) return "doubt";
	return "other";
}
function parseMatchPage(html) {
	let homeName = /<div style="display:none" itemprop="homeTeam"><meta itemprop="name" content="([^"]+)"/.exec(html)?.[1];
	let awayName = /<div style="display:none" itemprop="awayTeam"><meta itemprop="name" content="([^"]+)"/.exec(html)?.[1];
	if (!homeName || !awayName) {
		const title = /<title>([^<]+)<\/title>/.exec(html)?.[1];
		const names = title ? /^(.+?)\s+-\s+(.+?)\s*\|/.exec(title) : null;
		if (names) {
			homeName = homeName ?? names[1].trim();
			awayName = awayName ?? names[2].trim();
		}
	}
	const dateMatch = /<time itemprop="startDate" content="([^"]+)"/.exec(html);
	const blocks = [...html.matchAll(/campo-futbol/g)].map((m) => m.index);
	const lineups = [];
	for (let i = 0; i < blocks.length; i++) {
		const start = blocks[i];
		const end = i + 1 < blocks.length ? blocks[i + 1] : html.indexOf("id=\"unavailable\"", start);
		const block = html.slice(start, end > start ? end : start + 2e4);
		const teamMatch = /escudo-equipo-alineacion[^>]*>\s*<img[^>]*title='([^']+)'/.exec(block);
		if (!teamMatch) continue;
		lineups.push({
			sourceTeamName: teamMatch[1],
			starters: parsePlayers(block),
			alternatives: parseAlternatives(block)
		});
	}
	if (lineups.length === 0) return null;
	homeName = homeName ?? lineups[0].sourceTeamName;
	awayName = awayName ?? lineups[1]?.sourceTeamName ?? homeName;
	const injuries = [];
	const unavailableIdx = html.indexOf("id=\"unavailable\"");
	if (unavailableIdx >= 0) {
		const section = html.slice(unavailableIdx, unavailableIdx + 15e3);
		for (const m of section.matchAll(/<a href="https:\/\/www\.jornadaperfecta\.com\/jugador\/([^/"]+)\/?" class="column center fifa-card">[\s\S]*?<span class="bold font-size-12 name" title="[^"]*">([^<]+)<\/span>[\s\S]*?<span class="capitalize text text-center"[^>]*>([^<]+)<\/span>[\s\S]*?<span class=" text text-center"[^>]*>([^<]*)<\/span>/g)) injuries.push({
			slug: m[1],
			name: m[2].trim(),
			status: parseStatus(m[3]),
			note: m[4].trim() || void 0
		});
	}
	return {
		match: {
			homeSourceName: homeName,
			awaySourceName: awayName,
			matchDate: dateMatch?.[1],
			lineups
		},
		injuries
	};
}
/**
* Descarga los onces probables y las bajas de la jornada actual.
* `officialTeams` sirve para anotar qué equipos no cruzan (dataQuality).
*/
async function fetchProbableLineups(officialTeams) {
	const index = await fetchTextWithCache("jp-onces-index", `${BASE_URL}/onces-posibles/`, TTL_MS);
	if (!index) return null;
	const links = extractMatchLinks(index.text);
	if (links.length === 0) {
		console.warn("[jornadaperfecta] índice sin partidos de la jornada actual");
		return null;
	}
	const matchTeam = buildTeamMatcher(officialTeams);
	const matches = [];
	const injuries = [];
	const unmatched = /* @__PURE__ */ new Set();
	let origin = index.origin;
	for (const link of links) {
		const page = await fetchTextWithCache(`jp-partido-${link.slug}`, link.url, TTL_MS);
		if (!page) continue;
		if (page.origin === "stale") origin = "stale";
		else if (page.origin === "network" && origin === "cache") origin = "network";
		const parsed = parseMatchPage(page.text);
		if (!parsed) {
			console.warn(`[jornadaperfecta] página de partido sin estructura esperada: ${link.slug}`);
			continue;
		}
		for (const name of [parsed.match.homeSourceName, parsed.match.awaySourceName]) if (matchTeam(name) === null) unmatched.add(name);
		matches.push(parsed.match);
		injuries.push(...parsed.injuries);
	}
	if (unmatched.size > 0) console.warn("[jornadaperfecta] equipos sin cruzar:", [...unmatched].join(", "));
	return {
		matches,
		injuries,
		unmatchedTeams: [...unmatched],
		origin: matches.length > 0 ? origin : "stale"
	};
}
//#endregion
export { loadEngineParams as _, buildTeamStrength as a, fetchExternalSignals as b, estimatePointsLegacy as c, buildShrinkagePriors as d, buildTeamTiers as f, getEngineParams as g, DEFAULT_ENGINE_PARAMS as h, buildPositionAverages as i, predictPlayerPoints as l, normalizePlayerName as m, fetchTeamElos as n, estimatePoints as o, isSuspended as p, fetchAvailableFormations as r, estimatePointsDetailed as s, fetchProbableLineups as t, resolveTeamId as u, saveEngineParams as v, combinedSignal as y };
