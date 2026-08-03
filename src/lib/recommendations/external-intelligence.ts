import type { ExternalSignal } from '../../types/analysis';
import { getEnvOptional } from '../env';
import { fetchNewsSignals, type NewsCoverage } from '../news';

export interface SignalPlayer {
  id: string;
  name: string;
  nickname?: string;
  teamName?: string;
}

export interface ExternalSignalsResult {
  signals: Record<string, ExternalSignal[]>;
  coverage: NewsCoverage;
}

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
export async function fetchExternalSignals(players: SignalPlayer[]): Promise<ExternalSignalsResult> {
  const signals: Record<string, ExternalSignal[]> = {};
  let coverage: NewsCoverage = { feedsOk: [], feedsFailed: [], items: 0 };

  try {
    const news = await fetchNewsSignals(players);
    merge(signals, news.signals);
    coverage = news.coverage;
  } catch (error) {
    console.warn('[external-intelligence] news provider failed:', error);
  }

  const statsUrl = getEnvOptional('PLAYER_STATS_JSON_URL');
  if (statsUrl) {
    try {
      const statsSignals = await fetchStatsJSON(statsUrl, players.map((p) => p.id));
      merge(signals, statsSignals);
    } catch (error) {
      console.warn('[external-intelligence] PLAYER_STATS_JSON_URL failed:', error);
    }
  }

  return { signals, coverage };
}

async function fetchStatsJSON(url: string, playerIds: string[]): Promise<Record<string, ExternalSignal[]>> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return {};

  const data = await res.json();
  const signals: Record<string, ExternalSignal[]> = {};

  // Se espera un array de objetos { playerId, signal, confidence, reason }
  const entries = Array.isArray(data) ? data : data?.players || [];
  for (const entry of entries) {
    if (!entry.playerId || !playerIds.includes(String(entry.playerId))) continue;
    const signal: ExternalSignal = {
      source: entry.source || 'player-stats-json',
      signal: normalizeSignal(entry.signal),
      confidence: clamp(Number(entry.confidence) || 0.5, 0, 1),
      reason: String(entry.reason || 'Sin detalle'),
    };
    (signals[entry.playerId] ||= []).push(signal);
  }

  return signals;
}

function merge(target: Record<string, ExternalSignal[]>, source: Record<string, ExternalSignal[]>) {
  for (const [key, value] of Object.entries(source)) {
    (target[key] ||= []).push(...value);
  }
}

function normalizeSignal(signal: unknown): 'buy' | 'sell' | 'hold' {
  const s = String(signal).toLowerCase();
  if (s === 'buy' || s === 'comprar' || s === 'up') return 'buy';
  if (s === 'sell' || s === 'vender' || s === 'down') return 'sell';
  return 'hold';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function combinedSignal(signals: ExternalSignal[]): { signal: 'buy' | 'sell' | 'hold'; confidence: number } {
  if (signals.length === 0) return { signal: 'hold', confidence: 0 };

  let buyScore = 0;
  let sellScore = 0;
  for (const s of signals) {
    if (s.signal === 'buy') buyScore += s.confidence;
    else if (s.signal === 'sell') sellScore += s.confidence;
  }

  if (buyScore > sellScore) return { signal: 'buy', confidence: Math.min(1, buyScore) };
  if (sellScore > buyScore) return { signal: 'sell', confidence: Math.min(1, sellScore) };
  return { signal: 'hold', confidence: Math.max(0, buyScore + sellScore) };
}

/**
 * Evidencia por categorías sin aplanar (§4.6): la información de "duda al
 * 55%" frente a "lesión al 85%" se conserva hasta el modelo. Agregación
 * noisy-or por grupo: 1 − Π(1 − cᵢ) sobre las señales del grupo.
 */
export interface CategoryEvidence {
  /** Lesión, enfermedad o sanción (baja casi segura). */
  hardNegative: number;
  doubt: number;
  rotation: number;
  /** Vuelta de baja o gran momento de forma. */
  positive: number;
}

const HARD_NEGATIVE_CATEGORIES = ['injury', 'illness', 'suspension'];
const POSITIVE_CATEGORIES = ['return', 'form'];

function noisyOr(signals: ExternalSignal[], categories: string[]): number {
  let product = 1;
  for (const s of signals) {
    if (s.category && categories.includes(s.category)) {
      product *= 1 - s.confidence;
    }
  }
  return 1 - product;
}

export function categoryEvidence(signals: ExternalSignal[]): CategoryEvidence {
  return {
    hardNegative: noisyOr(signals, HARD_NEGATIVE_CATEGORIES),
    doubt: noisyOr(signals, ['doubt']),
    rotation: noisyOr(signals, ['rotation']),
    positive: noisyOr(signals, POSITIVE_CATEGORIES),
  };
}
