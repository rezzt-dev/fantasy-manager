import type {
  FantasyLeague,
  TeamData,
  TeamLineup,
  TeamMoney,
  MarketPlayer,
  StandingEntry,
  PlayerMaster,
  Match,
  WeekInfo,
  TeamPlayer,
  FixtureOutlook,
} from './fantasy';
import type { LeagueActivityEvent } from '../lib/fantasy/activity';

export type { FixtureDifficultyLabel, FixtureOutlook } from './fantasy';

export type NewsCategory =
  | 'injury'
  | 'illness'
  | 'suspension'
  | 'doubt'
  | 'return'
  | 'form'
  | 'rotation'
  | 'transfer';

export interface ExternalSignal {
  source: string;
  signal: 'buy' | 'sell' | 'hold';
  confidence: number;
  reason: string;
  category?: NewsCategory;
  url?: string;
  publishedAt?: string;
}

export interface RivalTeam {
  teamId: number;
  managerId: number;
  managerName: string;
  teamValue: number;
  /** Dinero disponible del rival; null si la API no lo expone (403 suave). */
  teamMoney: number | null;
  players: TeamPlayer[];
}

export interface RivalNeed {
  teamId: number;
  managerId: number;
  managerName: string;
  positionId: number;
  positionName: string;
  needScore: number; // 0-1, cuánto necesita un jugador de esa posición
}

export interface ClauseRiskAnalysis {
  playerId: string;
  nickname: string;
  currentClause: number;
  marketValue: number;
  riskScore: number; // 0-100
  rivalsThatCanAfford: number;
  rivalNeedScore: number; // 0-1, máxima necesidad entre rivales
  recommendedClause: number;
  reasoning: string;
}

export interface CaptainCandidate {
  player: PlayerMaster;
  /** xP de la jornada. Como el brazalete duplica, es también el bonus. */
  expectedPoints: number;
  /** xP penalizado por riesgo (xP − λσ): suelo razonable de la apuesta. */
  floorPoints: number;
  /** Puntos extra que aporta el brazalete sobre la puntuación sin capitán. */
  captainBonus: number;
  /** Puntos totales que sumaría el jugador con el brazalete puesto (×2). */
  totalWithArmband: number;
  /** Score de decisión: mezcla de media y suelo (ver `recommendCaptain`). */
  score: number;
  /** Probabilidad de titularidad (submodelo xMins); null si no computable. */
  pStarter: number | null;
  /** null cuando su equipo no juega esta jornada. */
  isHome: boolean | null;
  /** Emparejamiento de la jornada; null si descansa o no hay Elo. */
  fixture: FixtureOutlook | null;
  /** false en jornada de descanso: el brazalete se perdería. */
  hasFixture: boolean;
  isHealthy: boolean;
  /** Solidez de los datos con los que se ha estimado su xP. */
  confidence: 'high' | 'medium' | 'low';
  /** Está en el once oficial que LaLiga tiene guardado ahora mismo. */
  inCurrentLineup: boolean;
  /** Está en el mejor once recomendado por el optimizador. */
  inOptimalLineup: boolean;
  /** Avisos que rebajan la confianza en el brazalete (no puntúan, informan). */
  risks: string[];
  reasoning: string;
}

export interface CaptainRecommendation {
  captain: CaptainCandidate;
  alternatives: CaptainCandidate[];
  /** ΔxP de acertar el brazalete frente a la mejor alternativa del mismo once. */
  gainOverAlternative: number;
  /** Capitán del "mejor once" cuando no coincide con el del once actual. */
  optimalCaptain?: CaptainCandidate;
  /** Once del que se ha elegido: oficial, recomendado o plantilla suelta. */
  pool: 'lineup' | 'optimal' | 'squad';
  /** false si la liga no tiene la feature premium de capitán activada. */
  enabled: boolean;
  /** Score por jugador de toda la plantilla: permite coronar cualquier once. */
  scoreByPlayerId: Record<string, number>;
}

export interface PositionNeed {
  positionId: number;
  positionName: string;
  ownCount: number;
  ownHealthyCount: number;
  recommendedMin: number;
  needScore: number; // 0-1
}

export interface StarterInfo {
  playerId: string;
  score: number; // 0-1, probabilidad de que sea titular habitual en su equipo real
  label: 'Titular' | 'Habitual' | 'Rotación' | 'Suplente';
  source: 'minutes' | 'last-season';
}

export interface OptimalLineupEntry {
  player: PlayerMaster;
  expectedPoints: number;
}

export interface OptimalLineup {
  /** Formación ganadora, p. ej. "4-4-2". */
  formation: string;
  starters: OptimalLineupEntry[];
  bench: OptimalLineupEntry[];
  /** Capitán co-optimizado (solo si la liga tiene la feature activada). */
  captain?: OptimalLineupEntry;
  totalExpected: number;
  currentExpected: number;
  improvement: number;
  /** Cambios sugeridos respecto a la alineación actual. Cada lado puede
   *  estar ausente cuando la alineación actual está incompleta (solo entrada)
   *  o sobran jugadores para la formación elegida (solo salida). */
  changes: { out?: PlayerMaster; in?: PlayerMaster }[];
  /** true si no había suficientes jugadores sanos y se han incluido jugadores con dudas. */
  degraded?: boolean;
}

export interface LeagueAggregates {
  totalLeagueValue: number;
  totalMoneyAvailable: number;
  totalPlayers: number;
  playersOnSale: number;
  injuredPlayers: number;
  averageTeamValue: number;
  averageTeamPoints: number;
  positionDistribution: Record<number, { name: string; count: number; color: string }>;
}

export interface LeagueAnalysis {
  league: FantasyLeague;
  teamData: TeamData;
  lineup: TeamLineup;
  money: TeamMoney;
  market: MarketPlayer[];
  standing: StandingEntry[];
  week: WeekInfo;
  calendar: Match[];
  allPlayers: PlayerMaster[];
  rivals: RivalTeam[];
  rivalNeeds: RivalNeed[];
  ownNeeds: PositionNeed[];
  clauseRisks: ClauseRiskAnalysis[];
  captain?: CaptainRecommendation;
  optimalLineup?: OptimalLineup;
  aggregates: LeagueAggregates;
  externalSignals: Record<string, ExternalSignal[]>; // playerId -> signals
  starterInfo: Record<string, StarterInfo>; // playerId -> titularidad habitual
  /** Actividad reciente de mercado de la liga (liquidez y comportamiento rival). */
  leagueActivity?: LeagueActivityEvent[];
}

export type SchemeCandidateSource = 'squad' | 'market' | 'clause';

export interface SchemeCandidate {
  player: PlayerMaster;
  source: SchemeCandidateSource;
  /** Coste de adquisición: 0 si ya es nuestro, salePrice en mercado, buyoutClause en clausulazo. */
  cost: number;
  /** Puntos esperados ajustados por confianza (los que usa el optimizador). */
  expectedPoints: number;
  /** Puntos esperados sin ajustar (salida directa de estimatePoints). */
  rawExpectedPoints: number;
  /** Solidez del dato (0-1) según fuentes disponibles para el jugador. */
  confidence: number;
  /** Probabilidad de ser titular en la jornada (0-1); null si no se ha computado. */
  pStarter: number | null;
  sellerManagerName?: string;
}

export interface SchemeMove {
  type: 'buy_market' | 'pay_clause';
  player: PlayerMaster;
  cost: number;
  sellerManagerName?: string;
}

export interface BudgetBreakdown {
  cash: number;
  teamValueBonus: number;
  activeBids: number;
  available: number;
  spent: number;
  remaining: number;
}

export interface TacticalScheme {
  /** Formación ganadora, p. ej. "4-4-2". */
  formation: string;
  /** Once titular ordenado por posición. */
  starters: SchemeCandidate[];
  /** Capitán co-optimizado (solo si la liga tiene la feature activada). */
  captain?: PlayerMaster;
  totalExpected: number;
  /** Mejor once posible solo con la plantilla actual (referencia sin fichajes). */
  squadOnlyExpected: number;
  /** Mejora del esquema con fichajes respecto al mejor once sin fichajes. */
  improvement: number;
  budget: BudgetBreakdown;
  /** Fichajes/clausulazos necesarios para montar el esquema. */
  moves: SchemeMove[];
  /** Coherencia con la cantidad de datos disponibles al estimar. */
  dataQuality: { level: 'high' | 'medium' | 'low'; notes: string[] };
  candidatesConsidered: number;
}

// ---------------------------------------------------------------------------
// Predicción de puntuación por equipo de liga (sección Puntuación)
// ---------------------------------------------------------------------------

export interface PredictedPlayerScore {
  player: PlayerMaster;
  xp: number;
  expectedPoints: number;
  riskAdjustedXp: number;
  expectedMinutes: number | null;
  pStarter: number | null;
  source: string;
  isCaptain: boolean;
  isCoach: boolean;
}

export interface PredictedLineup {
  formation: string;
  starters: PredictedPlayerScore[];
  bench: PredictedPlayerScore[];
  captain?: PredictedPlayerScore;
  coach?: PredictedPlayerScore;
  fieldExpected: number;
  captainBonus: number;
  coachPoints: number;
  benchExpected: number;
  totalExpected: number;
  dataQuality: { level: 'high' | 'medium' | 'low'; notes: string[] };
  degraded: boolean;
  inferred: boolean;
}

export interface CoachPrediction {
  teamId: number;
  expectedPoints: number;
  source: 'elo-result' | 'last-season' | 'fallback';
  notes: string[];
}

export interface TeamScorePrediction {
  teamId: number;
  managerId: number;
  managerName: string;
  teamValue: number;
  predictedLineup: PredictedLineup;
  coachPrediction: CoachPrediction;
}

export interface ScorePredictionsResponse {
  week: number;
  leagueId: string;
  generatedAt: string;
  coachEnabled: boolean;
  captainEnabled: boolean;
  benchEnabled: boolean;
  predictions: TeamScorePrediction[];
  notes: string[];
}

// ---------------------------------------------------------------------------
// Clausulazos (sección Mercado → Clausulazos)
// ---------------------------------------------------------------------------

/** Veredicto final sobre un objetivo de clausulazo. */
export type ClauseVerdict = 'top' | 'good' | 'situational' | 'avoid';

export interface ClauseOwner {
  teamId: number;
  managerId: number;
  managerName: string;
}

/** Jugadores propios que habría que vender para llegar a la cláusula. */
export interface ClauseFundingPlan {
  players: { id: string; nickname: string; positionName: string; marketValue: number; expectedPoints: number }[];
  /** Presupuesto extra que aportaría el plan (venta = caja +V, valor −V ⇒ +0,8V). */
  raised: number;
  /** Lo que seguiría faltando después de vender (0 si el plan es suficiente). */
  shortfall: number;
  feasible: boolean;
}

export interface ClauseTarget {
  playerId: string;
  player: PlayerMaster;
  owner: ClauseOwner;
  clause: number;
  marketValue: number;
  /** cláusula / valor de mercado: <1 es una ganga, >1 sobrecoste. */
  clauseRatio: number;
  /** Euros por encima (o por debajo, en negativo) del valor de mercado. */
  premium: number;
  expectedPoints: number;
  riskAdjustedXp: number;
  pStarter: number | null;
  expectedMinutes: number | null;
  starterLabel: string;
  dataQuality: 'high' | 'medium' | 'low';
  /** Emparejamiento de la jornada de su equipo real. */
  fixture?: FixtureOutlook | null;
  /** ΔxP frente al nivel medio de tu plantilla en esa posición. */
  deltaXp: number;
  /** ΔxP real del once titular si lo fichas (con la mejor formación posible). */
  xiGain: number;
  /** Titular propio al que desplazaría del once. */
  replaces?: { id: string; nickname: string; expectedPoints: number };
  /** Euros por cada punto que suma al once (Infinity si no mejora el once). */
  costPerXp: number;
  /** Puntos esperados por cada 10 M€ de cláusula. */
  pointsPer10M: number;
  needScore: number;
  positionName: string;
  /** Encaje global 0-100 con tu equipo, presupuesto y jornada. */
  fitScore: number;
  /** 0-100: riesgo de perder la oportunidad (rivales que pueden pagarla). */
  urgency: number;
  rivalsThatCanAfford: number;
  affordable: boolean;
  /** Euros que faltan para poder pagar la cláusula (0 si es asequible). */
  missingBudget: number;
  funding?: ClauseFundingPlan;
  /** El mismo jugador está también en el mercado (a veces más barato). */
  alsoOnMarket?: { marketId: string; salePrice: number; numberOfBids: number };
  signals: ExternalSignal[];
  valueTrend?: { pct7d: number; direction: 'rising' | 'falling' | 'flat' };
  reasons: string[];
  warnings: string[];
  verdict: ClauseVerdict;
}

/** Jugador rival que hoy no se puede clausular pero volverá a estarlo. */
export interface UpcomingClauseTarget {
  playerId: string;
  player: PlayerMaster;
  owner: ClauseOwner;
  clause: number;
  marketValue: number;
  expectedPoints: number;
  status: 'locked' | 'shielded';
  /** Fecha ISO en la que se libera la cláusula (solo en `locked`). */
  availableAt?: string;
  daysLeft?: number;
  fitScore: number;
  affordable: boolean;
}

/** Combinación de clausulazos que caben a la vez en el presupuesto. */
export interface ClauseCombo {
  targets: { playerId: string; nickname: string; positionName: string; clause: number }[];
  totalCost: number;
  /** ΔxP conjunto del once (no es la suma de los ΔxP individuales). */
  totalXiGain: number;
  remainingBudget: number;
}

/** Exposición de cada rival: cuánto de su plantilla es clausulable hoy. */
export interface OwnerExposure {
  teamId: number;
  managerId: number;
  managerName: string;
  teamValue: number;
  squadSize: number;
  availableCount: number;
  lockedCount: number;
  shieldedCount: number;
  affordableCount: number;
  cheapestClause: number | null;
  bestTarget?: { playerId: string; nickname: string; xiGain: number; clause: number };
  /** Suma de las cláusulas disponibles hoy. */
  totalClauseValue: number;
  /** 0-100: cuánto valor puedes arrebatarle ahora mismo. */
  exposureScore: number;
}

export interface ClauseMarketStats {
  rivalPlayers: number;
  available: number;
  locked: number;
  shielded: number;
  affordable: number;
  bargains: number;
  bestXiGain: number;
  cheapestAffordable: number | null;
  medianClauseRatio: number;
}

export interface ClauseMarketAnalysis {
  /** false si la liga no tiene la feature de cláusulas activada. */
  enabled: boolean;
  budget: BudgetBreakdown;
  targets: ClauseTarget[];
  recommended: ClauseTarget[];
  upcoming: UpcomingClauseTarget[];
  combos: ClauseCombo[];
  owners: OwnerExposure[];
  stats: ClauseMarketStats;
  /** Mejor once alcanzable hoy sin fichar (referencia de los ΔxP). */
  baseline: { formation: string; expectedPoints: number };
  notes: string[];
}

export interface ClauseMarketResponse {
  generatedAt: string;
  week: number;
  leagueId: string;
  clauseMarket: ClauseMarketAnalysis;
}
