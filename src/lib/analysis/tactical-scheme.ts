import type { Match, MarketPlayer, PlayerMaster, TeamMoney, TeamPlayer } from '../../types/fantasy';
import type {
  BudgetBreakdown,
  RivalTeam,
  SchemeCandidate,
  SchemeMove,
  TacticalScheme,
} from '../../types/analysis';
import { estimatePoints, estimatePointsDetailed, type EstimatorContext } from '../recommendations/points-estimator';
import { combinedSignal } from '../recommendations/external-intelligence';
import { isSuspended } from '../engine/features/minutes';

const BAD_NEWS_CONFIDENCE = 0.6;
const COACH_POSITION_ID = 5;
/** Candidatos extra por posición sobre el máximo que puede pedir una formación. */
const POSITION_POOL_MARGIN = 4;
/** Tope de seguridad del frente de Pareto al combinar posiciones. */
const FRONTIER_CAP = 400;

export interface TacticalSchemeInput {
  squad: TeamPlayer[];
  market: MarketPlayer[];
  rivals: RivalTeam[];
  money: TeamMoney;
  /** Valor de plantilla (league.team.teamValue), para el bonus del 20%. */
  teamValue: number;
  /** league.config.features.buyoutClause: si la liga permite clausulazos. */
  buyoutClauseEnabled: boolean;
  calendar: Match[];
  /** Formaciones libres de la API: "defensas,centrocampistas,delanteros". */
  formations: string[];
  context?: EstimatorContext;
  /** Suma de pujas activas propias (la API no la expone hoy; 0 por defecto). */
  activeBidsTotal?: number;
  /** league.config.premiumFeatures.captain: el capitán duplica puntos. */
  captainEnabled?: boolean;
}

/**
 * Presupuesto real disponible para fichar, según la fórmula documentada del
 * juego: efectivo + 20% del valor de plantilla (redondeado a la baja) menos
 * las pujas activas.
 */
export function computeAvailableBudget(
  money: TeamMoney,
  teamValue: number,
  activeBidsTotal = 0,
): BudgetBreakdown {
  const cash = Number(money?.teamMoney) || 0;
  const teamValueBonus = Math.floor((Number(teamValue) || 0) * 0.2);
  const activeBids = Math.max(0, Number(activeBidsTotal) || 0);
  const available = Math.max(0, cash + teamValueBonus - activeBids);
  return { cash, teamValueBonus, activeBids, available, spent: 0, remaining: available };
}

/**
 * Confianza (0-1) en la estimación de un jugador según los datos disponibles:
 * media de la temporada en curso, minutos reales por jornada, noticias
 * externas y puntos de la temporada pasada. Con pocas fuentes, la estimación
 * se encoge hacia la media de su posición para no fiarse de datos ruidosos.
 */
export function estimateConfidence(player: PlayerMaster, context?: EstimatorContext): number {
  let confidence = 0;
  if ((Number(player.averagePoints) || 0) > 0) confidence += 0.35;
  const starter = context?.starterInfo?.[player.id];
  if (starter?.source === 'minutes') confidence += 0.35;
  else if (starter?.source === 'last-season') confidence += 0.15;
  if ((context?.externalSignals?.[player.id] || []).length > 0) confidence += 0.15;
  if ((Number(player.lastSeasonPoints) || 0) > 0) confidence += 0.15;
  return clamp(confidence, 0.4, 1);
}

/**
 * Construye el pool de candidatos: plantilla propia (coste 0), mercado
 * (salePrice) y jugadores de rivales clausulables (buyoutClause, si la liga
 * lo permite y no están blindados). Aplica el filtro de salud del optimizer
 * (sanos y sin noticias muy negativas), deduplica por jugador quedándose con
 * la vía más barata, descarta los inasequibles y poda por posición.
 */
export function buildCandidates(
  input: Pick<
    TacticalSchemeInput,
    'squad' | 'market' | 'rivals' | 'buyoutClauseEnabled' | 'calendar' | 'formations' | 'context'
  > & { budget: number },
): { candidates: SchemeCandidate[]; squadOnlyExpected: number | undefined } {
  const { squad, market, rivals, buyoutClauseEnabled, calendar, formations, context, budget } = input;

  const ownIds = new Set(squad.map((tp) => tp.playerMaster.id));
  const byId = new Map<string, SchemeCandidate>();

  const addCandidate = (
    player: PlayerMaster,
    source: SchemeCandidate['source'],
    cost: number,
    sellerManagerName?: string,
  ) => {
    if (player.positionId === COACH_POSITION_ID) return;
    const existing = byId.get(player.id);
    if (existing && existing.cost <= cost) return;
    byId.set(player.id, {
      player,
      source,
      cost,
      expectedPoints: 0,
      rawExpectedPoints: 0,
      confidence: 0,
      pStarter: null,
      sellerManagerName,
    });
  };

  for (const tp of squad) addCandidate(tp.playerMaster, 'squad', 0);

  for (const mp of market) {
    if (ownIds.has(mp.playerMaster.id)) continue;
    addCandidate(
      mp.playerMaster,
      'market',
      Number(mp.salePrice) || 0,
      mp.sellerTeam?.manager?.managerName,
    );
  }

  if (buyoutClauseEnabled) {
    for (const rival of rivals) {
      for (const tp of rival.players) {
        if (ownIds.has(tp.playerMaster.id) || tp.isShielded) continue;
        const clause = Number(tp.buyoutClause) || 0;
        if (clause <= 0) continue;
        addCandidate(tp.playerMaster, 'clause', clause, rival.managerName);
      }
    }
  }

  // Filtro de salud: sanos (no suspendidos), sin noticias muy negativas. Si
  // con los sanos no se cubre ninguna formación, se relaja para lesionados/
  // dudosos, pero los suspendidos nunca entran en el pool.
  const all = [...byId.values()];
  const healthy = all.filter((c) => isHealthy(c.player, context));
  const pool = canFillAnyFormation(healthy, formations)
    ? healthy
    : all.filter((c) => !isSuspended(c.player, context?.injuryReport) && (c.source === 'squad' || isHealthy(c.player, context)));

  // Estimación y confianza por jugador. El modelo ya aplica shrinkage
  // jerárquico con priors posición×tier (§4.5): no hay segundo encogimiento
  // (el baseline circular del pool de candidatos queda eliminado).
  // expectedPoints = xP penalizado por riesgo (xP − λσ) para la selección.
  for (const c of pool) {
    const prediction = estimatePointsDetailed(c.player, calendar, context);
    c.rawExpectedPoints = prediction.xp;
    c.confidence = estimateConfidence(c.player, context);
    c.expectedPoints = prediction.riskAdjustedXp;
    c.pStarter = prediction.pStarter;
  }

  // Referencia sin fichajes: mejor once solo con la plantilla. Se calcula
  // ANTES de podar, sobre todos los propios elegibles del pool.
  const squadOnlyExpected = bestSquadOnlyTotal(
    pool.filter((c) => c.source === 'squad'),
    formations,
  );

  const byPosition = groupByPosition(pool);

  // Poda por posición, tratando propios y externos por separado:
  // - Propios (coste 0): siempre se conservan hasta el tope; aunque un
  //   externo puntúe más, el propio es gratis y puede ganar en el frente
  //   de Pareto coste/puntos cuando el presupuesto aprieta.
  // - Externos: solo si son asequibles y mejoran al último propio que
  //   entraría en el once de su posición (si faltan propios, pasan todos).
  const maxNeeded = maxNeededByPosition(formations);
  const result: SchemeCandidate[] = [];
  for (const [positionId, list] of byPosition) {
    list.sort((a, b) => b.expectedPoints - a.expectedPoints);
    const needed = maxNeeded.get(positionId) ?? 0;
    const ownSorted = list.filter((c) => c.source === 'squad');
    const threshold =
      ownSorted.length >= needed && needed > 0 ? ownSorted[needed - 1].expectedPoints : -Infinity;

    const ownKept = ownSorted.slice(0, needed + POSITION_POOL_MARGIN);
    const externalKept = list
      .filter((c) => c.source !== 'squad')
      .filter((c) => c.cost <= budget && c.expectedPoints > threshold)
      .slice(0, needed + POSITION_POOL_MARGIN);
    result.push(...ownKept, ...externalKept);
  }

  return { candidates: result, squadOnlyExpected };
}

/**
 * Calcula el esquema táctico (formación + once) que maximiza los puntos
 * esperados de la próxima jornada sin superar el presupuesto disponible,
 * pudiendo incluir fichajes del mercado y clausulazos a rivales.
 *
 * Para cada formación se enumeran las combinaciones por posición (pool ya
 * podado) y se combinan sus frentes de Pareto (coste, puntos) bajo la
 * restricción de presupuesto. Gana la formación con mayor suma ajustada.
 */
export function computeTacticalScheme(input: TacticalSchemeInput): TacticalScheme | undefined {
  const { money, teamValue, activeBidsTotal, calendar, formations, context, captainEnabled } = input;

  const budget = computeAvailableBudget(money, teamValue, activeBidsTotal);
  const { candidates, squadOnlyExpected } = buildCandidates({ ...input, budget: budget.available });
  if (candidates.length === 0 || squadOnlyExpected === undefined) return undefined;

  let best: { formation: string; combo: Combo } | undefined;
  for (const { formation, front } of computeFormationFronts(input)) {
    const top = front.reduce((a, b) => (b.points > a.points ? b : a));
    if (!best || top.points > best.combo.points) {
      best = { formation, combo: top };
    }
  }

  if (!best) return undefined;

  const starters = [...best.combo.members].sort(
    (a, b) => a.player.positionId - b.player.positionId || b.expectedPoints - a.expectedPoints,
  );
  const spent = starters.reduce((sum, c) => sum + c.cost, 0);
  budget.spent = spent;
  budget.remaining = Math.max(0, budget.available - spent);

  const moves: SchemeMove[] = starters
    .filter((c) => c.source !== 'squad')
    .map((c) => ({
      type: c.source === 'market' ? ('buy_market' as const) : ('pay_clause' as const),
      player: c.player,
      cost: c.cost,
      sellerManagerName: c.sellerManagerName,
    }))
    .sort((a, b) => b.cost - a.cost);

  // Capitán co-optimizado (§5.2): el bonus del mejor titular suma al objetivo.
  // Ambos totales (con y sin fichajes) incluyen su bonus para que la mejora
  // sea comparable.
  const captain = captainEnabled && starters.length > 0 ? starters.reduce((a, b) => (b.expectedPoints > a.expectedPoints ? b : a)) : undefined;
  const captainBonus = captain?.expectedPoints ?? 0;
  const squadOnlyBonus = captainEnabled ? Math.max(0, ...candidates.filter((c) => c.source === 'squad').map((c) => c.expectedPoints)) : 0;
  const squadOnlyTotal = squadOnlyExpected + squadOnlyBonus;
  const totalExpected = round1(best.combo.points + captainBonus);

  return {
    formation: best.formation,
    starters,
    captain: captain?.player,
    totalExpected,
    squadOnlyExpected: round1(squadOnlyTotal),
    improvement: round1(best.combo.points + captainBonus - squadOnlyTotal),
    budget,
    moves,
    dataQuality: computeDataQuality(starters, input),
    candidatesConsidered: candidates.length,
  };
}

function isHealthy(player: PlayerMaster, context?: EstimatorContext): boolean {
  if (player.playerStatus !== 'ok') return false;
  if (isSuspended(player, context?.injuryReport)) return false;
  const external = combinedSignal(context?.externalSignals?.[player.id] || []);
  return !(external.signal === 'sell' && external.confidence >= BAD_NEWS_CONFIDENCE);
}

/** true si el pool cubre al menos una de las formaciones dadas. */
function canFillAnyFormation(candidates: SchemeCandidate[], formations: string[]): boolean {
  const countByPosition = new Map<number, number>();
  for (const c of candidates) {
    countByPosition.set(c.player.positionId, (countByPosition.get(c.player.positionId) || 0) + 1);
  }
  for (const formation of formations) {
    const [def, mid, att] = parseFormation(formation);
    if (![def, mid, att].every((n) => Number.isFinite(n))) continue;
    if (
      (countByPosition.get(1) || 0) >= 1 &&
      (countByPosition.get(2) || 0) >= def &&
      (countByPosition.get(3) || 0) >= mid &&
      (countByPosition.get(4) || 0) >= att
    ) {
      return true;
    }
  }
  return false;
}

/** Mejor once usando solo la plantilla (todo cuesta 0: top-k por posición). */
function bestSquadOnlyTotal(candidates: SchemeCandidate[], formations: string[]): number | undefined {
  const ownByPosition = new Map<number, SchemeCandidate[]>();
  for (const c of candidates) {
    if (c.source !== 'squad') continue;
    const list = ownByPosition.get(c.player.positionId) || [];
    list.push(c);
    ownByPosition.set(c.player.positionId, list);
  }
  for (const list of ownByPosition.values()) {
    list.sort((a, b) => b.expectedPoints - a.expectedPoints);
  }

  let best: number | undefined;
  for (const formation of formations) {
    const [defCount, midCount, attCount] = parseFormation(formation);
    if (![defCount, midCount, attCount].every((n) => Number.isFinite(n))) continue;
    const gks = ownByPosition.get(1) || [];
    const defs = ownByPosition.get(2) || [];
    const mids = ownByPosition.get(3) || [];
    const atts = ownByPosition.get(4) || [];
    if (gks.length < 1 || defs.length < defCount || mids.length < midCount || atts.length < attCount) continue;
    const total =
      sumTop(gks, 1) + sumTop(defs, defCount) + sumTop(mids, midCount) + sumTop(atts, attCount);
    if (best === undefined || total > best) best = total;
  }
  return best;
}

function computeDataQuality(
  starters: SchemeCandidate[],
  input: TacticalSchemeInput,
): TacticalScheme['dataQuality'] {
  const avgConfidence =
    starters.reduce((sum, c) => sum + c.confidence, 0) / Math.max(starters.length, 1);
  const level = avgConfidence >= 0.75 ? 'high' : avgConfidence >= 0.6 ? 'medium' : 'low';

  const notes: string[] = [];
  const withCurrentSeason = starters.filter((c) => (Number(c.player.averagePoints) || 0) > 0).length;
  if (withCurrentSeason === 0) {
    notes.push('Sin datos de la temporada en curso: las estimaciones se apoyan en la temporada pasada.');
  }
  const starterInfoCount = Object.keys(input.context?.starterInfo || {}).length;
  if (starterInfoCount === 0) {
    notes.push('Sin datos de minutos por jornada: titularidad estimada por puntos de la temporada pasada.');
  }
  if (Object.keys(input.context?.externalSignals || {}).length === 0) {
    notes.push('Sin noticias externas: no se aplican ajustes por lesiones o sanciones de prensa.');
  }
  if ((input.activeBidsTotal ?? 0) === 0) {
    notes.push('Presupuesto = efectivo + 20% del valor de plantilla (pujas activas no descontadas).');
  }

  return { level, notes };
}

interface Combo {
  cost: number;
  points: number;
  members: SchemeCandidate[];
}

/** Frente de una formación: combos Pareto-óptimos (coste ↑, puntos ↑). */
export interface FormationFront {
  formation: string;
  front: Combo[];
}

/**
 * Frentes de Pareto (coste, puntos) por formación para la semana del input.
 * Es la pieza compartida entre el esquema táctico de una jornada y el
 * planificador multi-jornada (§5.3).
 */
export function computeFormationFronts(input: TacticalSchemeInput): FormationFront[] {
  const { money, teamValue, activeBidsTotal, calendar, formations, context } = input;

  const budget = computeAvailableBudget(money, teamValue, activeBidsTotal);
  const { candidates } = buildCandidates({ ...input, budget: budget.available });
  if (candidates.length === 0) return [];

  const byPosition = groupByPosition(candidates);
  const fronts: FormationFront[] = [];

  for (const formation of formations) {
    const [defCount, midCount, attCount] = parseFormation(formation);
    if (![defCount, midCount, attCount].every((n) => Number.isFinite(n))) continue;

    const groups = [
      combos(byPosition.get(1) || [], 1),
      combos(byPosition.get(2) || [], defCount),
      combos(byPosition.get(3) || [], midCount),
      combos(byPosition.get(4) || [], attCount),
    ];
    if (groups.some((g) => g.length === 0)) continue;

    let frontier = pareto(groups[0], budget.available);
    for (let i = 1; i < groups.length; i++) {
      frontier = pareto(combineFrontiers(frontier, groups[i], budget.available), budget.available);
      if (frontier.length === 0) break;
    }
    if (frontier.length === 0) continue;

    fronts.push({ formation: `${defCount}-${midCount}-${attCount}`, front: frontier });
  }

  return fronts;
}

/** Enumeración de combinaciones de tamaño k sobre el pool podado de una posición. */
function combos(candidates: SchemeCandidate[], k: number): Combo[] {
  if (k <= 0) return [{ cost: 0, points: 0, members: [] }];
  if (candidates.length < k) return [];

  const out: Combo[] = [];
  const picked: SchemeCandidate[] = [];

  const walk = (start: number, cost: number, points: number) => {
    if (picked.length === k) {
      out.push({ cost, points, members: [...picked] });
      return;
    }
    for (let i = start; i <= candidates.length - (k - picked.length); i++) {
      picked.push(candidates[i]);
      walk(i + 1, cost + candidates[i].cost, points + candidates[i].expectedPoints);
      picked.pop();
    }
  };
  walk(0, 0, 0);
  return out;
}

/** Media de probabilidad de titularidad de un combo (ignora nulls). */
function comboPStarter(combo: Combo): number {
  const values = combo.members.map((m) => m.pStarter).filter((v): v is number => v !== null);
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}

/**
 * Frente de Pareto (coste ↑, puntos ↑): descarta combos dominados (más
 * caros y con menos puntos que otro) y los que superan el presupuesto.
 * Como desempate se prefiere el combo con mayor titularidad media: evita
 * recomendar suplentes cuando hay opciones de puntos similares.
 */
function pareto(list: Combo[], budget: number): Combo[] {
  const sorted = list
    .filter((c) => c.cost <= budget)
    .sort((a, b) => a.cost - b.cost || b.points - a.points || comboPStarter(b) - comboPStarter(a));

  const front: Combo[] = [];
  let bestPoints = -Infinity;
  for (const combo of sorted) {
    if (combo.points > bestPoints) {
      front.push(combo);
      bestPoints = combo.points;
    }
  }

  // Tope de seguridad: si el frente crece demasiado, muestreo uniforme por coste.
  if (front.length > FRONTIER_CAP) {
    const step = front.length / FRONTIER_CAP;
    return front.filter((_, i) => i % step < 1 || i === front.length - 1);
  }
  return front;
}

function combineFrontiers(a: Combo[], b: Combo[], budget: number): Combo[] {
  const out: Combo[] = [];
  for (const x of a) {
    for (const y of b) {
      const cost = x.cost + y.cost;
      if (cost > budget) continue;
      out.push({ cost, points: x.points + y.points, members: [...x.members, ...y.members] });
    }
  }
  return out;
}

function groupByPosition(candidates: SchemeCandidate[]): Map<number, SchemeCandidate[]> {
  const map = new Map<number, SchemeCandidate[]>();
  for (const c of candidates) {
    const list = map.get(c.player.positionId) || [];
    list.push(c);
    map.set(c.player.positionId, list);
  }
  return map;
}

function maxNeededByPosition(formations: string[]): Map<number, number> {
  const max = new Map<number, number>([
    [1, 1],
    [2, 0],
    [3, 0],
    [4, 0],
  ]);
  for (const formation of formations) {
    const [def, mid, att] = parseFormation(formation);
    if (![def, mid, att].every((n) => Number.isFinite(n))) continue;
    max.set(2, Math.max(max.get(2)!, def));
    max.set(3, Math.max(max.get(3)!, mid));
    max.set(4, Math.max(max.get(4)!, att));
  }
  return max;
}

function parseFormation(formation: string): number[] {
  return formation.split(',').map((n) => parseInt(n, 10));
}

function sumTop(list: SchemeCandidate[], k: number): number {
  return list.slice(0, k).reduce((sum, c) => sum + c.expectedPoints, 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
