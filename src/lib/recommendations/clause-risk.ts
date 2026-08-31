import type { ClauseRiskAnalysis, LeagueAnalysis, RivalTeam } from '../../types/analysis';
import { estimatePoints, type EstimatorContext } from './points-estimator';
import { computeAvailableBudget } from '../analysis/tactical-scheme';
import { getClauseProtection } from '../clause-availability';
import { marketFlowByManager, type ManagerMarketFlow } from '../fantasy/activity';

/**
 * Poder adquisitivo de un rival con la misma regla del 20% que aplicamos a
 * nuestro presupuesto (§5.1): efectivo + 20% del valor de su plantilla.
 * Si la API no expone el efectivo del rival (403 suave), se usa el crédito
 * del 20% ajustado por su flujo real de mercado (actividad de la liga:
 * ventas recientes suman liquidez, compras la restan).
 */
export function rivalSpendingPower(rival: RivalTeam, flow?: ManagerMarketFlow): number {
  if (rival.teamMoney !== null) {
    // Con efectivo real la actividad ya está reflejada en la cifra: no ajustar.
    return computeAvailableBudget({ teamMoney: rival.teamMoney, teamInvestment: 0 }, rival.teamValue).available;
  }
  const credit = Math.floor((Number(rival.teamValue) || 0) * 0.2);
  if (!flow) return credit;
  return Math.max(0, credit + flow.income - flow.expense);
}

export function analyzeClauseRisks(analysis: LeagueAnalysis, context?: EstimatorContext): ClauseRiskAnalysis[] {
  const { teamData, rivals, calendar } = analysis;
  const results: ClauseRiskAnalysis[] = [];

  const flowsByManager = marketFlowByManager(analysis.leagueActivity ?? []);
  const maxRivalSpendingPower = rivals.length > 0 ? Math.max(0, ...rivals.map((r) => rivalSpendingPower(r, flowsByManager.get(r.managerId)))) : 0;

  for (const teamPlayer of teamData.players) {
    const player = teamPlayer.playerMaster;
    const currentClause = Number(teamPlayer.buyoutClause) || 0;
    const marketValue = Number(player.marketValue) || 1;
    const teamValue = Number(analysis.league.team.teamValue) || 0;

    // Si el jugador está blindado o su cláusula está bloqueada (p. ej. las
    // 2 semanas de protección tras un clausulazo), no hay riesgo real.
    const protection = getClauseProtection(teamPlayer);
    if (protection.status !== 'available') {
      results.push({
        playerId: player.id,
        nickname: player.nickname,
        currentClause,
        marketValue,
        riskScore: 0,
        rivalsThatCanAfford: 0,
        rivalNeedScore: 0,
        recommendedClause: currentClause,
        reasoning:
          protection.status === 'shielded'
            ? 'Está blindado: no se puede clausular.'
            : `Cláusula bloqueada hasta ${formatDate(protection.until)}: no se puede clausular.`,
      });
      continue;
    }

    const expected = estimatePoints(player, calendar, context);

    let rivalsThatCanAfford = 0;
    let clauseAttackers = 0;
    let maxNeedScore = 0;

    for (const rival of rivals) {
      const flow = flowsByManager.get(rival.managerId);
      const spendingPower = rivalSpendingPower(rival, flow);

      if (spendingPower >= currentClause) {
        rivalsThatCanAfford += 1;
        // Comportamiento real (actividad de liga): managers que ya han
        // clausulado recientemente son más peligrosos para esta cláusula.
        if ((flow?.clauseAttacks ?? 0) > 0) clauseAttackers += 1;
      }

      const rivalHasPosition = rival.players.some(
        (p) =>
          p.playerMaster.positionId === player.positionId &&
          p.playerMaster.playerStatus === 'ok' &&
          (Number(p.playerMaster.marketValue) || 0) >= marketValue * 0.6,
      );

      if (!rivalHasPosition) {
        // Si el rival no tiene un jugador sano y valioso en esa posición, necesita más a este jugador.
        const needScore = Math.min(1, (spendingPower + 1) / (currentClause + 1));
        if (needScore > maxNeedScore) maxNeedScore = needScore;
      }
    }

    let risk = 0;
    if (rivalsThatCanAfford > 0) risk += 35;
    if (clauseAttackers > 0) risk += 10;
    risk += Math.min(30, (marketValue / currentClause) * 30);
    risk += Math.min(25, expected * 4);
    risk += maxNeedScore * 20;
    if (player.playerStatus !== 'ok') risk *= 0.5;

    risk = Math.min(100, Math.max(0, risk));

    const recommendedClause = computeRecommendedClause({
      currentClause,
      marketValue,
      maxRivalSpendingPower,
      expected,
      teamValue,
    });

    const reasoningParts = [
      `${rivalsThatCanAfford} rival${rivalsThatCanAfford === 1 ? '' : 'es'} puede${rivalsThatCanAfford === 1 ? '' : 'n'} pagar la cláusula`,
      `valor de mercado ${formatCurrency(marketValue)}`,
      `puntos esperados ${expected.toFixed(1)}`,
    ];
    if (clauseAttackers > 0) {
      reasoningParts.push(`${clauseAttackers} con clausulazos recientes`);
    }
    if (player.playerStatus !== 'ok') reasoningParts.push(`estado ${player.playerStatus}`);

    results.push({
      playerId: player.id,
      nickname: player.nickname,
      currentClause,
      marketValue,
      riskScore: Math.round(risk),
      rivalsThatCanAfford,
      rivalNeedScore: maxNeedScore,
      recommendedClause,
      reasoning: reasoningParts.join(' · '),
    });
  }

  return results.sort((a, b) => b.riskScore - a.riskScore);
}

interface ClauseInputs {
  currentClause: number;
  marketValue: number;
  maxRivalSpendingPower: number;
  expected: number;
  teamValue: number;
}

function computeRecommendedClause(inputs: ClauseInputs): number {
  const { currentClause, marketValue, maxRivalSpendingPower, expected, teamValue } = inputs;

  const clauseBump = currentClause * 1.15;
  const valueBased = marketValue * 1.35;
  // Asegurar que ningún rival pueda pagar la cláusula con su poder adquisitivo.
  const rivalBased = Math.max(maxRivalSpendingPower * 1.05, marketValue + maxRivalSpendingPower * 0.5);
  const performanceBased = marketValue + expected * 1_500_000;

  let recommended = Math.max(clauseBump, valueBased, rivalBased, performanceBased);

  // Topes razonables para no romper la economía del equipo.
  const absoluteMax = Math.max(500_000_000, teamValue * 0.6);
  recommended = Math.min(recommended, absoluteMax);

  // Redondear a múltiplo de 100.000 € para que quede limpio.
  recommended = Math.ceil(recommended / 100_000) * 100_000;

  return recommended;
}

function formatDate(iso?: string): string {
  if (!iso) return 'fecha desconocida';
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return iso;
  return new Date(time).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}
