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
