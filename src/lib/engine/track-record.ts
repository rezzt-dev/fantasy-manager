import { appendFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { XI_PER_DAY } from './form';
import type { PlayerWeekStat } from './player-stats';

/**
 * Track record del motor (§6.1 del diseño): persiste CADA predicción y CADA
 * recomendación con su contexto y versión de modelo, y tras la jornada las
 * liquida con los puntos reales de `playerStats[].totalPoints` (verdad
 * absoluta vía API oficial). Sin esto ninguna mejora es demostrable.
 *
 * Almacenamiento: JSONL en data/track-record (una línea por registro y un
 * fichero por jornada y tipo). Elegido frente a SQLite por no añadir ninguna
 * dependencia, ser append-only, legible y suficiente a este volumen (~decenas
 * de registros por jornada).
 *
 * La primera predicción de la jornada es la que cuenta: si un jugador ya está
 * persistido para esa jornada no se sobrescribe (honestidad walk-forward).
 */

/** Versión del modelo: v1.2 añade shrinkage jerárquico, xP−λσ, capitán co-optimizado y noticias por categorías. */
export const MODEL_VERSION = 'components-v1.2';

const TRACK_RECORD_DIR = path.join(process.cwd(), 'data', 'track-record');

export interface PredictionRecord {
  playerId: string;
  week: number;
  leagueId: string;
  recordedAt: string;
  modelVersion: string;
  /** Predicción del modelo actual. */
  xp: number;
  /** Predicción del estimador anterior (baseline, §6.2). */
  xpLegacy: number;
  expectedMinutes: number | null;
  /** Probabilidad de titularidad (submodelo xMins). */
  pStarter?: number | null;
  /** Fuente de la predicción (components, season-average, last-season...). */
  source: string;
  dataQuality: 'high' | 'medium' | 'low';
  context: {
    positionId: number;
    teamId?: number;
    opponentTeamId?: number;
    isHome?: boolean;
  };
  actualPoints: number | null;
  settledAt: string | null;
  /** true si el jugador quedó en el once ideal de esa jornada (se rellena al liquidar). */
  idealXi?: boolean | null;
}

/** Once recomendado persistido (§6.1): base del top-11 hit rate y del valor del optimizador. */
export interface LineupRecord {
  week: number;
  leagueId: string;
  teamId: number;
  recordedAt: string;
  modelVersion: string;
  formation: string;
  starters: { playerId: string; xp: number }[];
  captainId?: string;
  source: 'recommended';
}

/** Recomendación persistida (§6.1): base de Precision@k y ROI de fichajes. */
export interface RecommendationRecord {
  playerId: string;
  week: number;
  leagueId: string;
  teamId: number;
  recordedAt: string;
  modelVersion: string;
  type: string;
  /** Impacto homogéneo de la acción, en puntos esperados (ΔxP). */
  deltaXp: number;
  price?: number;
  actualPoints: number | null;
  settledAt: string | null;
}

export interface SettleSummary {
  weeksSettled: number[];
  recordsSettled: number;
  recordsPending: number;
}

function predictionsFile(week: number): string {
  return path.join(TRACK_RECORD_DIR, `predictions-w${week}.jsonl`);
}

function recommendationsFile(week: number): string {
  return path.join(TRACK_RECORD_DIR, `recommendations-w${week}.jsonl`);
}

async function readJsonl<T>(file: string): Promise<T[]> {
  try {
    const raw = await readFile(file, 'utf8');
    return raw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as T);
  } catch {
    return [];
  }
}

async function appendJsonl<T>(file: string, records: T[]): Promise<void> {
  if (records.length === 0) return;
  await mkdir(TRACK_RECORD_DIR, { recursive: true });
  const body = records.map((r) => JSON.stringify(r)).join('\n') + '\n';
  await appendFile(file, body);
}

/**
 * Persiste las predicciones de una jornada. Devuelve cuántas se añadieron y
 * cuántas se saltaron por existir ya (mismo jugador y jornada).
 */
export async function persistPredictions(
  week: number,
  records: PredictionRecord[],
): Promise<{ appended: number; skipped: number }> {
  const file = predictionsFile(week);
  const existing = await readJsonl<PredictionRecord>(file);
  const known = new Set(existing.map((r) => r.playerId));
  const fresh = records.filter((r) => !known.has(r.playerId));
  await appendJsonl(file, fresh);
  return { appended: fresh.length, skipped: records.length - fresh.length };
}

/**
 * Persiste las recomendaciones de una jornada (dedup por tipo + jugador).
 */
export async function persistRecommendations(
  week: number,
  records: RecommendationRecord[],
): Promise<{ appended: number; skipped: number }> {
  const file = recommendationsFile(week);
  const existing = await readJsonl<RecommendationRecord>(file);
  const known = new Set(existing.map((r) => `${r.type}:${r.playerId}`));
  const fresh = records.filter((r) => !known.has(`${r.type}:${r.playerId}`));
  await appendJsonl(file, fresh);
  return { appended: fresh.length, skipped: records.length - fresh.length };
}

/**
 * Liquida las jornadas ya cerradas: rellena `actualPoints` (y `idealXi` en las
 * predicciones) de los registros pendientes usando los datos reales por
 * jornada. `resolveOutcome` devuelve puntos y flag de once ideal de un
 * jugador en una jornada (o null si no hay dato todavía).
 */
export async function settleTrackRecord(
  currentWeek: number,
  resolveOutcome: (playerId: string, week: number) => Promise<{ points: number; idealXi: boolean } | null>,
): Promise<SettleSummary> {
  const summary: SettleSummary = { weeksSettled: [], recordsSettled: 0, recordsPending: 0 };

  let files: string[] = [];
  try {
    files = await readdir(TRACK_RECORD_DIR);
  } catch {
    return summary; // sin directorio todavía: nada que liquidar
  }

  for (const fileName of files) {
    const match = /^(predictions|recommendations)-w(\d+)\.jsonl$/.exec(fileName);
    if (!match) continue;
    const week = Number(match[2]);
    if (!(week < currentWeek)) continue;

    const file = path.join(TRACK_RECORD_DIR, fileName);
    const records = await readJsonl<PredictionRecord | RecommendationRecord>(file);
    let touched = false;

    for (const record of records) {
      if (record.actualPoints !== null) continue;
      const outcome = await resolveOutcome(record.playerId, week);
      if (outcome === null) {
        summary.recordsPending += 1;
        continue;
      }
      record.actualPoints = outcome.points;
      if ('idealXi' in record || match[1] === 'predictions') {
        (record as PredictionRecord).idealXi = outcome.idealXi;
      }
      record.settledAt = new Date().toISOString();
      summary.recordsSettled += 1;
      touched = true;
    }

    if (touched) {
      await writeFile(file, records.map((r) => JSON.stringify(r)).join('\n') + '\n');
    }
    if (!summary.weeksSettled.includes(week)) summary.weeksSettled.push(week);
  }

  summary.weeksSettled.sort((a, b) => a - b);
  return summary;
}

export interface WalkForwardMetrics {
  samples: number;
  maeLegacy: number | null;
  maeV1: number | null;
  /** Jornadas evaluadas. */
  weeks: number[];
  note: string;
}

/**
 * Evaluación walk-forward (§6.2): para cada jornada W con al menos 2 jornadas
 * previas de datos, predice solo con información anterior a W y compara con
 * los puntos reales de W.
 *
 * - Baseline "motor viejo": media simple de los totalPoints previos (§6.2(a)).
 * - Motor nuevo v1: media de los totalPoints previos con decaimiento
 *   exponencial (la forma del modelo por componentes, sin factores de fixture:
 *   ambas predicciones los omiten para que la comparación sea limpia).
 */
export function evaluateWalkForward(
  statsByPlayer: Record<string, PlayerWeekStat[]>,
): WalkForwardMetrics {
  const errorsLegacy: number[] = [];
  const errorsV1: number[] = [];
  const weeksEvaluated = new Set<number>();

  for (const stats of Object.values(statsByPlayer)) {
    const sorted = [...stats]
      .filter((s) => Number.isFinite(s.weekNumber) && typeof s.totalPoints === 'number')
      .sort((a, b) => a.weekNumber - b.weekNumber);

    for (let i = 2; i < sorted.length; i++) {
      const prior = sorted.slice(0, i);
      const target = sorted[i];
      const actual = target.totalPoints!;

      const predLegacy = prior.reduce((sum, s) => sum + (s.totalPoints ?? 0), 0) / prior.length;
      const weights = prior.map((s) => Math.exp(-XI_PER_DAY * 7 * Math.max(0, target.weekNumber - s.weekNumber)));
      const weightSum = weights.reduce((sum, w) => sum + w, 0);
      const predV1 = prior.reduce((sum, s, j) => sum + (s.totalPoints ?? 0) * weights[j], 0) / weightSum;

      errorsLegacy.push(Math.abs(predLegacy - actual));
      errorsV1.push(Math.abs(predV1 - actual));
      weeksEvaluated.add(target.weekNumber);
    }
  }

  const mae = (errors: number[]) =>
    errors.length > 0 ? Math.round((errors.reduce((sum, e) => sum + e, 0) / errors.length) * 100) / 100 : null;

  return {
    samples: errorsLegacy.length,
    maeLegacy: mae(errorsLegacy),
    maeV1: mae(errorsV1),
    weeks: [...weeksEvaluated].sort((a, b) => a - b),
    note:
      errorsLegacy.length === 0
        ? 'Sin puntos reales todavía (pretemporada): las métricas se calcularán en cuanto haya jornadas liquidadas.'
        : 'Baseline = media simple; v1 = media con decaimiento. Sin factores de fixture en ninguna de las dos.',
  };
}

export interface TrackRecordMetrics {
  /** Predicciones liquidadas (con puntos reales). */
  settled: number;
  maeXp: number | null;
  maeLegacy: number | null;
}

/**
 * MAE del modelo actual frente al baseline sobre las predicciones YA
 * liquidadas del track record (§6.1-6.3). Es la métrica que demuestra la
 * mejora: mismas jornadas, mismos jugadores, puntos reales de la API.
 */
export async function evaluateTrackRecord(currentWeek: number): Promise<TrackRecordMetrics> {
  const errorsXp: number[] = [];
  const errorsLegacy: number[] = [];

  let files: string[] = [];
  try {
    files = await readdir(TRACK_RECORD_DIR);
  } catch {
    return { settled: 0, maeXp: null, maeLegacy: null };
  }

  for (const fileName of files) {
    const match = /^predictions-w(\d+)\.jsonl$/.exec(fileName);
    if (!match || Number(match[1]) >= currentWeek) continue;
    const records = await readJsonl<PredictionRecord>(path.join(TRACK_RECORD_DIR, fileName));
    for (const record of records) {
      if (record.actualPoints === null) continue;
      errorsXp.push(Math.abs(record.xp - record.actualPoints));
      errorsLegacy.push(Math.abs(record.xpLegacy - record.actualPoints));
    }
  }

  const mae = (errors: number[]) =>
    errors.length > 0 ? Math.round((errors.reduce((sum, e) => sum + e, 0) / errors.length) * 100) / 100 : null;

  return { settled: errorsXp.length, maeXp: mae(errorsXp), maeLegacy: mae(errorsLegacy) };
}

/** Persiste el último informe de métricas para consulta externa. */
export async function persistMetrics(
  metrics: WalkForwardMetrics & { leagueId: string; week: number; trackRecord?: TrackRecordMetrics },
): Promise<void> {
  await mkdir(TRACK_RECORD_DIR, { recursive: true });
  const file = path.join(TRACK_RECORD_DIR, 'metrics-latest.json');
  await writeFile(file, JSON.stringify({ computedAt: new Date().toISOString(), ...metrics }, null, 2));
}

/** Persiste la tabla de puntuación derivada de playerStats (§4.2). */
export async function persistScoringTable(table: unknown): Promise<void> {
  await mkdir(TRACK_RECORD_DIR, { recursive: true });
  const file = path.join(TRACK_RECORD_DIR, 'scoring-table.json');
  await writeFile(file, JSON.stringify(table, null, 2));
}

function lineupsFile(week: number): string {
  return path.join(TRACK_RECORD_DIR, `lineups-w${week}.jsonl`);
}

/** Persiste el once recomendado de una jornada (primera escritura gana). */
export async function persistLineup(record: LineupRecord): Promise<boolean> {
  const file = lineupsFile(record.week);
  const existing = await readJsonl<LineupRecord>(file);
  if (existing.some((r) => r.leagueId === record.leagueId && r.teamId === record.teamId)) return false;
  await appendJsonl(file, [record]);
  return true;
}

// ---------------------------------------------------------------------------
// Resumen del track record con las métricas del §6.3 del diseño.
// ---------------------------------------------------------------------------

export interface WeekSummary {
  week: number;
  predictions: number;
  settled: number;
  maeXp: number | null;
  maeLegacy: number | null;
  spearmanXp: number | null;
  top11HitRate: number | null;
  captainPoints: number | null;
}

export interface TrackRecordTotals {
  predictions: number;
  settled: number;
  maeXp: number | null;
  maeLegacy: number | null;
  spearmanXp: number | null;
  top11HitRate: number | null;
  captainPointsAvg: number | null;
  /** % de las 5 mejores compras que cumplieron su xP (aprox. a Precision@5). */
  buyPrecision5: number | null;
  /** Puntos reales por M€ gastado en compras liquidadas. */
  buyRoiPerMillion: number | null;
}

export interface TrackRecordSummary {
  weeks: WeekSummary[];
  totals: TrackRecordTotals;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100;
}

/** Correlación de Spearman entre dos series (null si no computable). */
function spearman(xs: number[], ys: number[]): number | null {
  if (xs.length < 3) return null;
  const ranksOf = (arr: number[]): number[] => {
    const indexed = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array<number>(arr.length);
    indexed.forEach(({ i }, rank) => (ranks[i] = rank));
    return ranks;
  };
  const rx = ranksOf(xs);
  const ry = ranksOf(ys);
  const n = xs.length;
  const mx = rx.reduce((s, v) => s + v, 0) / n;
  const my = ry.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = rx[i] - mx;
    const b = ry[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return null;
  return Math.round((num / Math.sqrt(dx * dy)) * 100) / 100;
}

/**
 * Lee todos los ficheros del track record y resume las métricas §6.3 por
 * jornada y en total. Solo jornadas cerradas (< currentWeek); lo no
 * computable todavía queda en null (nunca se presenta como "todo OK").
 */
export async function summarizeTrackRecord(currentWeek: number, leagueId?: string): Promise<TrackRecordSummary> {
  const summary: TrackRecordSummary = {
    weeks: [],
    totals: {
      predictions: 0,
      settled: 0,
      maeXp: null,
      maeLegacy: null,
      spearmanXp: null,
      top11HitRate: null,
      captainPointsAvg: null,
      buyPrecision5: null,
      buyRoiPerMillion: null,
    },
  };

  let files: string[] = [];
  try {
    files = await readdir(TRACK_RECORD_DIR);
  } catch {
    return summary;
  }

  const weeks = new Set<number>();
  for (const fileName of files) {
    const m = /^(predictions|recommendations|lineups)-w(\d+)\.jsonl$/.exec(fileName);
    if (m) weeks.add(Number(m[2]));
  }

  const allErrorsXp: number[] = [];
  const allErrorsLegacy: number[] = [];
  const allXp: number[] = [];
  const allActual: number[] = [];
  const top11Rates: number[] = [];
  const captainPoints: number[] = [];
  const buyDelivered: boolean[] = [];
  const buyRoi: number[] = [];

  for (const week of [...weeks].sort((a, b) => a - b)) {
    // La jornada en curso también se muestra (con settled=0 y métricas null).

    const predictions = (await readJsonl<PredictionRecord>(predictionsFile(week))).filter(
      (r) => !leagueId || r.leagueId === leagueId,
    );
    const recommendations = (await readJsonl<RecommendationRecord>(recommendationsFile(week))).filter(
      (r) => !leagueId || r.leagueId === leagueId,
    );
    const lineups = (await readJsonl<LineupRecord>(lineupsFile(week))).filter((r) => !leagueId || r.leagueId === leagueId);

    const settled = predictions.filter((r) => r.actualPoints !== null);
    const weekSummary: WeekSummary = {
      week,
      predictions: predictions.length,
      settled: settled.length,
      maeXp: mean(settled.map((r) => Math.abs(r.xp - r.actualPoints!))),
      maeLegacy: mean(settled.map((r) => Math.abs(r.xpLegacy - r.actualPoints!))),
      spearmanXp: spearman(
        settled.map((r) => r.xp),
        settled.map((r) => r.actualPoints!),
      ),
      top11HitRate: null,
      captainPoints: null,
    };

    allErrorsXp.push(...settled.map((r) => Math.abs(r.xp - r.actualPoints!)));
    allErrorsLegacy.push(...settled.map((r) => Math.abs(r.xpLegacy - r.actualPoints!)));
    allXp.push(...settled.map((r) => r.xp));
    allActual.push(...settled.map((r) => r.actualPoints!));

    // Top-11 hit rate: titulares del once recomendado que quedaron en el ideal.
    const idealByPlayer = new Map(settled.map((r) => [r.playerId, r.idealXi === true]));
    for (const lineup of lineups) {
      if (lineup.starters.length === 0) continue;
      const hits = lineup.starters.filter((s) => idealByPlayer.get(s.playerId)).length;
      const rate = hits / lineup.starters.length;
      top11Rates.push(rate);
      weekSummary.top11HitRate = Math.round(rate * 100) / 100;
      // Puntos del capitán persistido en el once.
      if (lineup.captainId) {
        const captainActual = settled.find((r) => r.playerId === lineup.captainId)?.actualPoints;
        if (typeof captainActual === 'number') {
          captainPoints.push(captainActual);
          weekSummary.captainPoints = captainActual;
        }
      }
    }

    // Compras liquidadas: precisión y ROI.
    const settledBuys = recommendations
      .filter((r) => (r.type === 'buy' || r.type === 'buyout') && r.actualPoints !== null)
      .sort((a, b) => b.deltaXp - a.deltaXp)
      .slice(0, 5);
    for (const buy of settledBuys) {
      buyDelivered.push((buy.actualPoints ?? 0) >= buy.deltaXp);
      if (buy.price && buy.price > 0) buyRoi.push((buy.actualPoints ?? 0) / (buy.price / 1_000_000));
    }

    summary.weeks.push(weekSummary);
  }

  summary.totals = {
    predictions: summary.weeks.reduce((sum, w) => sum + w.predictions, 0),
    settled: summary.weeks.reduce((sum, w) => sum + w.settled, 0),
    maeXp: mean(allErrorsXp),
    maeLegacy: mean(allErrorsLegacy),
    spearmanXp: spearman(allXp, allActual),
    top11HitRate: mean(top11Rates),
    captainPointsAvg: mean(captainPoints),
    buyPrecision5: buyDelivered.length > 0 ? Math.round((buyDelivered.filter(Boolean).length / buyDelivered.length) * 100) / 100 : null,
    buyRoiPerMillion: mean(buyRoi),
  };

  return summary;
}
