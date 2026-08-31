import { readFile, writeFile } from 'node:fs/promises';
import { ensureDataDir, readablePath, writablePath } from '../runtime-paths';

/**
 * Parámetros calibrables del motor (§8, Fase 3): se buscan por backtesting
 * walk-forward sobre el track record y se persisten en data/engine-params.json.
 * El modelo los lee de forma síncrona (caché en memoria); sin fichero, los
 * valores por defecto del diseño.
 */

const PARAMS_FILE = 'engine-params.json';
const MEM_CACHE_MS = 60 * 1000; // 60 s

export interface EngineParams {
  /** k del partial pooling (shrinkage §4.5), en partidos. */
  shrinkageK: number;
  /** Divisor diferencia-Elo → multiplicador de fixture (§4.3). */
  eloDiffDivisor: number;
  /** λ de la penalización por riesgo xP − λσ (§5.2). */
  riskLambda: number;
  /** Fricción en puntos por movimiento del planificador multi-jornada (§5.3). */
  moveFrictionXp: number;
  /** Máximo de fichajes/clausulazos recomendados por jornada en el plan multi-jornada. */
  maxMovesPerWeek: number;
  /** Bonus en puntos esperados por mantener un jugador de una jornada a otra (holdeo). */
  holdBonusXp: number;
}

/** Valores por defecto del diseño (antes de cualquier calibración). */
export const DEFAULT_ENGINE_PARAMS: EngineParams = {
  shrinkageK: 8,
  eloDiffDivisor: 1000,
  riskLambda: 0.3,
  moveFrictionXp: 1.5,
  maxMovesPerWeek: 3,
  holdBonusXp: 0.2,
};

let cached: { loadedAt: number; params: EngineParams } | null = null;

/** Carga los parámetros (disco + caché 60 s). Llamar una vez por request. */
export async function loadEngineParams(): Promise<EngineParams> {
  if (cached && Date.now() - cached.loadedAt < MEM_CACHE_MS) return cached.params;
  let params = DEFAULT_ENGINE_PARAMS;
  try {
    const raw = JSON.parse(await readFile(await readablePath(PARAMS_FILE), 'utf8')) as Partial<EngineParams>;
    params = { ...DEFAULT_ENGINE_PARAMS, ...raw };
  } catch {
    // Sin fichero todavía: valores por defecto.
  }
  cached = { loadedAt: Date.now(), params };
  return params;
}

/** Lectura síncrona desde la caché (o defaults si aún no se ha cargado). */
export function getEngineParams(): EngineParams {
  return cached?.params ?? DEFAULT_ENGINE_PARAMS;
}

/** Persiste parámetros calibrados y actualiza la caché. */
export async function saveEngineParams(params: EngineParams): Promise<void> {
  await ensureDataDir('.', { seed: false });
  await writeFile(writablePath(PARAMS_FILE), JSON.stringify(params, null, 2));
  cached = { loadedAt: Date.now(), params };
}
