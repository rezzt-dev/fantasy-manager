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
} from '../../types/fantasy';
import type { LeagueAnalysis, TacticalScheme, ScorePredictionsResponse } from '../../types/analysis';
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
    best?: { shrinkageK: number; eloDiffDivisor: number; mae: number };
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

// Keep existing fantasyAPI for compatibility with read-only callers
export const fantasyAPI = {
  getLeagues: () => fetchJSON<FantasyLeague[]>(`/api/proxy${CMP}/leagues?x-lang=es`),

  getTeamData: (leagueId: string, teamId: number) =>
    fetchJSON<TeamData>(`/api/proxy${CMP}/leagues/${leagueId}/teams/${teamId}?x-lang=es`),

  getTeamLineup: (teamId: number) =>
    fetchJSON<TeamLineup>(`/api/proxy${CMP}/teams/${teamId}/lineup?x-lang=es`).then(normalizeFormation),

  getTeamLineupByWeek: (teamId: number, week: number) =>
    fetchJSON<TeamLineup>(`/api/proxy${CMP}/teams/${teamId}/lineup/week/${week}?x-lang=es`).then(normalizeFormation),

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
      bestMoves?: Recommendation[];
      optimalLineup?: { formation: string; starters: { player: PlayerMaster; expectedPoints: number }[]; captain?: { player: PlayerMaster; expectedPoints: number }; totalExpected: number };
      tacticalScheme?: TacticalScheme;
      multiWeekPlan?: MultiWeekPlan | null;
      league: FantasyLeague;
      money: TeamMoney;
      week: WeekInfo;
      marketCount: number;
    }>(`/api/recommendations?leagueId=${leagueId}&teamId=${teamId}`),

  getLeagueAnalysis: (leagueId: string, teamId: number) =>
    fetchJSON<{ analysis: LeagueAnalysis; league: FantasyLeague; money: TeamMoney; week: WeekInfo; marketCount: number }>(
      `/api/league-analysis?leagueId=${leagueId}&teamId=${teamId}`,
    ),

  getTrackRecord: (leagueId: string) => fetchJSON<TrackRecordResponse>(`/api/track-record?leagueId=${leagueId}`),

  getScorePredictions: (leagueId: string, teamId: number) =>
    fetchJSON<ScorePredictionsResponse & { history: ScoreHistoryRecord[] }>(
      `/api/score-predictions?leagueId=${leagueId}&teamId=${teamId}`,
    ),

  getMatches: (leagueId: string, teamId: number) =>
    fetchJSON<MatchesResponse>(`/api/matches?leagueId=${leagueId}&teamId=${teamId}`),

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

  // Obtener alineación actual: la API suele devolver el once completo en el
  // endpoint por jornada; si falla, volvemos al genérico.
  getCurrentLineup: async (teamId: number) => {
    try {
      const week = await fantasyAPI.getCurrentWeek();
      const weekNumber = week?.number ?? week?.weekNumber ?? 1;
      try {
        return await fantasyAPI.getTeamLineupByWeek(teamId, weekNumber);
      } catch {
        return await fantasyAPI.getTeamLineup(teamId);
      }
    } catch {
      return await fantasyAPI.getTeamLineup(teamId);
    }
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
