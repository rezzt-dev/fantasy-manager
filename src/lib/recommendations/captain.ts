import type { PlayerMaster, TeamPlayer } from '../../types/fantasy';
import type { CaptainCandidate, CaptainRecommendation, LeagueAnalysis, OptimalLineup } from '../../types/analysis';
import { estimatePointsDetailed, type EstimatorContext } from './points-estimator';
import { combinedSignal } from './external-intelligence';
import { isSuspended } from '../engine/features/minutes';
import { resolveTeamId } from '../engine/model';

const COACH_POSITION_ID = 5;
const BAD_NEWS_CONFIDENCE = 0.6;
const MAX_ALTERNATIVES = 3;

/**
 * Peso de la media (xP) frente al suelo (xP − λσ) en el score de decisión.
 *
 * El brazalete duplica los puntos, así que en valor esperado puro la mejor
 * elección es simplemente el mayor xP: E[2X] = 2·E[X]. Pero es una apuesta
 * única e irreversible (no hay banquillo que la rescate), así que entre dos
 * jugadores con la misma media preferimos al de suelo más alto. Es la misma
 * lógica que ya usa el optimizador de once (§5.2), no una re-aplicación de
 * los factores de contexto: localía, rival, estado, titularidad y noticias
 * ya están dentro de xP una sola vez (§2.1.8).
 */
const EV_WEIGHT = 0.7;

/** Por debajo de esta probabilidad de ser titular, el brazalete es una apuesta. */
const ROTATION_RISK_PSTARTER = 0.6;
/** Riesgo de rotación europea a partir del cual el brazalete lleva aviso. */
const EUROPEAN_CAPTAIN_RISK = 40;

/** A partir de esta dificultad de emparejamiento (0-100) se avisa al usuario. */
const HARD_FIXTURE_DIFFICULTY = 62;

const STARTER_TEXT: Record<string, string> = {
  Titular: 'titular indiscutible',
  Habitual: 'titular habitual',
  'Rotación': 'entra en rotaciones',
  Suplente: 'suplente habitual',
};

interface CaptainOptions {
  /** Once óptimo ya calculado: amplía el pool y permite sugerir su capitán. */
  optimalLineup?: OptimalLineup;
  /** `league.config.premiumFeatures.captain`: si la liga permite capitán. */
  enabled?: boolean;
}

/**
 * Recomendación de capitán de la jornada.
 *
 * Evalúa toda la plantilla (no solo el once guardado, que LaLiga devuelve
 * incompleto a menudo) y elige el brazalete dentro del once que el usuario va
 * a jugar de verdad: el oficial si existe, el recomendado si no.
 *
 * Devuelve además `scoreByPlayerId` con toda la plantilla para que la UI pueda
 * coronar al mejor de cualquier once que esté mostrando, incluso después de
 * que el usuario haga cambios manuales.
 */
export function recommendCaptain(
  analysis: LeagueAnalysis,
  estimatorContext?: EstimatorContext,
  options?: CaptainOptions,
): CaptainRecommendation | undefined {
  const { lineup, calendar, teamData, externalSignals, starterInfo } = analysis;
  const optimalLineup = options?.optimalLineup;

  const currentEntries = [
    ...(lineup?.formation.goalkeeper || []),
    ...(lineup?.formation.defender || []),
    ...(lineup?.formation.midfielder || []),
    ...(lineup?.formation.attacker || []),
  ];
  const currentIds = new Set(currentEntries.map((e) => e.playerMaster.id));
  const optimalIds = new Set((optimalLineup?.starters || []).map((e) => e.player.id));

  // Universo: plantilla + cualquier jugador del once oficial que no se haya
  // podido cruzar con ella (la API de alineación es más laxa que la de equipo).
  const universe = new Map<string, PlayerMaster>();
  for (const tp of (teamData?.players || []) as TeamPlayer[]) {
    universe.set(tp.playerMaster.id, tp.playerMaster);
  }
  for (const entry of currentEntries) {
    if (!universe.has(entry.playerMaster.id)) universe.set(entry.playerMaster.id, entry.playerMaster);
  }

  const evaluated = [...universe.values()]
    .filter((player) => player.positionId !== COACH_POSITION_ID)
    .map((player) =>
      buildCandidate(player, {
        estimatorContext,
        externalSignals,
        starterInfo,
        calendar,
        inCurrentLineup: currentIds.has(player.id),
        inOptimalLineup: optimalIds.has(player.id),
      }),
    );

  if (evaluated.length === 0) return undefined;

  const scoreByPlayerId: Record<string, number> = {};
  for (const candidate of evaluated) scoreByPlayerId[candidate.player.id] = round2(candidate.score);

  const byScore = (a: CaptainCandidate, b: CaptainCandidate) => b.score - a.score;

  // El brazalete se pone en el once que se va a jugar: el oficial si LaLiga ya
  // tiene uno guardado, y si no el recomendado. Solo si no hay ninguno se
  // ordena la plantilla entera.
  const currentPool = evaluated.filter((c) => c.inCurrentLineup).sort(byScore);
  const optimalPool = evaluated.filter((c) => c.inOptimalLineup).sort(byScore);
  const { pool, ranked } =
    currentPool.length > 0
      ? { pool: 'lineup' as const, ranked: currentPool }
      : optimalPool.length > 0
        ? { pool: 'optimal' as const, ranked: optimalPool }
        : { pool: 'squad' as const, ranked: [...evaluated].sort(byScore) };

  const captain = pickBest(ranked);
  if (!captain) return undefined;

  const alternatives = ranked.filter((c) => c.player.id !== captain.player.id).slice(0, MAX_ALTERNATIVES);
  const bestAlternative = alternatives[0];

  // Ganancia de acertar: los puntos del capitán se duplican, así que la
  // diferencia de xP frente a la mejor alternativa son puntos reales de más.
  const gainOverAlternative = round1(
    bestAlternative ? Math.max(0, captain.expectedPoints - bestAlternative.expectedPoints) : captain.expectedPoints,
  );

  // Si el mejor once propone otro brazalete, se enseña: al aplicar la
  // alineación recomendada el capitán del once oficial puede dejar de estar.
  const optimalBest = pickBest(optimalPool);
  const optimalCaptain = optimalBest && optimalBest.player.id !== captain.player.id ? optimalBest : undefined;

  return {
    captain,
    alternatives,
    gainOverAlternative,
    optimalCaptain,
    pool,
    enabled: options?.enabled === true,
    scoreByPlayerId,
  };
}

/**
 * Mejor candidato disponible. El filtro de disponibilidad solo ordena (un
 * capitán tiene que jugar); nunca vuelve a penalizar puntos, que ya están
 * ajustados en el estimador.
 */
function pickBest(ranked: CaptainCandidate[]): CaptainCandidate | undefined {
  return (
    ranked.find((c) => c.hasFixture && c.isHealthy) ??
    ranked.find((c) => c.hasFixture) ??
    ranked[0]
  );
}

interface CandidateInput {
  estimatorContext?: EstimatorContext;
  externalSignals: LeagueAnalysis['externalSignals'];
  starterInfo: LeagueAnalysis['starterInfo'];
  calendar: LeagueAnalysis['calendar'];
  inCurrentLineup: boolean;
  inOptimalLineup: boolean;
}

function buildCandidate(player: PlayerMaster, input: CandidateInput): CaptainCandidate {
  const { estimatorContext, externalSignals, starterInfo, calendar, inCurrentLineup, inOptimalLineup } = input;

  const prediction = estimatePointsDetailed(player, calendar, estimatorContext);
  const expectedPoints = round1(prediction.xp);
  const floorPoints = round1(prediction.riskAdjustedXp);

  const teamId = resolveTeamId(player);
  const homeMatch = teamId !== undefined ? calendar.find((m) => m.localId === teamId) : undefined;
  const awayMatch = teamId !== undefined ? calendar.find((m) => m.visitorId === teamId) : undefined;
  // Sin calendario no podemos afirmar que descanse: se asume que juega.
  const hasFixture = calendar.length === 0 || teamId === undefined || Boolean(homeMatch || awayMatch);
  const isHome = homeMatch ? true : awayMatch ? false : null;

  const suspended = isSuspended(player, estimatorContext?.injuryReport);
  const isHealthy = player.playerStatus === 'ok' && !suspended;
  const external = combinedSignal(externalSignals?.[player.id] || []);
  const hasBadNews = external.signal === 'sell' && external.confidence >= BAD_NEWS_CONFIDENCE;
  const starter = starterInfo?.[player.id];

  const score = EV_WEIGHT * prediction.xp + (1 - EV_WEIGHT) * prediction.riskAdjustedXp;

  const risks: string[] = [];
  // El emparejamiento ya está dentro del xP; aquí solo se explica, porque un
  // brazalete es una apuesta única y el usuario merece saber contra quién va.
  const fixture = prediction.fixture;
  if (fixture && fixture.difficulty >= HARD_FIXTURE_DIFFICULTY) {
    risks.push(
      `Emparejamiento ${fixture.label.toLowerCase()}: ${Math.round(fixture.pLoss * 100)}% de derrota y ` +
        `${Math.round((1 - fixture.multiplier) * 100)}% menos de puntos esperados por el rival.`,
    );
  }
  if (!hasFixture) risks.push('Su equipo descansa esta jornada: el brazalete se perdería.');
  if (suspended) risks.push('Está sancionado y no puede jugar.');
  else if (player.playerStatus === 'injured') risks.push('Está lesionado.');
  else if (player.playerStatus === 'doubtful') risks.push('Es duda para la jornada.');
  if (hasBadNews) risks.push('Noticias negativas recientes sobre el jugador.');
  if (prediction.pStarter !== null && prediction.pStarter < ROTATION_RISK_PSTARTER) {
    risks.push(`Solo ${Math.round(prediction.pStarter * 100)}% de probabilidad de ser titular.`);
  }
  if (prediction.dataQuality.level === 'low') {
    risks.push('Pocos datos para estimar su puntuación con confianza.');
  }
  // El brazalete es la apuesta más cara de la jornada y la rotación europea es
  // el escenario que más veces la arruina: o juega 90' o no juega.
  const european = prediction.european;
  if (european && !european.beneficiary && european.outlook.rotationRisk >= EUROPEAN_CAPTAIN_RISK) {
    risks.push(
      `${european.outlook.summary} Un brazalete a un jugador al que pueden reservar es la apuesta más cara de fallar.`,
    );
  }

  return {
    player,
    expectedPoints,
    floorPoints,
    captainBonus: expectedPoints,
    totalWithArmband: round1(prediction.xp * 2),
    score: round2(score),
    pStarter: prediction.pStarter,
    isHome,
    fixture: prediction.fixture,
    hasFixture,
    isHealthy,
    confidence: prediction.dataQuality.level,
    inCurrentLineup,
    inOptimalLineup,
    risks,
    reasoning: buildReasoning({ expectedPoints, hasFixture, isHome, prediction, starter }),
  };
}

function buildReasoning(input: {
  expectedPoints: number;
  hasFixture: boolean;
  isHome: boolean | null;
  prediction: ReturnType<typeof estimatePointsDetailed>;
  starter?: LeagueAnalysis['starterInfo'][string];
}): string {
  const { expectedPoints, hasFixture, isHome, prediction, starter } = input;
  const parts: string[] = [`${expectedPoints.toFixed(1)} pts esperados (${(expectedPoints * 2).toFixed(1)} con brazalete)`];

  if (!hasFixture) parts.push('su equipo descansa');
  else if (isHome === true) parts.push('juega en casa');
  else if (isHome === false) parts.push('juega fuera');

  if (prediction.fixture) {
    parts.push(`emparejamiento ${prediction.fixture.label.toLowerCase()} (${prediction.fixture.difficulty}/100)`);
  }

  if (starter) parts.push(STARTER_TEXT[starter.label] ?? starter.label.toLowerCase());
  else if (prediction.pStarter !== null) parts.push(`${Math.round(prediction.pStarter * 100)}% de titularidad`);

  if (prediction.pointsStdDev !== null) parts.push(`regularidad ±${prediction.pointsStdDev.toFixed(1)}`);

  return parts.join(' · ');
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
