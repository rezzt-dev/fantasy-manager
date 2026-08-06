import type { Match } from '../../types/fantasy';
import type { CoachPrediction } from '../../types/analysis';

/**
 * Estimador MVP de puntos del entrenador para una jornada.
 *
 * En LALIGA FANTASY el entrenador puntúa según el resultado de su equipo real:
 * victoria +5, empate +3, derrota +1, más un bonus/malus por goles encajados.
 * Como aún no tenemos xG de fuentes accesibles (diferido, §Fase 1), usamos
 * los ratings Elo de ClubElo para estimar la probabilidad de resultado y un
 * proxy simple de goles esperados encajados. Es un modelo conservador que se
 * calibrará con el track record de jornadas reales.
 */

const HOME_ELO_ADVANTAGE = 100;
const DEFAULT_DRAW_PROBABILITY = 0.25;
const BASE_GOALS_CONCEDED = 1.3;
const GOALS_SENSITIVITY = 0.006;

/** Puntos que otorga el entrenador según goles encajados (reglas aproximadas). */
function pointsByGoalsConceded(goals: number): number {
  if (goals === 0) return 5;
  if (goals === 1) return 3;
  if (goals === 2) return 1;
  if (goals === 3) return 0;
  return -(goals - 3); // 4 -> -1, 5 -> -2, ...
}

/** Probabilidad de Poisson para k eventos con media lambda. */
function poisson(k: number, lambda: number): number {
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function predictCoachPoints(
  teamId: number,
  matches: Match[],
  teamElos?: Map<number, number>,
): CoachPrediction {
  const homeMatch = matches.find((m) => m.localId === teamId);
  const awayMatch = matches.find((m) => m.visitorId === teamId);
  const match = homeMatch ?? awayMatch;
  const isHome = !!homeMatch;

  if (!match) {
    return {
      teamId,
      expectedPoints: 0,
      source: 'fallback',
      notes: ['El equipo descansa esta jornada.'],
    };
  }

  const opponentId = isHome ? match.visitorId : match.localId;

  const ownElo = teamElos?.get(teamId);
  const oppElo = teamElos?.get(opponentId);

  if (ownElo === undefined || oppElo === undefined) {
    return {
      teamId,
      expectedPoints: 3,
      source: 'fallback',
      notes: ['Sin ratings Elo disponibles: estimación base.'],
    };
  }

  const diff = ownElo - oppElo + (isHome ? HOME_ELO_ADVANTAGE : -HOME_ELO_ADVANTAGE);
  const pWinBase = 1 / (1 + Math.pow(10, -diff / 400));
  const pDraw = DEFAULT_DRAW_PROBABILITY;
  const pWin = clamp(pWinBase - pDraw / 2, 0.05, 0.95 - pDraw);
  const pLoss = clamp(1 - pWin - pDraw, 0.05, 0.95 - pDraw);

  const expectedResultPoints = pWin * 5 + pDraw * 3 + pLoss * 1;

  // Proxy de goles esperados encajados: favorito encaja menos, underdog más.
  const expectedGoalsConceded = clamp(BASE_GOALS_CONCEDED - diff * GOALS_SENSITIVITY, 0.5, 2.5);
  let expectedGoalsPoints = 0;
  for (let g = 0; g <= 6; g++) {
    expectedGoalsPoints += poisson(g, expectedGoalsConceded) * pointsByGoalsConceded(g);
  }
  // Normalizar el tail de Poisson truncado: asumimos que todo el peso restante
  // son goles encajados ≥ 7, que suman puntos muy negativos. Aproximamos con -3.
  const tailProbability = 1 - Array.from({ length: 7 }, (_, i) => poisson(i, expectedGoalsConceded)).reduce((a, b) => a + b, 0);
  expectedGoalsPoints += tailProbability * -3;

  const total = round1(expectedResultPoints + expectedGoalsPoints);

  const notes = [
    `Elo ${ownElo.toFixed(0)} vs ${oppElo.toFixed(0)} (${isHome ? 'local' : 'visitante'}).`,
    `P(V)=${(pWin * 100).toFixed(0)}%, P(E)=${(pDraw * 100).toFixed(0)}%, P(D)=${(pLoss * 100).toFixed(0)}%.`,
    `Goles esperados encajados ≈ ${expectedGoalsConceded.toFixed(1)}.`,
  ];

  return { teamId, expectedPoints: total, source: 'elo-result', notes };
}
