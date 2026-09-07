/** Contrato público del diagnóstico estadístico; sin dependencias de servidor. */
export interface StrategyDistribution {
  samples: number;
  effectiveSamples: number;
  lower: number;
  median: number;
  upper: number;
  probabilityAtLeast5: number;
}

export interface StrategyPlayer {
  playerId: string;
  name: string;
  positionId: number;
  owned: boolean;
  xp: number;
  expectedMinutes: number | null;
  pStarter: number | null;
  distribution: StrategyDistribution | null;
  /** Cambio local en xP por un minuto adicional; no incluye cambios de rol. */
  xpPerMinute: number | null;
  /** Cambio de xP al perturbar el Elo del rival en ±10 puntos. */
  opponentSensitivity: { stronger: number; weaker: number } | null;
  comparison: {
    playerId: string;
    name: string;
    deltaXp: number;
    probabilityBetter: number | null;
    probabilityTie: number | null;
    pairedSamples: number;
  } | null;
  notes: string[];
}

export interface StrategySource {
  name: string;
  status: 'available' | 'stale' | 'unavailable' | 'not-configured';
  detail: string;
  fetchedAt?: string;
}

export interface StrategyReport {
  version: 'strategy-v1';
  method: 'paired-weighted-residuals';
  calibrated: false;
  players: StrategyPlayer[];
  sources: StrategySource[];
  limitations: string[];
  additionalAbsences: { playerId: string; name: string; status: 'missing' | 'questionable'; reason: string }[];
}
