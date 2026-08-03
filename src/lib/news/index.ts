import type { ExternalSignal } from '../../types/analysis';
import { getEnvOptional } from '../env';
import { classifyNewsAll, normalize } from './classifier';
import { matchNewsToPlayers, type NewsPlayer } from './matcher';
import { parseFeed, type NewsItem } from './rss';
import { resolveNewsFeeds } from './sources';

const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos
const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT = 'fantasy-manager/0.1 (+https://localhost)';

/**
 * Peso de cada fuente (priors iniciales; se calibrarán con el track record
 * de señales, §4.6). 20minutos es generalista: menor peso que la prensa
 * deportiva.
 */
const SOURCE_WEIGHTS: Record<string, number> = {
  Marca: 0.9,
  AS: 0.9,
  'Mundo Deportivo': 0.85,
  Sport: 0.85,
  '20minutos': 0.7,
};
const DEFAULT_SOURCE_WEIGHT = 0.75;

/** Decaimiento exponencial por antigüedad (τ = 3 días; a los 7 días ≈ 0.1). */
const DECAY_TAU_DAYS = 3;

/** Similitud mínima de titulares para considerar la misma historia en dos medios. */
const STORY_JACCARD = 0.6;

export interface NewsCoverage {
  feedsOk: string[];
  feedsFailed: string[];
  items: number;
}

export interface NewsSignalsResult {
  signals: Record<string, ExternalSignal[]>;
  coverage: NewsCoverage;
}

interface CachedNews {
  fetchedAt: number;
  itemsBySource: { source: string; item: NewsItem }[];
  feedsOk: string[];
  feedsFailed: string[];
}

let cache: CachedNews | null = null;
let inflight: Promise<CachedNews> | null = null;

function cacheTtlMs(): number {
  const fromEnv = Number(getEnvOptional('NEWS_CACHE_TTL_MS'));
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_CACHE_TTL_MS;
}

async function fetchAllFeeds(): Promise<CachedNews> {
  const feeds = resolveNewsFeeds();

  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const res = await fetch(feed.url, {
        headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*', 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      return parseFeed(xml).map((item) => ({ source: feed.name, item }));
    }),
  );

  const itemsBySource: CachedNews['itemsBySource'] = [];
  const feedsOk: string[] = [];
  const feedsFailed: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      itemsBySource.push(...result.value);
      feedsOk.push(feeds[i].name);
    } else {
      feedsFailed.push(feeds[i].name);
      console.warn(`[news] Feed "${feeds[i].name}" failed:`, result.reason?.message || result.reason);
    }
  }

  return { fetchedAt: Date.now(), itemsBySource, feedsOk, feedsFailed };
}

/** Devuelve las noticias cacheadas; solo descarga cuando expira el TTL. */
async function getNews(): Promise<CachedNews> {
  if (cache && Date.now() - cache.fetchedAt < cacheTtlMs()) return cache;
  if (inflight) return inflight;

  inflight = fetchAllFeeds()
    .then((fresh) => {
      // Si todos los feeds han fallado y hay caché anterior, la conservamos.
      if (fresh.itemsBySource.length === 0 && cache) return cache;
      cache = fresh;
      return fresh;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Peso por antigüedad: decaimiento exponencial dentro de la ventana (no binario). */
function ageWeight(publishedAt?: string): number {
  if (!publishedAt) return 1;
  const time = Date.parse(publishedAt);
  if (Number.isNaN(time)) return 1;
  const days = Math.max(0, (Date.now() - time) / (24 * 60 * 60 * 1000));
  return Math.exp(-days / DECAY_TAU_DAYS);
}

function sourceWeight(source: string): number {
  return SOURCE_WEIGHTS[source] ?? DEFAULT_SOURCE_WEIGHT;
}

const TITLE_STOPWORDS = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'en', 'y', 'a', 'al', 'con', 'por', 'para', 'un', 'una', 'su', 'sus', 'es', 'se']);

function titleTokens(title: string): Set<string> {
  return new Set(
    normalize(title)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 4 && !TITLE_STOPWORDS.has(t)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

interface ScoredSignal extends ExternalSignal {
  storyTokens: Set<string>;
}

/**
 * Deduplicación de la misma historia en varios medios (§4.6): titulares
 * similares (Jaccard ≥ 0.6) de la misma categoría cuentan una sola vez, la
 * de mayor confianza. Así la cobertura mediática no infla la confianza.
 */
function dedupeStories(signals: ScoredSignal[]): ScoredSignal[] {
  const kept: ScoredSignal[] = [];
  for (const signal of signals.sort((a, b) => b.confidence - a.confidence)) {
    const duplicate = kept.some(
      (other) => other.category === signal.category && jaccard(other.storyTokens, signal.storyTokens) >= STORY_JACCARD,
    );
    if (!duplicate) kept.push(signal);
  }
  return kept;
}

/**
 * Obtiene señales de noticias para los jugadores indicados, con cobertura
 * real de fuentes para propagar a dataQuality (ausencia de señal ≠ "todo OK").
 */
export async function fetchNewsSignals(players: NewsPlayer[]): Promise<NewsSignalsResult> {
  const news = await getNews();
  const coverage: NewsCoverage = { feedsOk: news.feedsOk, feedsFailed: news.feedsFailed, items: news.itemsBySource.length };
  if (news.itemsBySource.length === 0 || players.length === 0) return { signals: {}, coverage };

  const items = news.itemsBySource.map((x) => x.item);
  const matched = matchNewsToPlayers(players, items);

  const sourceByItem = new Map<NewsItem, string>();
  for (const { source, item } of news.itemsBySource) sourceByItem.set(item, source);

  const signals: Record<string, ExternalSignal[]> = {};

  for (const [playerId, playerItems] of Object.entries(matched)) {
    const scored: ScoredSignal[] = [];
    for (const item of playerItems) {
      const source = sourceByItem.get(item) || 'news';
      // Todas las categorías con evidencia del titular (no la primera que casa).
      const classifications = classifyNewsAll(`${item.title} ${item.description}`);
      for (const classification of classifications) {
        scored.push({
          source,
          signal: classification.signal,
          // Confianza ajustada por fuente y antigüedad (§4.6).
          confidence: Math.min(1, classification.confidence * sourceWeight(source) * ageWeight(item.publishedAt)),
          category: classification.category,
          reason: item.title,
          url: item.link || undefined,
          publishedAt: item.publishedAt,
          storyTokens: titleTokens(item.title),
        });
      }
    }

    const deduped = dedupeStories(scored);
    if (deduped.length > 0) {
      // Ordenar por confianza y limitar a las 3 más relevantes por jugador.
      signals[playerId] = deduped.slice(0, 3).map(({ storyTokens: _storyTokens, ...signal }) => signal);
    }
  }

  return { signals, coverage };
}
