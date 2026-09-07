import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ensureDataDir } from '../runtime-paths';
import type { Match, PlayerMaster } from '../../types/fantasy';
import { predictPlayerPoints, type PredictionContext } from './model';
import { saveEngineParams, DEFAULT_ENGINE_PARAMS, type EngineParams } from './params';
import type { PlayerWeekStat } from './player-stats';

/**
 * Calibración automática de pesos por backtesting walk-forward (§8, Fase 3):
 * búsqueda en rejilla sobre los parámetros calibrables del motor (k de
 * shrinkage × amortiguador de emparejamiento) minimizando el MAE de las
 * predicciones jugador-jornada, prediciendo cada jornada SOLO con información
 * anterior a ella.
 *
 * El amortiguador de emparejamiento es el lever correcto para el backtesting:
 * el modelo de goles ya deriva su divisor Elo de la coherencia con la propia
 * fórmula Elo (§4.3), así que lo que queda por medir con datos propios es
 * cuánto de ese efecto teórico se traduce de verdad en puntos de fantasy.
 *
 * La replay usa exactamente `predictPlayerPoints` (el código de producción
 * con overrides de parámetros): lo que se evalúa es lo que se ejecuta.
 *
 * Se activa sola cuando hay suficientes muestras liquidadas (≥ MIN_SAMPLES
 * predicciones jugador-jornada); con menos, devuelve 'insufficient-data' y no
 * toca los parámetros en producción.
 */

const MIN_SAMPLES = 30;
const GRID_SHRINKAGE_K = [3, 5, 8, 12];
const GRID_FIXTURE_DAMPENING = [0.5, 0.75, 1, 1.25];
const CALIBRATION_FILE = 'calibration-latest.json';

export interface CalibrationResult {
  status: 'ok' | 'insufficient-data';
  samples: number;
  best?: { shrinkageK: number; fixtureDampening: number; mae: number };
  baselineMae?: number;
  grid?: { shrinkageK: number; fixtureDampening: number; mae: number }[];
  note?: string;
  computedAt: string;
}

interface PlayerWeekSample {
  player: PlayerMaster;
  week: number;
  priorStats: PlayerWeekStat[];
  actualPoints: number;
}

/** Muestras jugador-jornada con al menos 2 jornadas previas de historial. */
function buildSamples(statsByPlayer: Record<string, PlayerWeekStat[]>, playersById: Map<string, PlayerMaster>): PlayerWeekSample[] {
  const samples: PlayerWeekSample[] = [];
  for (const [playerId, stats] of Object.entries(statsByPlayer)) {
    const player = playersById.get(playerId);
    if (!player) continue;
    const sorted = [...stats].sort((a, b) => a.weekNumber - b.weekNumber);
    for (let i = 2; i < sorted.length; i++) {
      const target = sorted[i];
      if (typeof target.totalPoints !== 'number') continue;
      samples.push({ player, week: target.weekNumber, priorStats: sorted.slice(0, i), actualPoints: target.totalPoints });
    }
  }
  return samples;
}

export async function calibrateEngine(input: {
  statsByPlayer: Record<string, PlayerWeekStat[]>;
  playersById: Map<string, PlayerMaster>;
  calendarsByWeek: Map<number, Match[]>;
  /** Contexto de producción (priors, tiers, Elo, promedios de posición). */
  context: PredictionContext;
  /** Parámetros actualmente en producción (para el MAE de referencia). */
  currentParams?: EngineParams;
}): Promise<CalibrationResult> {
  const { statsByPlayer, playersById, calendarsByWeek, context } = input;
  const currentParams = input.currentParams ?? DEFAULT_ENGINE_PARAMS;

  const samples = buildSamples(statsByPlayer, playersById);
  if (samples.length < MIN_SAMPLES) {
    return {
      status: 'insufficient-data',
      samples: samples.length,
      note: `Hacen falta al menos ${MIN_SAMPLES} muestras jugador-jornada liquidadas (hay ${samples.length}). La calibración se activará sola al acumular jornadas.`,
      computedAt: new Date().toISOString(),
    };
  }

  // Rejilla de parámetros: MAE de la replay walk-forward por combinación.
  const grid: CalibrationResult['grid'] = [];
  for (const shrinkageK of GRID_SHRINKAGE_K) {
    for (const fixtureDampening of GRID_FIXTURE_DAMPENING) {
      const errors: number[] = [];
      for (const sample of samples) {
        const prediction = predictPlayerPoints(
          sample.player,
          calendarsByWeek.get(sample.week) ?? [],
          {
            ...context,
            playerStats: { [sample.player.id]: sample.priorStats },
            weekNumber: sample.week,
            paramOverrides: { shrinkageK, fixtureDampening },
          },
        );
        errors.push(Math.abs(prediction.xp - sample.actualPoints));
      }
      const mae = errors.reduce((sum, e) => sum + e, 0) / Math.max(errors.length, 1);
      grid.push({ shrinkageK, fixtureDampening, mae: Math.round(mae * 1000) / 1000 });
    }
  }

  const best = grid!.reduce((a, b) => (b.mae < a.mae ? b : a));
  const baseline = grid!.find((g) => g.shrinkageK === currentParams.shrinkageK && g.fixtureDampening === currentParams.fixtureDampening);
  const baselineMae = baseline?.mae ?? null;

  // Solo se aplican si MEJORAN a los parámetros en producción (nunca empeorar).
  let applied = false;
  if (baselineMae !== null && best.mae < baselineMae) {
    await saveEngineParams({ ...currentParams, shrinkageK: best.shrinkageK, fixtureDampening: best.fixtureDampening });
    applied = true;
  }

  return {
    status: 'ok',
    samples: samples.length,
    best,
    baselineMae: baselineMae ?? undefined,
    grid,
    note: applied
      ? `Parámetros actualizados (MAE ${baselineMae} → ${best.mae}).`
      : 'Los parámetros en producción ya son los mejores de la rejilla; sin cambios.',
    computedAt: new Date().toISOString(),
  };
}

export async function persistCalibration(result: CalibrationResult): Promise<void> {
  const dir = await ensureDataDir('track-record');
  await writeFile(path.join(dir, CALIBRATION_FILE), JSON.stringify(result, null, 2));
}
