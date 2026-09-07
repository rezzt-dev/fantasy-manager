/**
 * Modelo de resultado de partido: Elo → goles esperados → distribución de
 * marcadores. Es la pieza que convierte "contra quién juega" en números con
 * los que se puede razonar (§4.3 del diseño: multiplicadores de fixture).
 *
 * ## Por qué un modelo de goles y no un multiplicador plano
 *
 * Un único factor "rival difícil / rival fácil" aplicado a los puntos totales
 * asume que todos los jugadores sufren igual un mal emparejamiento, y eso es
 * falso: contra un rival muy superior el delantero pierde ocasiones, el
 * defensa encaja más y el portero **para más** (sus paradas compensan en
 * buena parte los goles encajados). Para separar esos efectos hace falta
 * estimar por separado los goles que marca el equipo y los que encaja, que es
 * justo lo que devuelve este módulo.
 *
 * ## Especificación
 *
 * Regresión de Poisson clásica con una sola variable de fuerza por equipo (el
 * rating Elo de ClubElo, que es un rating de terreno neutral):
 *
 *   λ_propio = μ_localía_propia · exp(+ (Elo_propio − Elo_rival) / (2·D))
 *   λ_rival  = μ_localía_rival  · exp(− (Elo_propio − Elo_rival) / (2·D))
 *
 * - `μ` son las medias de goles de la liga por condición (local/visitante).
 *   **Toda la ventaja de campo vive aquí**, no en un bonus de puntos Elo: así
 *   no se cuenta dos veces (§2.1.8) y la ventaja de campo queda expresada en
 *   la unidad en la que se mide de verdad, goles.
 * - `D` (divisor Elo→log-goles) no es una constante inventada: es el valor que
 *   hace que este modelo reproduzca la puntuación esperada de la propia
 *   fórmula Elo, `E = 1/(1+10^(−d/400))`, en campo neutral. Ajustado sobre
 *   d ∈ [−350, +350] (el rango real de LaLiga) el óptimo es D = 220 con un
 *   RMSE de 0.005 en puntuación esperada, es decir, coherencia práctica
 *   exacta con la fuente de los ratings. Sigue siendo calibrable
 *   (`data/engine-params.json`).
 *
 * Sobre las dos Poisson marginales se aplica la corrección de **Dixon-Coles**
 * (τ con ρ = −0.13, el valor del artículo original) para los marcadores bajos:
 * la Poisson independiente subestima 0-0 y 1-1 y sobreestima 1-0 y 0-1, y esos
 * cuatro marcadores son precisamente los que deciden la portería a cero, que
 * es el componente más sensible al rival de porteros y defensas.
 *
 * Referencias: Maher (1982), Dixon & Coles (1997), Karlis & Ntzoufras (2003).
 */

import { getEngineParams } from '../params';

/**
 * Medias de goles por partido de LaLiga por condición (últimas temporadas:
 * ~2.55 goles por partido con ~56% para el local). Definen la ventaja de
 * campo del modelo y el nivel absoluto de goles de la liga.
 */
export const LEAGUE_HOME_GOALS = 1.42;
export const LEAGUE_AWAY_GOALS = 1.13;
/** Media de goles en condición neutral: la referencia de "partido medio". */
export const LEAGUE_NEUTRAL_GOALS = (LEAGUE_HOME_GOALS + LEAGUE_AWAY_GOALS) / 2;

/** ρ de la corrección Dixon-Coles para marcadores bajos (paper original). */
export const DIXON_COLES_RHO = -0.13;

/** Truncamiento de la rejilla de marcadores: P(≥10 goles) es despreciable. */
const MAX_GOALS = 10;

/** Banda de seguridad de λ: ni un 0 imposible ni goleadas irreales. */
const MIN_LAMBDA = 0.25;
const MAX_LAMBDA = 4;

export type Venue = 'home' | 'away' | 'neutral';

export interface ExpectedGoals {
  /** Goles esperados del equipo propio. */
  for: number;
  /** Goles esperados del rival (= goles esperados en contra). */
  against: number;
}

export interface MatchOutcome extends ExpectedGoals {
  pWin: number;
  pDraw: number;
  pLoss: number;
  /** Probabilidad de que el rival no marque (portería a cero propia). */
  pCleanSheet: number;
  /** Probabilidad de encajar 2 o más goles. */
  pConcedeTwoPlus: number;
  /** Diferencia de goles esperada (positiva = favorito). */
  expectedGoalDiff: number;
  /** Puntos esperados del partido en escala 0-3 (3·pWin + pDraw). */
  expectedMatchPoints: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function baselineGoals(venue: Venue): { own: number; opponent: number } {
  if (venue === 'home') return { own: LEAGUE_HOME_GOALS, opponent: LEAGUE_AWAY_GOALS };
  if (venue === 'away') return { own: LEAGUE_AWAY_GOALS, opponent: LEAGUE_HOME_GOALS };
  return { own: LEAGUE_NEUTRAL_GOALS, opponent: LEAGUE_NEUTRAL_GOALS };
}

/**
 * Goles esperados de ambos equipos. La diferencia de Elo se reparte a partes
 * iguales entre "marco más" y "encajo menos": con un solo rating por equipo no
 * hay información para separar ataque y defensa, y repartirla simétricamente
 * es la elección que deja invariante el total de goles del partido.
 */
export function expectedGoalsFromElo(
  eloOwn: number,
  eloOpponent: number,
  venue: Venue,
  divisor?: number,
): ExpectedGoals {
  const eloDivisor = divisor ?? getEngineParams().fixtureEloDivisor;
  const shift = Math.exp((eloOwn - eloOpponent) / (2 * Math.max(eloDivisor, 1)));
  const baseline = baselineGoals(venue);
  return {
    for: clamp(baseline.own * shift, MIN_LAMBDA, MAX_LAMBDA),
    against: clamp(baseline.opponent / shift, MIN_LAMBDA, MAX_LAMBDA),
  };
}

function poissonPmf(k: number, lambda: number): number {
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p = (p * lambda) / i;
  return p;
}

/**
 * Factor τ de Dixon-Coles. Solo toca los cuatro marcadores con ambos equipos
 * en 0 o 1 goles y, por construcción, la masa que quita a unos se la da a
 * otros: la distribución sigue sumando 1 y las marginales apenas se mueven.
 */
function dixonColesTau(x: number, y: number, lambdaFor: number, lambdaAgainst: number, rho: number): number {
  if (x === 0 && y === 0) return 1 - lambdaFor * lambdaAgainst * rho;
  if (x === 0 && y === 1) return 1 + lambdaFor * rho;
  if (x === 1 && y === 0) return 1 + lambdaAgainst * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

/**
 * Distribución conjunta de marcadores (propio × rival) con la corrección
 * Dixon-Coles, normalizada por el truncamiento de la rejilla.
 */
export function scoreDistribution(lambdaFor: number, lambdaAgainst: number, rho = DIXON_COLES_RHO): number[][] {
  const grid: number[][] = [];
  let total = 0;
  for (let own = 0; own <= MAX_GOALS; own++) {
    grid[own] = [];
    for (let opp = 0; opp <= MAX_GOALS; opp++) {
      const p = poissonPmf(own, lambdaFor) * poissonPmf(opp, lambdaAgainst) * dixonColesTau(own, opp, lambdaFor, lambdaAgainst, rho);
      grid[own][opp] = p;
      total += p;
    }
  }
  if (total > 0) {
    for (let own = 0; own <= MAX_GOALS; own++) {
      for (let opp = 0; opp <= MAX_GOALS; opp++) grid[own][opp] /= total;
    }
  }
  return grid;
}

/**
 * Memoización por λ redondeado a dos decimales: el estimador evalúa cientos de
 * jugadores que comparten un puñado de partidos, y la rejilla de marcadores es
 * lo único caro de todo el cálculo.
 */
const outcomeCache = new Map<string, MatchOutcome>();
const OUTCOME_CACHE_LIMIT = 512;

function outcomeFromLambdas(lambdaFor: number, lambdaAgainst: number): MatchOutcome {
  const key = `${lambdaFor.toFixed(2)}:${lambdaAgainst.toFixed(2)}`;
  const cached = outcomeCache.get(key);
  if (cached) return cached;

  const grid = scoreDistribution(lambdaFor, lambdaAgainst);
  let pWin = 0;
  let pDraw = 0;
  let pLoss = 0;
  let pCleanSheet = 0;
  let pConcedeOneOrLess = 0;
  for (let own = 0; own <= MAX_GOALS; own++) {
    for (let opp = 0; opp <= MAX_GOALS; opp++) {
      const p = grid[own][opp];
      if (own > opp) pWin += p;
      else if (own === opp) pDraw += p;
      else pLoss += p;
      if (opp === 0) pCleanSheet += p;
      if (opp <= 1) pConcedeOneOrLess += p;
    }
  }

  const outcome: MatchOutcome = {
    for: lambdaFor,
    against: lambdaAgainst,
    pWin,
    pDraw,
    pLoss,
    pCleanSheet,
    pConcedeTwoPlus: Math.max(0, 1 - pConcedeOneOrLess),
    expectedGoalDiff: lambdaFor - lambdaAgainst,
    expectedMatchPoints: 3 * pWin + pDraw,
  };

  if (outcomeCache.size >= OUTCOME_CACHE_LIMIT) outcomeCache.clear();
  outcomeCache.set(key, outcome);
  return outcome;
}

/** Pronóstico completo de un partido desde los ratings Elo de ambos equipos. */
export function matchOutcomeFromElo(
  eloOwn: number,
  eloOpponent: number,
  venue: Venue,
  divisor?: number,
): MatchOutcome {
  const goals = expectedGoalsFromElo(eloOwn, eloOpponent, venue, divisor);
  return outcomeFromLambdas(goals.for, goals.against);
}

/**
 * Partido de referencia de un equipo: rival medio de la liga en condición
 * neutral. Es el baseline correcto contra el que medir un emparejamiento
 * concreto, porque las medias por 90' de un jugador se han acumulado justo
 * sobre esa mezcla de rivales (mitad en casa, mitad fuera, rival medio).
 */
export function referenceOutcomeFromElo(eloOwn: number, eloLeagueMean: number, divisor?: number): MatchOutcome {
  return matchOutcomeFromElo(eloOwn, eloLeagueMean, 'neutral', divisor);
}

/**
 * Media de los ratings Elo disponibles: el "equipo medio" de la liga. Se
 * memoiza por mapa porque el estimador la necesita una vez por jugador y el
 * mapa es el mismo objeto durante toda la petición.
 */
const leagueMeanCache = new WeakMap<Map<number, number>, number | null>();

export function leagueMeanElo(eloByTeamId: Map<number, number>): number | null {
  const cached = leagueMeanCache.get(eloByTeamId);
  if (cached !== undefined) return cached;
  const values = [...eloByTeamId.values()].filter((elo) => Number.isFinite(elo));
  const mean = values.length === 0 ? null : values.reduce((sum, elo) => sum + elo, 0) / values.length;
  leagueMeanCache.set(eloByTeamId, mean);
  return mean;
}
