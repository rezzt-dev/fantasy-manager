import type { LeagueAnalysis, CaptainCandidate, CaptainRecommendation } from '../../types/analysis';
import { estimatePoints, type EstimatorContext } from './points-estimator';
import { combinedSignal } from './external-intelligence';
import { isSuspended } from '../engine/features/minutes';

/**
 * Recomendación de capitán: el jugador del once con más puntos esperados.
 *
 * El score es el xP del modelo SIN factores extra: localía, estado físico,
 * titularidad, noticias y dificultad del rival ya están aplicados una vez en
 * el estimador (§2.1.8 del diseño: aquí se elimina la doble/triple
 * contabilidad que tenía el motor anterior). El filtro de salud solo ordena
 * (un capitán debe estar disponible), no vuelve a penalizar.
 */
export function recommendCaptain(analysis: LeagueAnalysis, estimatorContext?: EstimatorContext): CaptainRecommendation {
  const { lineup, calendar, externalSignals, starterInfo } = analysis;

  const lineupEntries = [
    ...(lineup.formation.goalkeeper || []),
    ...(lineup.formation.defender || []),
    ...(lineup.formation.midfielder || []),
    ...(lineup.formation.attacker || []),
  ];

  const candidates: CaptainCandidate[] = lineupEntries.map((entry) => {
    const player = entry.playerMaster;
    const isHome = calendar.some((m) => m.localId === Number(player.teamId) || m.localId === Number(player.team?.id));
    const isHealthy = player.playerStatus === 'ok' && !isSuspended(player, estimatorContext?.injuryReport);
    const expected = estimatePoints(player, calendar, estimatorContext);
    const external = combinedSignal(externalSignals[player.id] || []);
    const hasBadNews = external.signal === 'sell' && external.confidence >= 0.6;
    const starterScore = starterInfo[player.id]?.score;

    const reasons: string[] = [];
    reasons.push(`${expected.toFixed(1)} pts esperados`);
    if (isHome) reasons.push('juega en casa');
    else reasons.push('juega fuera');
    if (!isHealthy) reasons.push(`está ${statusText(player.playerStatus)}`);
    if (hasBadNews) reasons.push('noticias negativas recientes');
    if (starterScore !== undefined && starterScore < 0.35) reasons.push('suplente habitual');
    else if (starterScore !== undefined && starterScore >= 0.8) reasons.push('titular habitual');

    return {
      player,
      expectedPoints: expected,
      isHome,
      isHealthy,
      score: expected,
      reasoning: reasons.join(' · '),
    };
  });

  // Ordenar por puntos esperados. Los disponibles primero: un capitán debe jugar.
  candidates.sort((a, b) => b.score - a.score);

  const healthyOnes = candidates.filter((c) => c.isHealthy);
  const usable = healthyOnes.length > 0 ? healthyOnes : candidates;

  const captain = usable[0] || candidates[0];
  const alternatives = usable.slice(1, 3);

  return {
    captain: captain || (alternatives[0] as CaptainCandidate),
    alternatives,
  };
}

function statusText(status: string): string {
  switch (status) {
    case 'doubtful':
      return 'dudoso';
    case 'injured':
      return 'lesionado';
    case 'out_of_league':
      return 'fuera de la liga';
    default:
      return status;
  }
}
