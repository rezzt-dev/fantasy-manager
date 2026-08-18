import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ScorePredictionsResponse, TeamScorePrediction } from '../../types/analysis';

/**
 * Persistencia de predicciones de puntuación por equipo de liga.
 *
 * - snapshot por jornada: `data/score-predictions/{leagueId}-w{week}.json`
 *   (sobrescrito con la última predicción, permite consultar el estado actual).
 * - histórico append-only: `data/score-predictions/history.jsonl`
 *   (una línea por equipo/jornada; deduplicado para conservar solo la última
 *   predicción de cada jornada).
 */

const SCORE_DIR = path.join(process.cwd(), 'data', 'score-predictions');

export interface ScoreHistoryRecord {
  leagueId: string;
  week: number;
  teamId: number;
  managerName: string;
  generatedAt: string;
  totalExpected: number;
  fieldExpected: number;
  captainBonus: number;
  coachPoints: number;
  benchExpected: number;
  dataQuality: 'high' | 'medium' | 'low';
  inferred: boolean;
  degraded: boolean;
}

function snapshotFile(leagueId: string, week: number): string {
  return path.join(SCORE_DIR, `${leagueId}-w${week}.json`);
}

const HISTORY_FILE = path.join(SCORE_DIR, 'history.jsonl');

export async function saveScorePredictions(
  leagueId: string,
  week: number,
  response: ScorePredictionsResponse,
): Promise<void> {
  await mkdir(SCORE_DIR, { recursive: true });
  await writeFile(snapshotFile(leagueId, week), JSON.stringify(response, null, 2));
}

export async function appendScorePredictionHistory(
  response: ScorePredictionsResponse,
): Promise<void> {
  await mkdir(SCORE_DIR, { recursive: true });

  const records: ScoreHistoryRecord[] = response.predictions.map((p) => ({
    leagueId: response.leagueId,
    week: response.week,
    teamId: p.teamId,
    managerName: p.managerName,
    generatedAt: response.generatedAt,
    totalExpected: p.predictedLineup.totalExpected,
    fieldExpected: p.predictedLineup.fieldExpected,
    captainBonus: p.predictedLineup.captainBonus,
    coachPoints: p.predictedLineup.coachPoints,
    benchExpected: p.predictedLineup.benchExpected,
    dataQuality: p.predictedLineup.dataQuality.level,
    inferred: p.predictedLineup.inferred,
    degraded: p.predictedLineup.degraded,
  }));

  const existing = await readJsonl<ScoreHistoryRecord>(HISTORY_FILE);
  const byKey = new Map(existing.map((r) => [`${r.leagueId}:${r.week}:${r.teamId}`, r]));
  for (const record of records) {
    byKey.set(`${record.leagueId}:${record.week}:${record.teamId}`, record);
  }

  const body = [...byKey.values()].map((r) => JSON.stringify(r)).join('\n') + '\n';
  await writeFile(HISTORY_FILE, body);
}

export async function loadScorePredictionHistory(
  leagueId?: string,
  week?: number,
): Promise<ScoreHistoryRecord[]> {
  const records = await readJsonl<ScoreHistoryRecord>(HISTORY_FILE);
  return records.filter((r) => (!leagueId || r.leagueId === leagueId) && (week === undefined || r.week === week));
}

export async function loadScorePredictionSnapshot(
  leagueId: string,
  week: number,
): Promise<ScorePredictionsResponse | null> {
  try {
    const raw = await readFile(snapshotFile(leagueId, week), 'utf8');
    return JSON.parse(raw) as ScorePredictionsResponse;
  } catch {
    return null;
  }
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
