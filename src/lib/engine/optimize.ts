import type { Match } from '../../types/fantasy';
import type { SchemeCandidate, SchemeMove } from '../../types/analysis';
import { computeFormationFronts, type FormationFront, type TacticalSchemeInput } from '../analysis/tactical-scheme';
import { getEngineParams } from './params';

/**
 * Planificador multi-jornada (§5.3 del diseño): planifica fichajes, onces y
 * capitanes varias jornadas por delante maximizando
 *
 *   Σ_w [ puntos del once_w + bonus de capitán_w − fricción × nº movimientos_w ]
 *
 * sujeto a presupuesto dinámico (el dinero no gastado una jornada pasa a la
 * siguiente, siempre bajo la regla efectivo + 20% del valor de plantilla).
 *
 * Implementación: DP sobre los frentes de Pareto (coste, puntos) de cada
 * jornada (los del esquema táctico), con el efectivo como estado. Es la
 * versión exacta del MILP del diseño para este tamaño, sin dependencias
 * externas de solver.
 *
 * Simplificaciones v1 (anotadas en `note`): no se modelan ventas (el dinero
 * solo entra por el crédito semanal), el mercado se asume congelado entre
 * jornadas, y xMins solo usa onces probables de la jornada actual.
 */

/** Tope del frente semanal tras muestrear por coste (el DP crece con su tamaño). */
const FRONT_SAMPLE = 60;
/** Tope de estados del DP por jornada (poda por valor). */
const DP_STATE_CAP = 200;

export interface MultiWeekPlanWeek {
  week: number;
  formation: string;
  starters: SchemeCandidate[];
  captain?: SchemeCandidate;
  moves: SchemeMove[];
  /** Puntos esperados de la jornada incluyendo el bonus de capitán. */
  expectedPoints: number;
  cashAfter: number;
}

export interface MultiWeekPlan {
  weeks: MultiWeekPlanWeek[];
  totalExpected: number;
  totalMoves: number;
  note: string;
}

interface WeekCombo {
  formation: string;
  cost: number;
  points: number;
  members: SchemeCandidate[];
}

interface DpState {
  value: number;
  /** Jugadores comprados en el camino (la plantilla se arrastra entre jornadas). */
  ownedIds: Set<string>;
  path: { combo: WeekCombo; cashAfter: number; ownedIds: Set<string> }[];
}

function captainBonus(members: SchemeCandidate[]): number {
  return members.length > 0 ? Math.max(...members.map((m) => m.expectedPoints)) : 0;
}

/** Muestreo uniforme por coste del frente unido de todas las formaciones. */
function sampleWeekFront(fronts: FormationFront[]): WeekCombo[] {
  const union: WeekCombo[] = fronts.flatMap(({ formation, front }) =>
    front.map((combo) => ({ formation, cost: combo.cost, points: combo.points, members: combo.members })),
  );
  union.sort((a, b) => a.cost - b.cost || b.points - a.points);

  // Pareto: descartar dominados (más caros y con menos puntos).
  const pareto: WeekCombo[] = [];
  let bestPoints = -Infinity;
  for (const combo of union) {
    if (combo.points > bestPoints) {
      pareto.push(combo);
      bestPoints = combo.points;
    }
  }

  if (pareto.length <= FRONT_SAMPLE) return pareto;
  const step = pareto.length / FRONT_SAMPLE;
  return pareto.filter((_, i) => i % step < 1 || i === pareto.length - 1);
}

export function planMultiWeek(
  input: Omit<TacticalSchemeInput, 'calendar'>,
  calendars: { week: number; matches: Match[] }[],
  budgetAvailable: number,
): MultiWeekPlan | undefined {
  // 1. Frente semanal (muestreado) por jornada, con su calendario.
  const weekly = calendars.map(({ week, matches }) => {
    // xMins solo usa onces probables/bajas de la jornada actual.
    const context = input.context
      ? {
          ...input.context,
          weekNumber: week,
          probableLineups: week === input.context.weekNumber ? input.context.probableLineups : undefined,
          injuryReport: week === input.context.weekNumber ? input.context.injuryReport : undefined,
        }
      : undefined;
    const fronts = computeFormationFronts({ ...input, calendar: matches, context });
    return { week, combos: sampleWeekFront(fronts) };
  });

  if (weekly.some((w) => w.combos.length === 0)) return undefined;

  // 2. DP con el efectivo como estado: máximo valor alcanzable por efectivo.
  // La plantilla se arrastra: un jugador comprado en una jornada no vuelve a
  // pagarse en las siguientes (coste efectivo 0 para los ya adquiridos).
  let states = new Map<number, DpState>([[budgetAvailable, { value: 0, ownedIds: new Set(), path: [] }]]);

  for (const { combos } of weekly) {
    const next = new Map<number, DpState>();
    for (const [cash, state] of states) {
      for (const combo of combos) {
        const newMembers = combo.members.filter((m) => m.source !== 'squad' && !state.ownedIds.has(m.player.id));
        const effectiveCost = newMembers.reduce((sum, m) => sum + m.cost, 0);
        if (effectiveCost > cash) continue;

        const gain = combo.points + (input.captainEnabled ? captainBonus(combo.members) : 0) - getEngineParams().moveFrictionXp * newMembers.length;
        const cashAfter = cash - effectiveCost;
        const value = state.value + gain;
        const existing = next.get(cashAfter);
        if (!existing || value > existing.value) {
          const ownedIds = new Set(state.ownedIds);
          for (const m of newMembers) ownedIds.add(m.player.id);
          next.set(cashAfter, { value, ownedIds, path: [...state.path, { combo, cashAfter, ownedIds }] });
        }
      }
    }

    // Poda por valor para acotar el crecimiento de estados.
    if (next.size > DP_STATE_CAP) {
      const sorted = [...next.entries()].sort((a, b) => b[1].value - a[1].value).slice(0, DP_STATE_CAP);
      states = new Map(sorted);
    } else {
      states = next;
    }
    if (states.size === 0) return undefined;
  }

  // 3. Mejor plan completo.
  const best = [...states.values()].reduce((a, b) => (b.value > a.value ? b : a));

  const weeks: MultiWeekPlanWeek[] = best.path.map(({ combo, cashAfter, ownedIds }, i) => {
    const captain = input.captainEnabled && combo.members.length > 0
      ? combo.members.reduce((a, b) => (b.expectedPoints > a.expectedPoints ? b : a))
      : undefined;
    const previouslyOwned = i > 0 ? best.path[i - 1].ownedIds : new Set<string>();
    return {
      week: weekly[i].week,
      formation: combo.formation,
      starters: [...combo.members].sort((a, b) => a.player.positionId - b.player.positionId || b.expectedPoints - a.expectedPoints),
      captain,
      // Solo los fichajes NUEVOS de la jornada (los ya comprados son plantilla).
      moves: combo.members
        .filter((m) => m.source !== 'squad' && !previouslyOwned.has(m.player.id))
        .map((m) => ({
          type: m.source === 'market' ? ('buy_market' as const) : ('pay_clause' as const),
          player: m.player,
          cost: m.cost,
          sellerManagerName: m.sellerManagerName,
        })),
      expectedPoints: Math.round((combo.points + (input.captainEnabled ? captainBonus(combo.members) : 0)) * 10) / 10,
      cashAfter,
    };
  });

  const totalMoves = weeks.reduce((sum, w) => sum + w.moves.length, 0);

  return {
    weeks,
    totalExpected: Math.round(best.value * 10) / 10,
    totalMoves,
    note: 'Plan con compras/clausulazos arrastrados entre jornadas y presupuesto dinámico; sin ventas ni límite de plantilla modelados, mercado congelado y xMins con onces probables solo en la jornada actual.',
  };
}
