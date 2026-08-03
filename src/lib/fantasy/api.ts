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
} from '../../types/fantasy';
import type { LeagueAnalysis, TacticalScheme } from '../../types/analysis';
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
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  return res.text() as unknown as Promise<T>;
}

const CMP = '/v1/competition/1';

export const fantasyAPI = {
  getLeagues: () => fetchJSON<FantasyLeague[]>(`/api/proxy${CMP}/leagues?x-lang=es`),

  getTeamData: (leagueId: string, teamId: number) =>
    fetchJSON<TeamData>(`/api/proxy${CMP}/leagues/${leagueId}/teams/${teamId}?x-lang=es`),

  getTeamLineup: (teamId: number) =>
    fetchJSON<TeamLineup>(`/api/proxy${CMP}/teams/${teamId}/lineup?x-lang=es`),

  getTeamLineupByWeek: (teamId: number, week: number) =>
    fetchJSON<TeamLineup>(`/api/proxy${CMP}/teams/${teamId}/lineup/week/${week}?x-lang=es`),

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

  getFreeFormations: () =>
    fetchJSON<string[]>(`/api/proxy/v4/teams/lineup/formations?option=free&x-lang=es`),

  getPremiumFormations: () =>
    fetchJSON<string[]>(`/api/proxy/v4/teams/lineup/formations?option=premium&x-lang=es`),
};

export default fantasyAPI;
