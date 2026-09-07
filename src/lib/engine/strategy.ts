import type { Match, PlayerMaster } from '../../types/fantasy';
import type { StrategyDistribution, StrategyPlayer, StrategyReport, StrategySource } from '../../types/strategy';
import { FORM_WINDOW, XI_PER_DAY } from './form';
import { predictPlayerPoints, resolveTeamId, type PredictionContext } from './model';
import type { PlayerWeekStat } from './player-stats';

const MIN_SAMPLES = 5;
interface Observation { week: number; points: number; weight: number }

/** Closed weeks only; never count duplicates, missing outcomes or future data as zero. */
export function strategyObservations(stats: PlayerWeekStat[], week: number): Observation[] {
  const seen = new Set<number>();
  return [...stats].filter((s) => Number.isInteger(s.weekNumber) && s.weekNumber < week &&
    typeof s.totalPoints === 'number' && Number.isFinite(s.totalPoints))
    .sort((a, b) => b.weekNumber - a.weekNumber)
    .filter((s) => {
      if (seen.has(s.weekNumber)) return false;
      seen.add(s.weekNumber);
      return true;
    }).slice(0, FORM_WINDOW).map((s) => ({
      week: s.weekNumber,
      points: s.totalPoints!,
      weight: Math.exp(-XI_PER_DAY * 7 * (week - s.weekNumber)),
    }));
}

function mean(observations: Observation[]): number {
  const sum = observations.reduce((acc, s) => acc + s.weight, 0);
  return observations.reduce((acc, s) => acc + s.points * s.weight, 0) / sum;
}

function quantile(values: { value: number; weight: number }[], p: number): number {
  const sorted = [...values].sort((a, b) => a.value - b.value);
  const target = sorted.reduce((acc, s) => acc + s.weight, 0) * p;
  let cumulative = 0;
  for (const entry of sorted) {
    cumulative += entry.weight;
    if (cumulative >= target) return entry.value;
  }
  return sorted[sorted.length - 1].value;
}

/** Descriptive residual distribution, NOT a calibrated confidence interval. */
export function strategyDistribution(xp: number, observations: Observation[]): StrategyDistribution | null {
  if (observations.length < MIN_SAMPLES || !Number.isFinite(xp)) return null;
  const weightSum = observations.reduce((acc, s) => acc + s.weight, 0);
  const effectiveSamples = weightSum ** 2 / observations.reduce((acc, s) => acc + s.weight ** 2, 0);
  if (effectiveSamples < MIN_SAMPLES - 1) return null;
  const center = mean(observations);
  // Do not clamp: negative fantasy scores are possible; clamping biases the mean.
  const values = observations.map((s) => ({ value: xp + s.points - center, weight: s.weight }));
  return {
    samples: observations.length, effectiveSamples,
    lower: quantile(values, 0.1), median: quantile(values, 0.5), upper: quantile(values, 0.9),
    probabilityAtLeast5: values.filter((s) => s.value >= 5).reduce((acc, s) => acc + s.weight, 0) / weightSum,
  };
}

/** Pair by week to retain observed covariance, rather than assuming independence. */
export function compareStrategyPlayers(deltaXp: number, a: Observation[], b: Observation[]): {
  probabilityBetter: number | null; probabilityTie: number | null; pairedSamples: number;
} {
  const byWeek = new Map(b.map((s) => [s.week, s]));
  const paired = a.flatMap((s) => {
    const other = byWeek.get(s.week);
    return other ? [{ ...s, points: s.points - other.points }] : [];
  });
  const unavailable = { probabilityBetter: null, probabilityTie: null, pairedSamples: paired.length };
  if (paired.length < MIN_SAMPLES) return unavailable;
  const total = paired.reduce((acc, s) => acc + s.weight, 0);
  if (total ** 2 / paired.reduce((acc, s) => acc + s.weight ** 2, 0) < MIN_SAMPLES - 1) return unavailable;
  const center = mean(paired);
  let better = 0;
  let tie = 0;
  for (const s of paired) {
    const difference = deltaXp + s.points - center;
    if (Math.abs(difference) < 1e-12) tie += s.weight;
    else if (difference > 0) better += s.weight;
  }
  return { probabilityBetter: better / total, probabilityTie: tie / total, pairedSamples: paired.length };
}

export function buildStrategyReport(input: {
  players: PlayerMaster[];
  ownPlayerIds: Set<string>;
  calendar: Match[];
  context: PredictionContext;
  sources: StrategySource[];
  additionalAbsences?: StrategyReport['additionalAbsences'];
}): StrategyReport {
  const { ownPlayerIds, calendar, context } = input;
  const unique = [...new Map(input.players.map((p) => [p.id, p])).values()];
  const observations = new Map(unique.map((p) => [p.id,
    context.weekNumber === undefined ? [] : strategyObservations(context.playerStats?.[p.id] ?? [], context.weekNumber)]));
  const players: StrategyPlayer[] = unique.map((player) => {
    const prediction = predictPlayerPoints(player, calendar, context);
    const teamId = resolveTeamId(player);
    const match = calendar.find((m) => m.localId === teamId || m.visitorId === teamId);
    const opponentId = match ? (match.localId === teamId ? match.visitorId : match.localId) : undefined;
    const opponentElo = opponentId === undefined ? undefined : context.teamElos?.get(opponentId);
    const perturb = (delta: number): number => {
      const teamElos = new Map(context.teamElos);
      teamElos.set(opponentId!, opponentElo! + delta);
      return predictPlayerPoints(player, calendar, { ...context, teamElos }).xp - prediction.xp;
    };
    const unavailable = prediction.expectedMinutes === 0;
    return {
      playerId: player.id, name: player.nickname || player.name,
      positionId: Number(player.positionId), owned: ownPlayerIds.has(player.id), xp: prediction.xp,
      expectedMinutes: prediction.expectedMinutes, pStarter: prediction.pStarter,
      distribution: unavailable ? null : strategyDistribution(prediction.xp, observations.get(player.id)!),
      xpPerMinute: prediction.expectedMinutes !== null && prediction.expectedMinutes > 0
        ? prediction.xp / prediction.expectedMinutes : null,
      opponentSensitivity: prediction.fixture && opponentElo !== undefined ? { stronger: perturb(10), weaker: perturb(-10) } : null,
      comparison: null,
      notes: [...prediction.dataQuality.notes, ...(unavailable ? ['Sin minutos previstos: no se extrapola la variabilidad histórica.'] : [])],
    };
  });
  for (const player of players) {
    const reference = players.filter((p) => p.owned && p.playerId !== player.playerId && p.positionId === player.positionId)
      .sort((a, b) => b.xp - a.xp || a.playerId.localeCompare(b.playerId))[0];
    if (!reference) continue;
    const deltaXp = player.xp - reference.xp;
    const comparison = player.expectedMinutes === 0 || reference.expectedMinutes === 0
      ? { probabilityBetter: null, probabilityTie: null, pairedSamples: 0 }
      : compareStrategyPlayers(deltaXp, observations.get(player.playerId)!, observations.get(reference.playerId)!);
    player.comparison = { playerId: reference.playerId, name: reference.name, deltaXp, ...comparison };
  }
  return {
    version: 'strategy-v1', method: 'paired-weighted-residuals', calibrated: false,
    players: players.sort((a, b) => b.xp - a.xp || a.playerId.localeCompare(b.playerId)), sources: input.sources,
    additionalAbsences: input.additionalAbsences ?? [],
    limitations: [
      'Rangos P10–P90 y probabilidades exploratorios, sin calibración fuera de muestra. No cubren todos los resultados posibles.',
      'Hasta 10 jornadas cerradas con decaimiento temporal; mínimo 5 observaciones. Las comparaciones usan solo jornadas compartidas.',
      'El histórico puede no representar un cambio de rol, lesión o equipo. La correlación pasada puede cambiar.',
      'Comparación individual con el mejor jugador propio de la misma posición: no equivale a ganancia del once ni autoriza un fichaje.',
      'Sensibilidad local: un minuto adicional y ±10 Elo del rival, manteniendo el resto constante; no son escenarios con probabilidad asignada.',
      'Bajas de API-Football como contraste adicional: revisa discrepancias con el once confirmado antes de actuar.',
    ],
  };
}
