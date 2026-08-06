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
} from './fantasy';
import type { LeagueActivityEvent } from '../lib/fantasy/activity';

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
  expectedPoints: number;
  isHome: boolean;
  isHealthy: boolean;
  score: number;
  reasoning: string;
}

export interface CaptainRecommendation {
  captain: CaptainCandidate;
  alternatives: CaptainCandidate[];
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
  /** Cambios sugeridos respecto a la alineación actual. */
  changes: { out: PlayerMaster; in: PlayerMaster }[];
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
