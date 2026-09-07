import type { StrategyReport } from '../../types/strategy';
import type {
  FantasyLeague,
  TeamData,
  TeamLineup,
  TeamMoney,
  MarketPlayer,
  StandingEntry,
  WeekInfo,
  Match,
  PlayerMaster,
  Recommendation,
  MatchesResponse,
  TeamCatalogEntry,
  FixtureOutlook,
} from '../../types/fantasy';
import type {
  CaptainRecommendation,
  ClauseMarketResponse,
  LeagueAnalysis,
  TacticalScheme,
  ScorePredictionsResponse,
} from '../../types/analysis';
import type { ScoreHistoryRecord } from '../engine/score-predictions-persistence';
import type { TrackRecordSummary } from '../engine/track-record';
import type { MultiWeekPlan } from '../engine/optimize';

export interface TrackRecordResponse {
  generatedAt: string;
  week: number;
  summary: TrackRecordSummary;
  walkForward: {
    computedAt: string;
    leagueId: string;
    week: number;
    samples: number;
    maeLegacy: number | null;
    maeV1: number | null;
    note: string;
    trackRecord?: { settled: number; maeXp: number | null; maeLegacy: number | null };
  } | null;
  calibration: {
    status: 'ok' | 'insufficient-data';
    samples?: number;
    best?: { shrinkageK: number; fixtureDampening: number; mae: number };
    note?: string;
  } | null;
  notes: string[];
}

const API_BASE = '';

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errorJson = await res.json();
      if (errorJson && typeof errorJson === 'object') {
        message = errorJson.message || errorJson.error || errorJson.description || message;
      }
    } catch {
      try {
        const text = await res.clone().text();
        if (text) message = text;
      } catch {}
    }
    throw new Error(message);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  return res.text() as unknown as Promise<T>;
}

const CMP = '/v1/competition/1';

/**
 * La API oficial de LaLiga Fantasy usa `midfield`/`striker` en la formación,
 * mientras que este proyecto usa internamente `midfielder`/`attacker`.
 */
function normalizeFormation(lineup: TeamLineup): TeamLineup {
  const formation = lineup.formation as any;
  return {
    ...lineup,
    formation: {
      goalkeeper: formation.goalkeeper || [],
      defender: formation.defender || [],
      midfielder: formation.midfielder || formation.midfield || [],
      attacker: formation.attacker || formation.striker || [],
      coach: formation.coach || [],
    },
  };
}

function countFieldPlayers(lineup: TeamLineup): number {
  const f = lineup?.formation;
  if (!f) return 0;
  return (
    (f.goalkeeper?.length || 0) +
    (f.defender?.length || 0) +
    (f.midfielder?.length || 0) +
    (f.attacker?.length || 0)
  );
}

// Keep existing fantasyAPI for compatibility with read-only callers
export const fantasyAPI = {
  getLeagues: () => fetchJSON<FantasyLeague[]>(`/api/proxy${CMP}/leagues?x-lang=es`),

  getTeamData: (leagueId: string, teamId: number) =>
    fetchJSON<TeamData>(`/api/proxy${CMP}/leagues/${leagueId}/teams/${teamId}?x-lang=es`),

  getTeamLineup: (teamId: number) =>
    fetchJSON<TeamLineup>(`/api/proxy${CMP}/teams/${teamId}/lineup?x-lang=es`).then(normalizeFormation),

  getTeamLineupByWeek: (teamId: number, week: number) =>
    fetchJSON<TeamLineup>(`/api/proxy${CMP}/teams/${teamId}/lineup/week/${week}?x-lang=es`).then(normalizeFormation),

  getTeamLineupByLeague: (leagueId: string, teamId: number) =>
    fetchJSON<TeamLineup>(`/api/proxy${CMP}/leagues/${leagueId}/teams/${teamId}/lineup?x-lang=es`).then(normalizeFormation),

  getTeamLineupByLeagueAndWeek: (leagueId: string, teamId: number, week: number) =>
    fetchJSON<TeamLineup>(`/api/proxy${CMP}/leagues/${leagueId}/teams/${teamId}/lineup/week/${week}?x-lang=es`).then(normalizeFormation),

  getTeamMoney: (teamId: number) =>
    fetchJSON<TeamMoney>(`/api/proxy${CMP}/teams/${teamId}/money?x-lang=es`),

  getMarket: (leagueId: string) =>
    fetchJSON<MarketPlayer[]>(`/api/proxy${CMP}/league/${leagueId}/market?x-lang=es`),

  getStanding: (leagueId: string) =>
    fetchJSON<StandingEntry[]>(`/api/proxy${CMP}/leagues/${leagueId}/standing?x-lang=es`),

  getStandingByWeek: (leagueId: string, week: number) =>
    fetchJSON<StandingEntry[]>(`/api/proxy${CMP}/leagues/${leagueId}/standing/${week}?x-lang=es`),

  getAllPlayers: () =>
    fetchJSON<PlayerMaster[]>(`/api/proxy${CMP}/players?x-lang=es`),

  getPlayerDetails: (playerId: string, leagueId: string) =>
    fetchJSON<PlayerMaster>(`/api/proxy${CMP}/player/${playerId}/league/${leagueId}?x-lang=es`),

  getCurrentWeek: () => fetchJSON<WeekInfo>(`/api/proxy${CMP}/week/current?x-lang=es`),

  getCalendar: (weekNumber: number) =>
    fetchJSON<Match[]>(`/api/proxy${CMP}/calendar?weekNumber=${weekNumber}&x-lang=es`),

  getRecommendations: (leagueId: string, teamId: number) =>
    fetchJSON<{
      recommendations: Recommendation[];
      strategy?: StrategyReport;
      bestMoves?: Recommendation[];
      optimalLineup?: { formation: string; starters: { player: PlayerMaster; expectedPoints: number }[]; captain?: { player: PlayerMaster; expectedPoints: number }; totalExpected: number };
      captain?: CaptainRecommendation | null;
      captainEnabled?: boolean;
      tacticalScheme?: TacticalScheme;
      multiWeekPlan?: MultiWeekPlan | null;
      /** Emparejamiento de la jornada por equipo real (§4.3). */
      fixtures?: FixtureOutlook[];
      league: FantasyLeague;
      money: TeamMoney;
      week: WeekInfo;
      marketCount: number;
    }>(`/api/recommendations?leagueId=${leagueId}&teamId=${teamId}`),

  getLeagueAnalysis: (leagueId: string, teamId: number) =>
    fetchJSON<{ analysis: LeagueAnalysis; league: FantasyLeague; money: TeamMoney; week: WeekInfo; marketCount: number }>(
      `/api/league-analysis?leagueId=${leagueId}&teamId=${teamId}`,
    ),

  getClauseMarket: (leagueId: string, teamId: number) =>
    fetchJSON<ClauseMarketResponse & { league: FantasyLeague; money: TeamMoney }>(
      `/api/clause-market?leagueId=${leagueId}&teamId=${teamId}`,
    ),

  getTrackRecord: (leagueId: string) => fetchJSON<TrackRecordResponse>(`/api/track-record?leagueId=${leagueId}`),

  getScorePredictions: (leagueId: string, teamId: number) =>
    fetchJSON<ScorePredictionsResponse & { history: ScoreHistoryRecord[] }>(
      `/api/score-predictions?leagueId=${leagueId}&teamId=${teamId}`,
    ),

  getMatches: (leagueId: string, teamId: number, week?: number) =>
    fetchJSON<MatchesResponse>(
      `/api/matches?leagueId=${leagueId}&teamId=${teamId}${week !== undefined ? `&week=${week}` : ''}`,
    ),

  getTeamsCatalog: () => fetchJSON<{ teams: TeamCatalogEntry[] }>(`/api/teams`).then((r) => r.teams),

  getFreeFormations: () =>
    fetchJSON<string[]>(`/api/proxy/v4/teams/lineup/formations?option=free&x-lang=es`),

  getPremiumFormations: () =>
    fetchJSON<string[]>(`/api/proxy/v4/teams/lineup/formations?option=premium&x-lang=es`),
};

// Centralized client for all LaLiga Fantasy actions (Objective 2)
export const LaLigaFantasyClient = {
  // Autenticación
  login: async (username?: string, password?: string) => {
    return fetchJSON<{ success: boolean; expires_in?: number }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  saveToken: async (token: string) => {
    return fetchJSON<{ success: boolean }>('/api/auth/token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  closeSession: async () => {
    return fetchJSON<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    });
  },

  logout: async () => {
    return fetchJSON<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    });
  },

  // Refresh token (handled automatically server-side, exported for API contract)
  refreshToken: async () => {
    // Calling our proxy triggers the server-side automatic refresh if expired
    return fetchJSON<WeekInfo>(`/api/proxy${CMP}/week/current?x-lang=es`);
  },

  // Obtener usuario
  getCurrentUser: () => fetchJSON<any>(`/api/proxy/v4/user/me?x-lang=es`),

  // Obtener ligas
  getLeagues: () => fantasyAPI.getLeagues(),

  // Obtener equipo / plantilla
  getTeamData: (leagueId: string, teamId: number) => fantasyAPI.getTeamData(leagueId, teamId),

  // Obtener dinero
  getTeamMoney: (teamId: number) => fantasyAPI.getTeamMoney(teamId),

  // Obtener mercado
  getMarket: (leagueId: string) => fantasyAPI.getMarket(leagueId),

  // Obtener alineación actual. Se usan exclusivamente los endpoints de
  // equipo, que es lo que hace la app móvil y el proyecto de referencia
  // LaLigaApp. Probamos el endpoint genérico y el de jornada actual, y nos
  // quedamos con el que devuelva más jugadores de campo. Los endpoints bajo
  // /leagues/{leagueId}/teams/{teamId}/lineup devolvían datos incompletos, por
  // lo que se han eliminado. leagueId se mantiene en la firma por compatibilidad.
  getCurrentLineup: async (teamId: number, _leagueId?: string) => {
    let genericLineup: TeamLineup | null = null;
    let weekLineup: TeamLineup | null = null;

    try {
      genericLineup = await fantasyAPI.getTeamLineup(teamId);
    } catch (error) {
      console.warn('[getCurrentLineup] generic team lineup failed:', error instanceof Error ? error.message : error);
    }

    try {
      const week = await fantasyAPI.getCurrentWeek();
      const weekNumber = week?.number ?? week?.weekNumber ?? 1;
      weekLineup = await fantasyAPI.getTeamLineupByWeek(teamId, weekNumber);
    } catch (error) {
      console.warn('[getCurrentLineup] weekly team lineup failed:', error instanceof Error ? error.message : error);
    }

    const genericCount = genericLineup ? countFieldPlayers(genericLineup) : 0;
    const weekCount = weekLineup ? countFieldPlayers(weekLineup) : 0;

    // Priorizamos la respuesta más completa; si hay empate, preferimos la de jornada.
    if (weekCount > 0 && weekCount >= genericCount) {
      return weekLineup!;
    }
    if (genericCount > 0) {
      return genericLineup!;
    }

    // Si ambos fallaron, relanzamos el error del endpoint genérico (más estable).
    if (genericLineup) return genericLineup;
    if (weekLineup) return weekLineup;
    throw new Error('No se pudo obtener la alineación desde ningún endpoint de equipo.');
  },

  // Modificar alineación (Objective 4 - Corrected keys aligned with LineupEditor.js)
  updateLineup: (
    teamId: number,
    lineupData: {
      tactical_formation: number[];
      goalkeeper: string | null;
      defender: string[];
      midfield: string[];
      striker: string[];
    }
  ) =>
    fetchJSON<any>(`/api/proxy${CMP}/teams/${teamId}/lineup?x-lang=es`, {
      method: 'PUT',
      body: JSON.stringify(lineupData),
    }),

  // Vender jugador al mercado (Objective 3)
  sellPlayerToMarket: (leagueId: string, playerId: string, salePrice: number) =>
    fetchJSON<any>(`/api/proxy${CMP}/league/${leagueId}/market/sell?x-lang=es`, {
      method: 'POST',
      body: JSON.stringify({ playerId, salePrice }),
    }),

  // Retirar jugador del mercado (Objective 3)
  withdrawPlayerFromMarket: (leagueId: string, marketId: string) =>
    fetchJSON<any>(`/api/proxy${CMP}/league/${leagueId}/market/${marketId}/delete?x-lang=es`, {
      method: 'DELETE',
    }),

  // Realizar puja por jugador (Objective 3)
  makeBid: (leagueId: string, marketId: string, bidAmount: number) =>
    fetchJSON<any>(`/api/proxy${CMP}/league/${leagueId}/market/${marketId}/bid?x-lang=es`, {
      method: 'POST',
      body: JSON.stringify({ money: bidAmount }),
    }),

  // Modificar puja existente (Objective 3)
  modifyBid: (leagueId: string, marketId: string, bidId: string, newBidAmount: number) =>
    fetchJSON<any>(`/api/proxy${CMP}/league/${leagueId}/market/${marketId}/bid/${bidId}?x-lang=es`, {
      method: 'PUT',
      body: JSON.stringify({ money: newBidAmount }),
    }),

  // Cancelar puja (Objective 3)
  cancelBid: (leagueId: string, marketId: string, bidId: string) =>
    fetchJSON<any>(`/api/proxy${CMP}/league/${leagueId}/market/${marketId}/bid/${bidId}/cancel?x-lang=es`, {
      method: 'DELETE',
    }),

  // Aceptar oferta por un jugador (Objective 3)
  acceptOffer: (leagueId: string, marketId: string, offerId: string, offerMoney: number) =>
    fetchJSON<any>(`/api/proxy${CMP}/league/${leagueId}/market/${marketId}/offer/${offerId}/accept?x-lang=es`, {
      method: 'POST',
      body: JSON.stringify({ offerMoney }),
    }),

  // Rechazar oferta por un jugador (Objective 3)
  declineOffer: (leagueId: string, marketId: string, offerId: string) =>
    fetchJSON<any>(`/api/proxy${CMP}/league/${leagueId}/market/${marketId}/offer/${offerId}/reject?x-lang=es`, {
      method: 'POST',
    }),

  // Incrementar cláusula (Objective 3)
  increaseBuyoutClause: (leagueId: string, playerId: string, factor: number, valueToIncrease: number) =>
    fetchJSON<any>(`/api/proxy${CMP}/league/${leagueId}/buyout/player?x-lang=es`, {
      method: 'PUT',
      body: JSON.stringify({ factor, playerId, valueToIncrease }),
    }),

  // Pagar cláusula (clausulazo) (Objective 3)
  payBuyoutClause: (leagueId: string, playerId: string, buyoutClauseToPay: number) =>
    fetchJSON<any>(`/api/proxy${CMP}/league/${leagueId}/buyout/${playerId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ buyoutClauseToPay }),
    }),

  // Blindar jugador (Objective 3)
  shieldPlayer: (leagueId: string, playerId: string) =>
    fetchJSON<any>(`/api/proxy${CMP}/league/${leagueId}/shield/player?x-lang=es`, {
      method: 'PUT',
      body: JSON.stringify({ playerId, rewardedAdType: 'Blindaje', rewardedAd: 1 }),
    }),

  // Ofertas directas para otros managers
  makeDirectOffer: (leagueId: string, playerId: string, money: number) =>
    fetchJSON<any>(`/api/proxy${CMP}/league/${leagueId}/market/direct-offer?x-lang=es`, {
      method: 'POST',
      body: JSON.stringify({ playerId, money }),
    }),
};

export default fantasyAPI;
