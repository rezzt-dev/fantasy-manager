import type { Match, PlayerMaster, TeamLineup, TeamPlayer } from '../../types/fantasy';
import type {
  CoachPrediction,
  OptimalLineup,
  OptimalLineupEntry,
  PredictedLineup,
  PredictedPlayerScore,
  TeamScorePrediction,
} from '../../types/analysis';
import type { EstimatorContext } from '../recommendations/points-estimator';
import { estimatePointsDetailed } from '../recommendations/points-estimator';
import { computeOptimalLineup } from './lineup-optimizer';
import { predictCoachPoints } from '../engine/coach-points';
import { combinedSignal } from '../recommendations/external-intelligence';
import { isSuspended } from '../engine/features/minutes';

const BAD_NEWS_CONFIDENCE = 0.6;
const COACH_POSITION_ID = 5;
const BENCH_SIZE = 5;

export interface PredictTeamScoreInput {
  teamId: number;
  managerId: number;
  managerName: string;
  teamValue: number;
  players: TeamPlayer[];
  currentLineup?: TeamLineup;
  calendar: Match[];
  formations: string[];
  context?: EstimatorContext;
  captainEnabled: boolean;
  coachEnabled: boolean;
  teamElos?: Map<number, number>;
}

function isFieldPlayer(p: PlayerMaster): boolean {
  return p.positionId !== COACH_POSITION_ID;
}

function isHealthyForLineup(p: PlayerMaster, context?: EstimatorContext): boolean {
  if (p.playerStatus !== 'ok') return false;
  if (isSuspended(p, context?.injuryReport)) return false;
  const external = combinedSignal(context?.externalSignals?.[p.id] || []);
  return !(external.signal === 'sell' && external.confidence >= BAD_NEWS_CONFIDENCE);
}

function toScoreEntry(
  player: PlayerMaster,
  calendar: Match[],
  context?: EstimatorContext,
  isCaptain = false,
  isCoach = false,
): PredictedPlayerScore {
  const pred = estimatePointsDetailed(player, calendar, context);
  return {
    player,
    xp: pred.xp,
    expectedPoints: pred.riskAdjustedXp,
    riskAdjustedXp: pred.riskAdjustedXp,
    expectedMinutes: pred.expectedMinutes,
    pStarter: pred.pStarter,
    source: pred.source,
    isCaptain,
    isCoach,
  };
}

function worstDataQuality(levels: ('high' | 'medium' | 'low')[]): 'high' | 'medium' | 'low' {
  if (levels.includes('low')) return 'low';
  if (levels.includes('medium')) return 'medium';
  return 'high';
}

function hasRealLineup(lineup: TeamLineup): boolean {
  const count =
    (lineup.formation.goalkeeper?.length ?? 0) +
    (lineup.formation.defender?.length ?? 0) +
    (lineup.formation.midfielder?.length ?? 0) +
    (lineup.formation.attacker?.length ?? 0);
  return count >= 10;
}

function inferRivalLineup(
  players: TeamPlayer[],
  calendar: Match[],
  formations: string[],
  context?: EstimatorContext,
  captainEnabled?: boolean,
): OptimalLineup | undefined {
  return computeOptimalLineup({
    squad: players,
    calendar,
    formations,
    context,
    captainEnabled,
  });
}

function buildLineupFromOptimal(
  optimal: OptimalLineup,
  calendar: Match[],
  context?: EstimatorContext,
  inferred = true,
): PredictedLineup {
  const captainId = optimal.captain?.player.id;
  const starters = optimal.starters.map((e) => toScoreEntry(e.player, calendar, context, e.player.id === captainId));
  const bench = optimal.bench.map((e) => toScoreEntry(e.player, calendar, context));
  const captain = starters.find((s) => s.isCaptain);

  const fieldExpected = starters.reduce((sum, s) => sum + s.expectedPoints, 0);
  const captainBonus = captain ? captain.expectedPoints : 0;
  const benchExpected = bench.reduce((sum, b) => sum + b.expectedPoints, 0);
  const totalExpected = fieldExpected + captainBonus; // entrenador se añade después

  const allLevels = [...starters, ...bench].map((s) => {
    const lvl: 'high' | 'medium' | 'low' = s.source === 'components' ? 'high' : s.source === 'season-average' ? 'medium' : 'low';
    return lvl;
  });
  if (inferred) allLevels.push('low');

  const notes: string[] = [];
  if (inferred) notes.push('Alineación inferida desde la plantilla (la API no expone la alineación rival).');
  if (optimal.degraded) notes.push('La predicción usa jugadores con dudas porque no había suficientes sanos.');

  return {
    formation: optimal.formation,
    starters,
    bench,
    captain,
    coach: undefined,
    fieldExpected: round1(fieldExpected),
    captainBonus: round1(captainBonus),
    coachPoints: 0,
    benchExpected: round1(benchExpected),
    totalExpected: round1(totalExpected),
    dataQuality: { level: worstDataQuality(allLevels), notes },
    degraded: optimal.degraded ?? false,
    inferred,
  };
}

function buildLineupFromCurrentLineup(
  currentLineup: TeamLineup,
  players: TeamPlayer[],
  calendar: Match[],
  context?: EstimatorContext,
  captainEnabled?: boolean,
): PredictedLineup {
  const starterEntries = [
    ...(currentLineup.formation.goalkeeper || []),
    ...(currentLineup.formation.defender || []),
    ...(currentLineup.formation.midfielder || []),
    ...(currentLineup.formation.attacker || []),
  ];
  const starterIds = new Set(starterEntries.map((e) => e.playerMaster.id));

  const starters = starterEntries.map((e) => toScoreEntry(e.playerMaster, calendar, context));
  const starterScores = captainEnabled
    ? starters.map((s) => ({ ...s, isCaptain: false }))
    : starters;

  let captain: PredictedPlayerScore | undefined;
  if (captainEnabled && starterScores.length > 0) {
    const best = starterScores.reduce((a, b) => (a.expectedPoints > b.expectedPoints ? a : b));
    captain = { ...best, isCaptain: true };
    const idx = starters.findIndex((s) => s.player.id === captain!.player.id);
    if (idx >= 0) starters[idx] = captain;
  }

  const fieldPlayers = players.map((tp) => tp.playerMaster).filter(isFieldPlayer);
  const eligible = fieldPlayers.filter((p) => isHealthyForLineup(p, context));
  const bench = eligible
    .filter((p) => !starterIds.has(p.id))
    .map((p) => toScoreEntry(p, calendar, context))
    .sort((a, b) => b.expectedPoints - a.expectedPoints)
    .slice(0, BENCH_SIZE);

  const fieldExpected = starters.reduce((sum, s) => sum + s.expectedPoints, 0);
  const captainBonus = captain ? captain.expectedPoints : 0;
  const benchExpected = bench.reduce((sum, b) => sum + b.expectedPoints, 0);
  const totalExpected = fieldExpected + captainBonus;

  const allLevels = [...starters, ...bench].map((s) => {
    const lvl: 'high' | 'medium' | 'low' = s.source === 'components' ? 'high' : s.source === 'season-average' ? 'medium' : 'low';
    return lvl;
  });

  const degraded = starters.some((s) => s.player.playerStatus !== 'ok');
  const notes: string[] = ['Alineación real del equipo.'];
  if (degraded) notes.push('Algún titular no está al 100% según la API; los puntos esperados ya están penalizados.');

  return {
    formation: '4-4-2', // se actualizará abajo si se puede deducir
    starters,
    bench,
    captain,
    coach: undefined,
    fieldExpected: round1(fieldExpected),
    captainBonus: round1(captainBonus),
    coachPoints: 0,
    benchExpected: round1(benchExpected),
    totalExpected: round1(totalExpected),
    dataQuality: { level: worstDataQuality(allLevels), notes },
    degraded,
    inferred: false,
  };
}

function guessFormation(starters: PredictedPlayerScore[]): string {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<number, number>;
  for (const s of starters) {
    counts[s.player.positionId] = (counts[s.player.positionId] || 0) + 1;
  }
  return `${counts[2] ?? 0}-${counts[3] ?? 0}-${counts[4] ?? 0}`;
}

export function predictTeamScore(input: PredictTeamScoreInput): TeamScorePrediction {
  const {
    teamId,
    managerId,
    managerName,
    teamValue,
    players,
    currentLineup,
    calendar,
    formations,
    context,
    captainEnabled,
    coachEnabled,
    teamElos,
  } = input;

  let predictedLineup: PredictedLineup;
  if (currentLineup && hasRealLineup(currentLineup)) {
    predictedLineup = buildLineupFromCurrentLineup(currentLineup, players, calendar, context, captainEnabled);
    predictedLineup.formation = guessFormation(predictedLineup.starters);
  } else {
    const optimal = inferRivalLineup(players, calendar, formations, context, captainEnabled);
    if (!optimal) {
      // Fallback: plantilla sin formación válida, devolvemos algo degradado.
      predictedLineup = buildLineupFromCurrentLineup(
        { formation: { goalkeeper: [], defender: [], midfielder: [], attacker: [] } },
        players,
        calendar,
        context,
        captainEnabled,
      );
      predictedLineup.inferred = true;
      predictedLineup.dataQuality.notes.push('No se pudo inferir una formación válida para este rival.');
      predictedLineup.dataQuality.level = 'low';
    } else {
      predictedLineup = buildLineupFromOptimal(optimal, calendar, context, true);
    }
  }

  // Entrenador
  const coachPlayer = players.find((tp) => tp.playerMaster.positionId === COACH_POSITION_ID)?.playerMaster;
  let coachPrediction: CoachPrediction;
  if (coachEnabled && coachPlayer) {
    coachPrediction = predictCoachPoints(teamId, calendar, teamElos);
    predictedLineup.coach = toScoreEntry(coachPlayer, calendar, context, false, true);
    predictedLineup.coach.expectedPoints = coachPrediction.expectedPoints;
    predictedLineup.coach.xp = coachPrediction.expectedPoints;
    predictedLineup.coach.riskAdjustedXp = coachPrediction.expectedPoints;
    predictedLineup.coachPoints = coachPrediction.expectedPoints;
    predictedLineup.totalExpected = round1(predictedLineup.totalExpected + coachPrediction.expectedPoints);
  } else {
    coachPrediction = {
      teamId,
      expectedPoints: 0,
      source: 'fallback',
      notes: coachEnabled ? ['No se encontró entrenador en la plantilla.'] : ['Entrenador desactivado en la liga.'],
    };
  }

  return {
    teamId,
    managerId,
    managerName,
    teamValue,
    predictedLineup,
    coachPrediction,
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
