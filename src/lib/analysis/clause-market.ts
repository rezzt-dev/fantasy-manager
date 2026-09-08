import type {
  EuropeanOutlook,
  FixtureOutlook,
  MarketPlayer,
  Match,
  PlayerEuropeanImpact,
  PlayerMaster,
  TeamPlayer,
} from '../../types/fantasy';
import type {
  BudgetBreakdown,
  ClauseCombo,
  ClauseFundingPlan,
  ClauseMarketAnalysis,
  ClauseTarget,
  ClauseVerdict,
  ExternalSignal,
  OwnerExposure,
  PositionNeed,
  RivalTeam,
  UpcomingClauseTarget,
} from '../../types/analysis';
import type { ValueTrend } from '../engine/sources/types';
import { estimatePointsDetailed, type EstimatorContext } from '../recommendations/points-estimator';
import { combinedSignal } from '../recommendations/external-intelligence';
import { rivalSpendingPower } from '../recommendations/clause-risk';
import { marketFlowByManager, type LeagueActivityEvent } from '../fantasy/activity';
import { getClauseProtection } from '../clause-availability';
import { isSuspended } from '../engine/features/minutes';
import { getPositionName } from '../format';

/**
 * Análisis de clausulazos: qué jugadores de los rivales se pueden clausular
 * hoy, cuánto mejoraría cada uno tu once y en qué orden conviene atacarlos.
 *
 * Todo se mide en la misma escala que el resto del motor: ΔxP en puntos de la
 * jornada (§5.4). El ΔxP que manda es `xiGain`, la mejora real del **once
 * titular** al añadir al jugador (se recalcula la mejor formación posible con
 * él dentro), no la comparación contra una media abstracta.
 */

const COACH_POSITION_ID = 5;
const BAD_NEWS_CONFIDENCE = 0.6;
/** Días de protección de la cláusula tras un clausulazo (reglas del juego). */
const POST_BUYOUT_PROTECTION_DAYS = 14;
/** Vender un jugador aporta caja +V pero resta valor de plantilla (−20% del bonus). */
const SALE_BUDGET_FACTOR = 0.8;
/** Máximo de ventas propuestas en un plan de financiación. */
const MAX_FUNDING_SALES = 3;
/** Candidatos que entran en la búsqueda de combos (coste combinatorio acotado). */
const COMBO_POOL = 8;
const MAX_COMBOS = 4;
/** Por debajo de esta probabilidad de titularidad tratamos al jugador como suplente. */
const SUBSTITUTE_SCORE = 0.35;
/** Puntos de `fitScore` que como mucho descuenta el mal momento europeo. */
const EUROPEAN_TIMING_PENALTY = 10;
/** A partir de aquí la rotación europea merece un aviso explícito de gasto. */
const EUROPEAN_WARNING_RISK = 45;

export interface ClauseMarketInput {
  squad: TeamPlayer[];
  rivals: RivalTeam[];
  market: MarketPlayer[];
  calendar: Match[];
  /** Formaciones disponibles de la API ("defensas,centrocampistas,delanteros"). */
  formations: string[];
  budget: BudgetBreakdown;
  ownNeeds: PositionNeed[];
  externalSignals: Record<string, ExternalSignal[]>;
  /** league.config.features.buyoutClause */
  buyoutClauseEnabled: boolean;
  /** league.config.premiumFeatures.captain: el capitán duplica puntos. */
  captainEnabled?: boolean;
  /** league.config.premiumFeatures.coach: sin ella el entrenador no puntúa. */
  coachEnabled?: boolean;
  context?: EstimatorContext;
  /** Actividad de liga: liquidez real de los rivales para medir la urgencia. */
  leagueActivity?: LeagueActivityEvent[];
  /** playerId -> tendencia de valor (FútbolFantasy). */
  valueTrends?: Map<string, ValueTrend>;
}

interface Scored {
  player: PlayerMaster;
  xp: number;
  riskAdjustedXp: number;
  pStarter: number | null;
  expectedMinutes: number | null;
  dataQuality: 'high' | 'medium' | 'low';
  fixture: FixtureOutlook | null;
  european: PlayerEuropeanImpact | null;
  source: string;
  eligible: boolean;
}

interface PoolEntry {
  id: string;
  points: number;
}

interface XiResult {
  formation: string;
  total: number;
  starterIds: Set<string>;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Puntuación de un jugador con el mismo criterio que el optimizador de once. */
function scorePlayer(player: PlayerMaster, input: ClauseMarketInput): Scored {
  const prediction = estimatePointsDetailed(player, input.calendar, input.context);
  const external = combinedSignal(input.externalSignals[player.id] || []);
  const badNews = external.signal === 'sell' && external.confidence >= BAD_NEWS_CONFIDENCE;
  const eligible =
    player.positionId !== COACH_POSITION_ID &&
    player.playerStatus === 'ok' &&
    !isSuspended(player, input.context?.injuryReport) &&
    !badNews;

  return {
    player,
    xp: prediction.xp,
    riskAdjustedXp: prediction.riskAdjustedXp,
    pStarter: prediction.pStarter,
    expectedMinutes: prediction.expectedMinutes,
    dataQuality: prediction.dataQuality.level,
    fixture: prediction.fixture,
    european: prediction.european,
    source: prediction.source,
    eligible,
  };
}

/**
 * Mejor once posible a partir de las reservas por posición. Réplica numérica
 * de `lineup-optimizer.ts` (misma co-optimización del capitán) sobre valores
 * ya calculados, para poder evaluar cientos de "¿y si ficho a X?" sin volver
 * a estimar puntos.
 */
function bestXi(pools: Map<number, PoolEntry[]>, formations: string[], captainEnabled: boolean): XiResult | null {
  let best: XiResult | null = null;

  for (const formation of formations) {
    const [defCount, midCount, attCount] = formation.split(',').map((n) => parseInt(n, 10));
    if (![defCount, midCount, attCount].every((n) => Number.isFinite(n))) continue;

    const gks = pools.get(1) || [];
    const defs = pools.get(2) || [];
    const mids = pools.get(3) || [];
    const atts = pools.get(4) || [];
    if (gks.length < 1 || defs.length < defCount || mids.length < midCount || atts.length < attCount) continue;

    const starters = [
      ...gks.slice(0, 1),
      ...defs.slice(0, defCount),
      ...mids.slice(0, midCount),
      ...atts.slice(0, attCount),
    ];
    const sum = starters.reduce((acc, entry) => acc + entry.points, 0);
    const captainBonus = captainEnabled ? Math.max(...starters.map((e) => e.points)) : 0;
    const total = sum + captainBonus;

    if (!best || total > best.total) {
      best = { formation, total, starterIds: new Set(starters.map((e) => e.id)) };
    }
  }

  return best;
}

/** Copia de las reservas con jugadores extra insertados en su posición. */
function poolsWith(base: Map<number, PoolEntry[]>, extras: { positionId: number; entry: PoolEntry }[]): Map<number, PoolEntry[]> {
  const next = new Map(base);
  for (const extra of extras) {
    const list = [...(next.get(extra.positionId) || []), extra.entry].sort((a, b) => b.points - a.points);
    next.set(extra.positionId, list);
  }
  return next;
}

/** Etiqueta de titularidad a partir de la probabilidad de la jornada. */
function starterLabelFrom(pStarter: number | null, player: PlayerMaster): string {
  if (pStarter === null) {
    const perGame = Number(player.averagePoints) || 0;
    if (perGame >= 5) return 'Titular';
    if (perGame >= 3) return 'Habitual';
    return 'Sin datos';
  }
  if (pStarter >= 0.75) return 'Titular';
  if (pStarter >= 0.5) return 'Habitual';
  if (pStarter >= SUBSTITUTE_SCORE) return 'Rotación';
  return 'Suplente';
}

function trendDirection(trend?: ValueTrend): 'rising' | 'falling' | 'flat' {
  if (!trend) return 'flat';
  if (trend.trendScore > 0 && trend.pct7d >= 3) return 'rising';
  if (trend.trendScore < 0 && trend.pct7d <= -3) return 'falling';
  return 'flat';
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

/**
 * Encaje 0-100 de un objetivo con tu equipo. Pondera lo que de verdad decide
 * un clausulazo: cuánto sube tu once (45), el nivel del jugador respecto a tu
 * plantilla (15), lo barata que es la cláusula (15), la necesidad posicional
 * (10), la titularidad (10) y la solidez del dato (5).
 *
 * La carga europea NO vuelve a descontar puntos aquí: sus puntos ya están
 * descontados dentro de `xiGain`, porque el estimador aplica la rotación y la
 * fatiga antes. Lo que se penaliza es **el momento de gastar**: si el jugador
 * llega a esta jornada condicionado por la Champions y además nadie te lo va a
 * quitar, esperar es gratis y pagar hoy es tirar dinero por una semana mala.
 * Cuando la urgencia es alta la penalización desaparece sola, que es lo
 * correcto: ahí el coste de esperar es perder al jugador.
 */
function computeFitScore(parts: {
  xiGain: number;
  deltaXp: number;
  clauseRatio: number;
  needScore: number;
  pStarter: number | null;
  dataQuality: 'high' | 'medium' | 'low';
  healthy: boolean;
  badNews: boolean;
  affordable: boolean;
  fallingValue: boolean;
  /** 0-100 de `EuropeanOutlook`; 0 si el equipo no juega en Europa. */
  europeanRotationRisk: number;
  /** 0-100: si nadie más puede pagar la cláusula, esperar no cuesta nada. */
  urgency: number;
}): number {
  const xiPart = clamp(parts.xiGain * 9, 0, 45);
  const deltaPart = clamp(parts.deltaXp * 5, 0, 15);
  // Ratio 0.7 o menos → 15 puntos; 1.5 o más → 0.
  const pricePart = clamp((1.5 - parts.clauseRatio) / 0.8, 0, 1) * 15;
  const needPart = parts.needScore * 10;
  const starterPart = (parts.pStarter ?? 0.5) * 10;
  const dataPart = parts.dataQuality === 'high' ? 5 : parts.dataQuality === 'medium' ? 3 : 1;

  let score = xiPart + deltaPart + pricePart + needPart + starterPart + dataPart;
  if (!parts.healthy) score *= 0.4;
  if (parts.badNews) score *= 0.5;
  if (parts.fallingValue) score -= 5;
  if (!parts.affordable) score *= 0.75;

  // Penalización de TIMING por carga europea: máxima con rotación segura y
  // cero riesgo de que te lo quiten; se anula cuando la urgencia aprieta.
  const canWait = clamp((60 - parts.urgency) / 60, 0, 1);
  score -= EUROPEAN_TIMING_PENALTY * clamp(parts.europeanRotationRisk / 100, 0, 1) * canWait;

  return Math.round(clamp(score, 0, 100));
}

/**
 * Urgencia 0-100: probabilidad de que el jugador deje de estar disponible.
 * Manda quién más puede pagar su cláusula ahora mismo, lo barata que está
 * respecto a su valor y el nivel del jugador (a los buenos se los quitan).
 */
function computeUrgency(parts: {
  rivalsThatCanAfford: number;
  totalRivals: number;
  clauseRatio: number;
  xp: number;
  clauseAttackers: number;
}): number {
  const competition = parts.totalRivals > 0 ? parts.rivalsThatCanAfford / parts.totalRivals : 0;
  let urgency = competition * 40;
  urgency += clamp((1.3 - parts.clauseRatio) / 0.6, 0, 1) * 25;
  urgency += clamp(parts.xp / 8, 0, 1) * 20;
  urgency += clamp(parts.clauseAttackers / 2, 0, 1) * 15;
  return Math.round(clamp(urgency, 0, 100));
}

function computeVerdict(fitScore: number, xiGain: number, deltaXp: number, healthy: boolean, badNews: boolean): ClauseVerdict {
  if (!healthy || badNews) return 'avoid';
  if (xiGain <= 0 && deltaXp <= 0) return 'avoid';
  if (fitScore >= 65) return 'top';
  if (fitScore >= 45) return 'good';
  if (fitScore >= 25) return 'situational';
  return 'avoid';
}

/**
 * Plan de financiación: qué jugadores propios vender para llegar a la
 * cláusula. Se venden los que menos aportan y que no son titulares del mejor
 * once. Cada venta suma `0,8 × valor` al presupuesto porque la caja sube el
 * valor íntegro pero el bonus del 20% del valor de plantilla baja.
 */
function buildFundingPlan(missing: number, squadScores: Scored[], baselineStarters: Set<string>): ClauseFundingPlan {
  const sellable = squadScores
    .filter((s) => !baselineStarters.has(s.player.id))
    .sort((a, b) => a.riskAdjustedXp - b.riskAdjustedXp);

  const players: ClauseFundingPlan['players'] = [];
  let raised = 0;

  for (const candidate of sellable) {
    if (raised >= missing || players.length >= MAX_FUNDING_SALES) break;
    const value = Number(candidate.player.marketValue) || 0;
    if (value <= 0) continue;
    players.push({
      id: candidate.player.id,
      nickname: candidate.player.nickname,
      positionName: getPositionName(candidate.player.positionId),
      marketValue: value,
      expectedPoints: round1(candidate.xp),
    });
    raised += Math.floor(value * SALE_BUDGET_FACTOR);
  }

  return {
    players,
    raised,
    shortfall: Math.max(0, missing - raised),
    feasible: raised >= missing,
  };
}

export function buildClauseMarket(input: ClauseMarketInput): ClauseMarketAnalysis {
  const notes: string[] = [];

  if (!input.buyoutClauseEnabled) {
    return {
      enabled: false,
      budget: input.budget,
      targets: [],
      recommended: [],
      upcoming: [],
      combos: [],
      owners: [],
      stats: {
        rivalPlayers: 0,
        available: 0,
        locked: 0,
        shielded: 0,
        affordable: 0,
        bargains: 0,
        bestXiGain: 0,
        cheapestAffordable: null,
        medianClauseRatio: 0,
      },
      baseline: { formation: '-', expectedPoints: 0 },
      notes: ['Esta liga no tiene activada la cláusula de rescisión: no se pueden hacer clausulazos.'],
    };
  }

  const formations = input.formations.length > 0 ? input.formations : ['4,4,2', '4,3,3', '3,5,2', '5,3,2', '4,5,1', '3,4,3'];
  const captainEnabled = input.captainEnabled === true;
  const ownIds = new Set(input.squad.map((tp) => tp.playerMaster.id));

  // --- Referencia: mejor once posible hoy, solo con la plantilla actual ----
  const squadScores = input.squad.map((tp) => scorePlayer(tp.playerMaster, input));
  const basePools = new Map<number, PoolEntry[]>();
  for (const scored of squadScores) {
    if (!scored.eligible) continue;
    const list = basePools.get(scored.player.positionId) || [];
    list.push({ id: scored.player.id, points: scored.riskAdjustedXp });
    basePools.set(scored.player.positionId, list);
  }
  for (const list of basePools.values()) list.sort((a, b) => b.points - a.points);

  const baselineXi = bestXi(basePools, formations, captainEnabled);
  if (!baselineXi) {
    notes.push('No hay jugadores sanos suficientes para formar un once: la mejora del once no se puede calcular.');
  }
  const baselineStarters = baselineXi?.starterIds ?? new Set<string>();
  const squadById = new Map(squadScores.map((s) => [s.player.id, s]));

  // Nivel de reemplazo por posición: media de xP de tus jugadores sanos.
  const referenceByPosition = new Map<number, number>();
  {
    const sum = new Map<number, number>();
    const count = new Map<number, number>();
    for (const scored of squadScores) {
      if (scored.player.playerStatus !== 'ok') continue;
      sum.set(scored.player.positionId, (sum.get(scored.player.positionId) || 0) + scored.xp);
      count.set(scored.player.positionId, (count.get(scored.player.positionId) || 0) + 1);
    }
    for (const [positionId, total] of sum) {
      referenceByPosition.set(positionId, total / Math.max(count.get(positionId) || 1, 1));
    }
  }

  // --- Contexto de rivales: liquidez y comportamiento con las cláusulas ----
  const flowsByManager = marketFlowByManager(input.leagueActivity ?? []);
  const spendingPowerByTeam = new Map<number, number>();
  let clauseAttackers = 0;
  for (const rival of input.rivals) {
    const flow = flowsByManager.get(rival.managerId);
    spendingPowerByTeam.set(rival.teamId, rivalSpendingPower(rival, flow));
    if ((flow?.clauseAttacks ?? 0) > 0) clauseAttackers += 1;
  }

  const needByPosition = new Map(input.ownNeeds.map((n) => [n.positionId, n.needScore]));
  const marketByPlayerId = new Map(input.market.map((m) => [m.playerMaster.id, m]));

  // --- Recorrido de las plantillas rivales -------------------------------
  const targets: ClauseTarget[] = [];
  const upcoming: UpcomingClauseTarget[] = [];
  const owners: OwnerExposure[] = [];

  let rivalPlayers = 0;
  let lockedTotal = 0;
  let shieldedTotal = 0;

  for (const rival of input.rivals) {
    let availableCount = 0;
    let lockedCount = 0;
    let shieldedCount = 0;
    let affordableCount = 0;
    let cheapestClause: number | null = null;
    let totalClauseValue = 0;
    let bestTarget: OwnerExposure['bestTarget'];

    for (const teamPlayer of rival.players) {
      const player = teamPlayer.playerMaster;
      rivalPlayers += 1;
      if (ownIds.has(player.id)) continue;
      if (player.positionId === COACH_POSITION_ID && input.coachEnabled !== true) continue;

      const clause = Number(teamPlayer.buyoutClause) || 0;
      const marketValue = Number(player.marketValue) || 0;
      const protection = getClauseProtection(teamPlayer);
      const owner = { teamId: rival.teamId, managerId: rival.managerId, managerName: rival.managerName };

      if (protection.status !== 'available') {
        if (protection.status === 'locked') {
          lockedCount += 1;
          lockedTotal += 1;
        } else {
          shieldedCount += 1;
          shieldedTotal += 1;
        }

        const scored = scorePlayer(player, input);
        const upcomingExternal = combinedSignal(input.externalSignals[player.id] || []);
        const daysLeft = protection.until
          ? Math.max(0, Math.ceil((Date.parse(protection.until) - Date.now()) / (24 * 60 * 60 * 1000)))
          : undefined;
        upcoming.push({
          playerId: player.id,
          player,
          owner,
          clause,
          marketValue,
          expectedPoints: round1(scored.xp),
          status: protection.status,
          availableAt: protection.until,
          daysLeft: Number.isFinite(daysLeft) ? daysLeft : undefined,
          // Encaje aproximado: sin recálculo del once (todavía no se puede fichar).
          fitScore: computeFitScore({
            xiGain: Math.max(0, scored.xp - (referenceByPosition.get(player.positionId) ?? 0)),
            deltaXp: scored.xp - (referenceByPosition.get(player.positionId) ?? 0),
            clauseRatio: marketValue > 0 ? clause / marketValue : 1,
            needScore: needByPosition.get(player.positionId) ?? 0,
            pStarter: scored.pStarter,
            dataQuality: scored.dataQuality,
            europeanRotationRisk: scored.european?.outlook.rotationRisk ?? 0,
            // Un objetivo que todavía no se puede clausular no compite con
            // nadie hoy: el momento de gastar no está en juego.
            urgency: 0,
            healthy: player.playerStatus === 'ok',
            badNews: upcomingExternal.signal === 'sell' && upcomingExternal.confidence >= BAD_NEWS_CONFIDENCE,
            affordable: clause <= input.budget.available,
            fallingValue: false,
          }),
          affordable: clause > 0 && clause <= input.budget.available,
        });
        continue;
      }

      if (clause <= 0) continue;

      availableCount += 1;
      totalClauseValue += clause;
      if (cheapestClause === null || clause < cheapestClause) cheapestClause = clause;
      const affordable = clause <= input.budget.available;
      if (affordable) affordableCount += 1;

      const scored = scorePlayer(player, input);
      const signals = input.externalSignals[player.id] || [];
      const external = combinedSignal(signals);
      const badNews = external.signal === 'sell' && external.confidence >= BAD_NEWS_CONFIDENCE;
      const healthy = player.playerStatus === 'ok';
      const reference = referenceByPosition.get(player.positionId) ?? 0;
      const deltaXp = scored.xp - reference;

      // Mejora real del once: se recalcula la mejor formación con él dentro.
      let xiGain = 0;
      let replaces: ClauseTarget['replaces'];
      if (baselineXi && scored.eligible) {
        const withPlayer = bestXi(
          poolsWith(basePools, [{ positionId: player.positionId, entry: { id: player.id, points: scored.riskAdjustedXp } }]),
          formations,
          captainEnabled,
        );
        if (withPlayer) {
          xiGain = withPlayer.total - baselineXi.total;
          if (withPlayer.starterIds.has(player.id)) {
            const droppedId = [...baselineStarters].find((id) => !withPlayer.starterIds.has(id));
            const dropped = droppedId ? squadById.get(droppedId) : undefined;
            if (dropped) {
              replaces = {
                id: dropped.player.id,
                nickname: dropped.player.nickname,
                expectedPoints: round1(dropped.xp),
              };
            }
          }
        }
      }
      xiGain = round1(Math.max(0, xiGain));

      const clauseRatio = marketValue > 0 ? clause / marketValue : 1;
      const trend = input.valueTrends?.get(player.id);
      const direction = trendDirection(trend);
      const rivalsThatCanAfford = input.rivals.filter(
        (r) => r.teamId !== rival.teamId && (spendingPowerByTeam.get(r.teamId) ?? 0) >= clause,
      ).length;

      // La urgencia se calcula antes: decide si esperar a que pase la semana
      // europea es gratis o te cuesta el jugador, y eso entra en el encaje.
      const urgency = computeUrgency({
        rivalsThatCanAfford,
        totalRivals: Math.max(input.rivals.length - 1, 1),
        clauseRatio,
        xp: scored.xp,
        clauseAttackers,
      });

      const europeanOutlook = scored.european?.outlook ?? null;
      const fitScore = computeFitScore({
        xiGain,
        deltaXp,
        clauseRatio,
        needScore: needByPosition.get(player.positionId) ?? 0,
        pStarter: scored.pStarter,
        dataQuality: scored.dataQuality,
        healthy,
        badNews,
        affordable,
        fallingValue: direction === 'falling',
        europeanRotationRisk: europeanOutlook?.rotationRisk ?? 0,
        urgency,
      });

      const reasons: string[] = [];
      const warnings: string[] = [];

      if (xiGain > 0.3) {
        reasons.push(
          replaces
            ? `Entra en tu once (+${xiGain.toFixed(1)} pts) y deja fuera a ${replaces.nickname}.`
            : `Mejora tu once titular en +${xiGain.toFixed(1)} pts.`,
        );
      }
      if (deltaXp > 0.5) {
        reasons.push(`Rinde ${deltaXp.toFixed(1)} pts por encima de la media de tus ${getPositionName(player.positionId).toLowerCase()}s.`);
      }
      if (clauseRatio < 0.95) {
        reasons.push(`Cláusula un ${Math.round((1 - clauseRatio) * 100)}% por debajo de su valor de mercado.`);
      }
      if ((needByPosition.get(player.positionId) ?? 0) > 0.3) {
        reasons.push(`Cubre una necesidad en ${getPositionName(player.positionId).toLowerCase()}.`);
      }
      if (scored.pStarter !== null && scored.pStarter >= 0.75) {
        reasons.push(`Titularidad ${Math.round(scored.pStarter * 100)}% en el once probable.`);
      }
      if (direction === 'rising' && trend) {
        reasons.push(`Su valor sube (+${Math.round(trend.pct7d)}% en 7 días).`);
      }
      if (external.signal === 'buy') {
        reasons.push('Las noticias recientes le son favorables.');
      }
      // El resto de presupuesto solo se destaca si el jugador ya interesa por
      // algo: en un objetivo que no aporta nada no es un motivo para ficharlo.
      if (affordable && reasons.length > 0) {
        reasons.push(`Tras pagarla te quedarían ${formatCurrency(input.budget.available - clause)}.`);
      }

      if (!healthy) warnings.push(`Está ${statusText(player.playerStatus)}: no puntuará hasta que se recupere.`);
      if (badNews) {
        const negative = signals.filter((s) => s.signal === 'sell').sort((a, b) => b.confidence - a.confidence)[0];
        warnings.push(`Noticias negativas${negative?.reason ? `: ${negative.reason}` : ''}.`);
      }
      if (scored.source === 'bye-week') warnings.push('Su equipo descansa esta jornada: no sumará puntos.');
      if (scored.pStarter !== null && scored.pStarter < SUBSTITUTE_SCORE) {
        warnings.push(`Suplente en el once probable (${Math.round(scored.pStarter * 100)}% de titularidad).`);
      }
      if (xiGain <= 0 && scored.eligible) warnings.push('No entra en tu mejor once: no mejora tu puntuación de esta jornada.');
      if (clauseRatio > 1.3) warnings.push(`Sobrecoste del ${Math.round((clauseRatio - 1) * 100)}% sobre su valor de mercado.`);
      if (affordable && clause > input.budget.available * 0.85) {
        warnings.push('Te dejaría casi sin presupuesto para el resto del mercado.');
      }
      if (direction === 'falling' && trend) warnings.push(`Su valor baja (${Math.round(trend.pct7d)}% en 7 días).`);

      // Coordinación con Europa: el aviso va en euros, no en puntos, porque la
      // cláusula se paga una vez y la mala semana se pasa.
      if (europeanOutlook && europeanOutlook.rotationRisk >= EUROPEAN_WARNING_RISK) {
        const impact = scored.european!;
        const effect = Math.round((impact.xpMultiplier - 1) * 100);
        if (impact.beneficiary) {
          reasons.push(
            `Su equipo rota por ${europeanOutlook.competitionShortName} y él es de los que entran ` +
              `(+${effect}% de puntos esperados): puntos baratos de una semana europea.`,
          );
        } else {
          const waitable = urgency < 45 && affordable;
          warnings.push(
            `${europeanOutlook.summary} Pagarías ${formatCurrency(clause)} por una jornada en la que ` +
              `${effect < 0 ? `rinde un ${Math.abs(effect)}% menos` : 'su once no está garantizado'}` +
              `${waitable ? '; nadie más puede pagar su cláusula ahora mismo, así que esperar no te cuesta el jugador.' : '.'}`,
          );
        }
      }

      const missingBudget = Math.max(0, clause - input.budget.available);
      const funding = missingBudget > 0 ? buildFundingPlan(missingBudget, squadScores, baselineStarters) : undefined;

      const alsoOnMarketEntry = marketByPlayerId.get(player.id);

      targets.push({
        playerId: player.id,
        player,
        owner,
        clause,
        marketValue,
        clauseRatio: Math.round(clauseRatio * 100) / 100,
        premium: clause - marketValue,
        expectedPoints: round1(scored.xp),
        riskAdjustedXp: round1(scored.riskAdjustedXp),
        pStarter: scored.pStarter,
        expectedMinutes: scored.expectedMinutes,
        starterLabel: starterLabelFrom(scored.pStarter, player),
        dataQuality: scored.dataQuality,
        fixture: scored.fixture,
        european: europeanOutlook,
        deltaXp: round1(deltaXp),
        xiGain,
        replaces,
        costPerXp: xiGain > 0 ? Math.round(clause / xiGain) : Number.POSITIVE_INFINITY,
        pointsPer10M: clause > 0 ? Math.round((scored.xp / (clause / 10_000_000)) * 10) / 10 : 0,
        needScore: needByPosition.get(player.positionId) ?? 0,
        positionName: getPositionName(player.positionId),
        fitScore,
        urgency,
        rivalsThatCanAfford,
        affordable,
        missingBudget,
        funding,
        alsoOnMarket: alsoOnMarketEntry
          ? {
              marketId: alsoOnMarketEntry.id,
              salePrice: Number(alsoOnMarketEntry.salePrice) || 0,
              numberOfBids: alsoOnMarketEntry.numberOfBids || 0,
            }
          : undefined,
        signals,
        valueTrend: trend ? { pct7d: Math.round(trend.pct7d), direction } : undefined,
        reasons,
        warnings,
        verdict: computeVerdict(fitScore, xiGain, deltaXp, healthy, badNews),
      });

      if (!bestTarget || xiGain > bestTarget.xiGain) {
        bestTarget = { playerId: player.id, nickname: player.nickname, xiGain, clause };
      }
    }

    const exposureScore = Math.round(
      clamp((affordableCount / Math.max(rival.players.length, 1)) * 70 + (availableCount / Math.max(rival.players.length, 1)) * 30, 0, 100),
    );

    owners.push({
      teamId: rival.teamId,
      managerId: rival.managerId,
      managerName: rival.managerName,
      teamValue: rival.teamValue,
      squadSize: rival.players.length,
      availableCount,
      lockedCount,
      shieldedCount,
      affordableCount,
      cheapestClause,
      bestTarget,
      totalClauseValue,
      exposureScore,
    });
  }

  targets.sort((a, b) => b.fitScore - a.fitScore || b.xiGain - a.xiGain);
  upcoming.sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999) || b.fitScore - a.fitScore);

  const recommended = targets
    .filter((t) => t.affordable && t.verdict !== 'avoid' && (t.xiGain > 0 || t.deltaXp > 0))
    .slice(0, 5);

  // --- Combos: varios clausulazos que caben a la vez en el presupuesto ----
  const combos: ClauseCombo[] = [];
  if (baselineXi) {
    const pool = targets
      .filter((t) => t.affordable && t.xiGain > 0 && t.verdict !== 'avoid')
      .slice(0, COMBO_POOL);

    const evaluate = (group: ClauseTarget[]): ClauseCombo | null => {
      const totalCost = group.reduce((sum, t) => sum + t.clause, 0);
      if (totalCost > input.budget.available) return null;
      const withGroup = bestXi(
        poolsWith(
          basePools,
          group.map((t) => ({
            positionId: t.player.positionId,
            entry: { id: t.playerId, points: t.riskAdjustedXp },
          })),
        ),
        formations,
        captainEnabled,
      );
      if (!withGroup) return null;
      const totalXiGain = round1(withGroup.total - baselineXi.total);
      if (totalXiGain <= 0) return null;
      return {
        targets: group.map((t) => ({
          playerId: t.playerId,
          nickname: t.player.nickname,
          positionName: t.positionName,
          clause: t.clause,
        })),
        totalCost,
        totalXiGain,
        remainingBudget: input.budget.available - totalCost,
      };
    };

    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        const pair = evaluate([pool[i], pool[j]]);
        if (pair) combos.push(pair);
        for (let k = j + 1; k < pool.length; k++) {
          const triple = evaluate([pool[i], pool[j], pool[k]]);
          if (triple) combos.push(triple);
        }
      }
    }

    combos.sort((a, b) => b.totalXiGain - a.totalXiGain || a.totalCost - b.totalCost);
  }

  owners.sort((a, b) => b.exposureScore - a.exposureScore || b.availableCount - a.availableCount);

  const affordableTargets = targets.filter((t) => t.affordable);
  const ratios = targets.map((t) => t.clauseRatio).sort((a, b) => a - b);
  const medianClauseRatio = ratios.length > 0 ? ratios[Math.floor(ratios.length / 2)] : 0;

  if (targets.length === 0) {
    notes.push('Ahora mismo no hay jugadores rivales con la cláusula libre.');
  } else if (affordableTargets.length === 0) {
    notes.push('Ninguna cláusula libre entra en tu presupuesto: revisa los planes de financiación o espera a vender.');
  }
  notes.push(
    `Al pagar una cláusula el jugador queda protegido ${POST_BUYOUT_PROTECTION_DAYS} días: nadie podrá clausulártelo durante ese tiempo.`,
  );
  if (input.rivals.some((r) => r.teamMoney === null)) {
    notes.push('El dinero de algunos rivales no lo expone la API: su poder de compra se estima con el 20% del valor de su plantilla y su actividad reciente.');
  }

  return {
    enabled: true,
    budget: input.budget,
    targets,
    recommended,
    upcoming: upcoming.slice(0, 20),
    combos: combos.slice(0, MAX_COMBOS),
    owners,
    stats: {
      rivalPlayers,
      available: targets.length,
      locked: lockedTotal,
      shielded: shieldedTotal,
      affordable: affordableTargets.length,
      bargains: targets.filter((t) => t.clauseRatio < 0.9).length,
      bestXiGain: targets.reduce((max, t) => Math.max(max, t.xiGain), 0),
      cheapestAffordable: affordableTargets.length > 0 ? Math.min(...affordableTargets.map((t) => t.clause)) : null,
      medianClauseRatio,
    },
    baseline: {
      formation: baselineXi?.formation ?? '-',
      expectedPoints: round1(baselineXi?.total ?? 0),
    },
    notes,
  };
}
