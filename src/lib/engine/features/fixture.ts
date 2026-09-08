/**
 * Ajuste por emparejamiento de la jornada (§4.3 del diseño).
 *
 * Sustituye al multiplicador único de fixture (y, antes de él, al proxy de
 * "valor de mercado agregado" con un efecto máximo de ±8% que §2.1.6 daba por
 * insuficiente) por un ajuste **por componentes**:
 *
 *   1. `match-model.ts` convierte los ratings Elo en goles esperados a favor y
 *      en contra, y de ahí en probabilidades de resultado y de portería a cero.
 *   2. `fixture-components.ts` dice de qué componente sale cada punto de un
 *      jugador y con qué elasticidad responde ese componente al partido.
 *   3. Aquí se combinan: el multiplicador de un jugador es la media de los
 *      multiplicadores de sus componentes, ponderada por lo que cada uno
 *      aporta a sus puntos.
 *
 * La referencia contra la que se mide el partido es el **rival medio de la
 * liga en campo neutral**, porque es la mezcla de rivales sobre la que se han
 * acumulado las medias por 90' del jugador. Así el ajuste mide solo la
 * desviación del emparejamiento concreto y no vuelve a contar la calidad del
 * equipo, que ya está dentro de sus propias medias.
 *
 * El resultado no es un número único por partido: contra un rival muy
 * superior el delantero pierde alrededor de un 25% de puntos esperados, el
 * defensa algo más, y el portero se queda casi igual porque las paradas
 * compensan los goles encajados. Ese es justo el matiz que un multiplicador
 * plano destruye.
 */

import type { Match } from '../../../types/fantasy';
import type { FixtureDifficultyLabel, FixtureOutlook } from '../../../types/analysis';
import { getEngineParams } from '../params';
import {
  COMPONENT_SPECS,
  RESULT_SENSITIVITY,
  priorSharesForPosition,
  type ComponentShares,
  type FixtureComponent,
} from './fixture-components';
import {
  leagueMeanElo,
  matchOutcomeFromElo,
  referenceOutcomeFromElo,
  type MatchOutcome,
} from './match-model';

/**
 * Banda del multiplicador neto. No es el efecto que se busca (los componentes
 * ya traen el suyo), sino una barandilla ante ratings Elo degenerados o
 * repartos de puntos absurdos. Se deja holgada a propósito: en el
 * emparejamiento más desigual que da LaLiga (400 puntos de Elo de diferencia,
 * líder contra colista) el neto de un defensa baja a 0.64 y el de un delantero
 * del favorito sube a 1.33, así que la barandilla no debe estar tocando esos
 * casos reales.
 */
const MIN_NET_MULTIPLIER = 0.55;
const MAX_NET_MULTIPLIER = 1.5;

/** Posiciones de campo para la media por equipo (el entrenador va aparte). */
const FIELD_POSITIONS = [1, 2, 3, 4];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface FixtureAdjustment {
  /** Multiplicador neto sobre los puntos esperados del jugador. */
  multiplier: number;
  /** Multiplicador de cada componente (trazabilidad y explicación al usuario). */
  byComponent: Record<FixtureComponent, number>;
  /** Pronóstico del partido concreto. */
  outcome: MatchOutcome;
  /** Partido de referencia: rival medio en campo neutral. */
  reference: MatchOutcome;
  /** 0-100, 100 = emparejamiento más duro posible. */
  difficulty: number;
  label: FixtureDifficultyLabel;
}

/** Multiplicador de un componente frente al partido de referencia. */
function componentMultiplier(component: FixtureComponent, outcome: MatchOutcome, reference: MatchOutcome): number {
  const spec = COMPONENT_SPECS[component];
  let raw: number;
  switch (spec.driver) {
    case 'goalsFor':
      raw = (outcome.for / reference.for) ** spec.elasticity;
      break;
    case 'goalsAgainst':
      raw = (outcome.against / reference.against) ** spec.elasticity;
      break;
    case 'cleanSheet':
      raw = reference.pCleanSheet > 0 ? outcome.pCleanSheet / reference.pCleanSheet : 1;
      break;
    case 'result':
      raw = 1 + RESULT_SENSITIVITY * (outcome.expectedMatchPoints - reference.expectedMatchPoints);
      break;
    default:
      raw = 1;
  }
  return clamp(Number.isFinite(raw) ? raw : 1, spec.min, spec.max);
}

/**
 * Dificultad 0-100 del emparejamiento para el equipo, independiente de la
 * posición del jugador: son los puntos esperados del partido (0-3) vueltos del
 * revés. 50 es un partido de puro trámite equilibrado.
 */
export function difficultyFromOutcome(outcome: MatchOutcome): number {
  return Math.round(clamp(100 * (1 - outcome.expectedMatchPoints / 3), 0, 100));
}

export function difficultyLabel(difficulty: number): FixtureDifficultyLabel {
  if (difficulty <= 25) return 'Muy favorable';
  if (difficulty <= 42) return 'Favorable';
  if (difficulty <= 58) return 'Equilibrado';
  if (difficulty <= 75) return 'Difícil';
  return 'Muy difícil';
}

export interface FixtureInput {
  eloOwn: number;
  eloOpponent: number;
  /**
   * Elo del propio equipo **sin ajustes de coyuntura** (carga europea). Define
   * el partido de referencia y por defecto es `eloOwn`.
   *
   * La distinción importa: la referencia representa las condiciones en las que
   * el jugador acumuló sus medias por 90', es decir su equipo en estado
   * normal. Si se bajara también el Elo de la referencia, el modelo compararía
   * "equipo cansado contra rival" con "equipo cansado contra rival medio" y el
   * efecto de la rotación se cancelaría casi entero.
   */
  eloOwnBaseline?: number;
  /** Elo del equipo medio de la liga: define el partido de referencia. */
  eloLeagueMean: number;
  isHome: boolean;
  /** Reparto de puntos del jugador por componente (suma 1). */
  shares: ComponentShares;
  /** Overrides de calibración (backtesting walk-forward). */
  eloDivisor?: number;
  dampening?: number;
}

/**
 * Ajuste completo del emparejamiento para un jugador concreto.
 *
 * `dampening` (calibrable) escala el efecto teórico: 1 lo aplica entero, 0 lo
 * anula. Es el parámetro honesto que decide el backtesting, porque el modelo
 * de goles es sólido pero la traducción a puntos de fantasy tiene ruido que
 * solo se mide con track record propio.
 */
export function fixtureAdjustment(input: FixtureInput): FixtureAdjustment {
  const params = getEngineParams();
  const eloDivisor = input.eloDivisor ?? params.fixtureEloDivisor;
  const dampening = input.dampening ?? params.fixtureDampening;

  const outcome = matchOutcomeFromElo(input.eloOwn, input.eloOpponent, input.isHome ? 'home' : 'away', eloDivisor);
  const reference = referenceOutcomeFromElo(input.eloOwnBaseline ?? input.eloOwn, input.eloLeagueMean, eloDivisor);

  const byComponent = {} as Record<FixtureComponent, number>;
  let net = 0;
  for (const component of Object.keys(COMPONENT_SPECS) as FixtureComponent[]) {
    const multiplier = componentMultiplier(component, outcome, reference);
    byComponent[component] = multiplier;
    net += (input.shares[component] ?? 0) * multiplier;
  }

  // El amortiguador se aplica sobre la desviación respecto a 1, no como
  // exponente: el neto es una media ponderada y puede tener cuotas negativas.
  const damped = 1 + dampening * (net - 1);
  const difficulty = difficultyFromOutcome(outcome);

  return {
    multiplier: clamp(Number.isFinite(damped) ? damped : 1, MIN_NET_MULTIPLIER, MAX_NET_MULTIPLIER),
    byComponent,
    outcome,
    reference,
    difficulty,
    label: difficultyLabel(difficulty),
  };
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Vista de un ajuste lista para la API y la interfaz. */
export function toFixtureOutlook(
  teamId: number,
  opponentTeamId: number,
  isHome: boolean,
  adjustment: FixtureAdjustment,
  extra?: { multiplierByPosition?: Record<number, number> },
): FixtureOutlook {
  return {
    teamId,
    opponentTeamId,
    isHome,
    difficulty: adjustment.difficulty,
    label: adjustment.label,
    pWin: round3(adjustment.outcome.pWin),
    pDraw: round3(adjustment.outcome.pDraw),
    pLoss: round3(adjustment.outcome.pLoss),
    expectedGoalsFor: round3(adjustment.outcome.for),
    expectedGoalsAgainst: round3(adjustment.outcome.against),
    pCleanSheet: round3(adjustment.outcome.pCleanSheet),
    multiplier: round3(adjustment.multiplier),
    multiplierByPosition: extra?.multiplierByPosition,
    source: 'elo',
  };
}

/**
 * Pronóstico de la jornada para todos los equipos que juegan, con el efecto
 * por posición ya resuelto. Se calcula una vez por petición y sirve tanto para
 * la interfaz (dificultad del calendario) como para explicar cada
 * recomendación sin recalcular nada.
 */
export function buildFixtureOutlooks(input: {
  calendar: Match[];
  eloByTeamId: Map<number, number>;
  /** positionId -> cuotas observadas; sin ellas se usan los priors. */
  sharesByPosition?: Map<number, ComponentShares>;
}): Map<number, FixtureOutlook> {
  const outlooks = new Map<number, FixtureOutlook>();
  const eloLeagueMean = leagueMeanElo(input.eloByTeamId);
  if (eloLeagueMean === null) return outlooks;

  for (const match of input.calendar) {
    for (const [teamId, opponentTeamId, isHome] of [
      [match.localId, match.visitorId, true] as const,
      [match.visitorId, match.localId, false] as const,
    ]) {
      const eloOwn = input.eloByTeamId.get(teamId);
      const eloOpponent = input.eloByTeamId.get(opponentTeamId);
      if (eloOwn === undefined || eloOpponent === undefined) continue;

      const multiplierByPosition: Record<number, number> = {};
      let teamAdjustment: FixtureAdjustment | null = null;
      for (const positionId of FIELD_POSITIONS) {
        const shares = input.sharesByPosition?.get(positionId) ?? priorSharesForPosition(positionId);
        const adjustment = fixtureAdjustment({ eloOwn, eloOpponent, eloLeagueMean, isHome, shares });
        multiplierByPosition[positionId] = round3(adjustment.multiplier);
        teamAdjustment ??= adjustment;
      }
      if (!teamAdjustment) continue;

      const average =
        FIELD_POSITIONS.reduce((sum, positionId) => sum + multiplierByPosition[positionId], 0) / FIELD_POSITIONS.length;
      outlooks.set(
        teamId,
        toFixtureOutlook(teamId, opponentTeamId, isHome, { ...teamAdjustment, multiplier: average }, { multiplierByPosition }),
      );
    }
  }

  return outlooks;
}
