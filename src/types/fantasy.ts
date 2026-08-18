export interface FantasyUser {
  id: string;
  managerName: string;
  locale: string;
  avatar: string;
  banned: boolean;
  region: { id: string };
}

export interface FantasyTeam {
  id: number;
  money: number;
  teamPoints: number;
  playersNumber: number;
  teamValue: number;
  canPunctuate: boolean;
  position: number | null;
  isAdmin: boolean;
}

export interface FantasyLeague {
  id: string;
  access: 'public' | 'private';
  name: string;
  token?: string;
  description?: string;
  premium: boolean;
  isDuplicated: boolean;
  isSecondRound: boolean;
  managersNumber: number;
  config: {
    features: {
      buyoutClause: boolean;
    };
    premiumFeatures: {
      formations: boolean;
      captain: boolean;
      bench: boolean;
      loan: boolean;
      ideal: boolean;
      coach: boolean;
    };
    premiumConfigurations: {
      loan?: {
        duration: number;
        maxLoans: number;
        enableConclude: boolean;
        minPercentage: number;
      };
      ideal?: {
        reward: number;
      };
    };
  };
  team: FantasyTeam;
}

export interface TeamMoney {
  teamMoney: number;
  teamInvestment: number;
}

export interface PlayerMaster {
  id: string;
  name: string;
  nickname: string;
  slug: string;
  positionId: number;
  position: string;
  teamId: number;
  team?: {
    id: string;
    name: string;
    slug: string;
  };
  playerStatus: 'ok' | 'doubtful' | 'injured' | 'out_of_league' | string;
  lastSeasonPoints: number;
  marketValue: number;
  points: number;
  averagePoints: number;
  images?: {
    transparent?: {
      '256x256': string;
    };
  };
}

export interface TeamPlayer {
  buyoutClause: number;
  managerId: number;
  playerTeamId: string;
  buyoutClauseLockedEndTime?: string;
  isShielded: boolean;
  manager?: {
    id: string;
    managerName: string;
    avatar?: string;
  };
  playerMaster: PlayerMaster;
}

export interface TeamData {
  players: TeamPlayer[];
}

export interface MarketPlayer {
  discr: 'marketPlayerLeague' | 'marketPlayerTeam' | string;
  id: string;
  salePrice: number;
  expirationDate?: string;
  status: string;
  leagueType: string;
  leagueId: number;
  numberOfBids: number;
  numberOfOffers?: number;
  directOffer?: boolean;
  sellerTeam?: {
    manager?: {
      managerName: string;
    };
  };
  playerMaster: PlayerMaster;
}

export interface Formation {
  goalkeeper: { playerMaster: PlayerMaster; buyoutClause: number; playerTeamId: string }[];
  defender: { playerMaster: PlayerMaster; buyoutClause: number; playerTeamId: string }[];
  /** La API oficial usa `midfield`/`striker`; internamente normalizamos a `midfielder`/`attacker`. */
  midfielder: { playerMaster: PlayerMaster; buyoutClause: number; playerTeamId: string }[];
  attacker: { playerMaster: PlayerMaster; buyoutClause: number; playerTeamId: string }[];
  coach?: { playerMaster: PlayerMaster; buyoutClause: number; playerTeamId: string }[];
}

export interface TeamLineup {
  formation: Formation;
}

export interface StandingEntry {
  position: number;
  previousPosition: number;
  points: number;
  livePoints: number;
  team: {
    id: string;
    managerId: number;
    manager: {
      id: string;
      managerName: string;
      avatar?: string;
    };
    teamValue: number;
    teamPoints: number;
    isAdmin: boolean;
    managerWarned: boolean;
    banned: boolean;
  };
}

export interface WeekInfo {
  id: string;
  /** Algunos entornos devuelven la jornada como `number`... */
  number?: number;
  /** ...pero la API actual usa `weekNumber`. */
  weekNumber?: number;
  nextWeek?: number;
  isLive?: boolean;
  openingWeekDate?: string;
  closingWeekDate?: string;
  name?: string;
  matchDay?: string;
  started?: boolean;
  finished?: boolean;
  current?: boolean;
}

export interface Match {
  id: string;
  matchDate: string;
  date: string;
  time: string;
  localId: number;
  visitorId: number;
  matchState: number;
  localScore: number | null;
  visitorScore: number | null;
  featured: boolean;
}

export type EnrichedMatchStatus = 'pending' | 'live' | 'halftime' | 'finished' | 'postponed' | 'canceled' | 'unknown';

export interface MatchEvent {
  type: 'goal' | 'card' | 'substitution' | 'period' | 'injuryTime' | 'other';
  minute: number | null;
  isHome: boolean | null;
  label: string;
  detail?: string;
  /** true si el evento involucra a un jugador de la plantilla del usuario. */
  involvesSquadPlayer?: boolean;
}

export interface EnrichedMatchTeam {
  id: number;
  name: string;
  shortName?: string;
  logoUrl: string;
  score: number | null;
}

export interface SquadPlayerInMatch {
  playerId: string;
  nickname: string;
  position: string;
  teamId: number;
  teamName: string;
  isHome: boolean;
}

export type MatchPhase =
  | 'primera-parte'
  | 'descanso'
  | 'segunda-parte'
  | 'finalizado'
  | 'pendiente'
  | 'desconocido';

export interface MatchLineupPlayer {
  id?: string;
  name: string;
  shortName?: string;
  position?: string;
  number?: string;
  isStarter: boolean;
}

export interface MatchLineupSide {
  teamName: string;
  formation?: string;
  coach?: string;
  starters: MatchLineupPlayer[];
  bench: MatchLineupPlayer[];
}

export interface MatchLineup {
  home: MatchLineupSide;
  away: MatchLineupSide;
}

export interface MatchSummary {
  text: string;
  source: 'generated' | 'external';
  url?: string;
  generatedAt: string;
}

export interface EnrichedMatch {
  id: string;
  eventId: number | null;
  status: EnrichedMatchStatus;
  statusLabel: string;
  phase: MatchPhase;
  minute: number | null;
  startTimestamp: number;
  kickoffFormatted: string;
  home: EnrichedMatchTeam;
  away: EnrichedMatchTeam;
  /** Jugadores de la plantilla del usuario que participan en este partido. */
  squadPlayers: SquadPlayerInMatch[];
  /** Número de jugadores de la plantilla implicados (conveniencia para ordenar). */
  squadPlayerCount: number;
  events: MatchEvent[];
  /** true si el partido es de importancia (≥1 jugador de la plantilla). */
  important: boolean;
  /** Notas sobre calidad/fuente de los datos. */
  notes: string[];
  /** Alineaciones confirmadas por SofaScore, si están disponibles. */
  lineups?: MatchLineup;
  /** Resumen del partido generado a partir de los datos disponibles. */
  summary?: MatchSummary;
}

export interface MatchesResponse {
  week: number;
  generatedAt: string;
  matches: EnrichedMatch[];
  important: EnrichedMatch[];
  normal: EnrichedMatch[];
  notes: string[];
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
}

export interface FantasyCredentials {
  username: string;
  password: string;
}

export type RecommendationType =
  | 'buy'
  | 'sell'
  | 'change_lineup'
  | 'increase_clause'
  | 'decrease_clause'
  | 'captain'
  | 'protect_clause'
  | 'buyout'
  | 'wait'
  | 'watch';

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

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: 'high' | 'medium' | 'low';
  player: PlayerMaster;
  reason: string;
  details?: string;
  estimatedValue?: number;
  suggestedAction?: string;
  recommendedClause?: number;
  riskScore?: number;
  externalSignals?: ExternalSignal[];
  /** Nombre del manager rival propietario (recomendaciones de clausulazo). */
  ownerName?: string;
  /** Precio sugerido para pujar en el mercado (solo recomendaciones de compra). */
  suggestedBidPrice?: number;
  /**
   * Impacto estimado de la acción en puntos esperados (ΔxP de la jornada),
   * en una única escala homogénea para comparar y rankear movimientos.
   */
  impactScore?: number;
  /** Origen de la oportunidad: plantilla propia, mercado o plantilla rival. */
  source?: 'squad' | 'market' | 'rival';
}

export interface LeagueData {
  league: FantasyLeague;
  teamData: TeamData;
  lineup: TeamLineup;
  money: TeamMoney;
  market: MarketPlayer[];
  standing: StandingEntry[];
  week: WeekInfo;
  calendar: Match[];
  allPlayers: PlayerMaster[];
}
