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
} from '../../types/fantasy';
import type {
  LeagueAnalysis,
  RivalTeam,
  RivalNeed,
  PositionNeed,
  LeagueAggregates,
} from '../../types/analysis';
import { recommendCaptain } from '../recommendations/captain';

const POSITION_ORDER: Record<number, string> = {
  1: 'Portero',
  2: 'Defensa',
  3: 'Centrocampista',
  4: 'Delantero',
  5: 'Entrenador',
};

const POSITION_COLORS: Record<number, string> = {
  1: '#f59e0b',
  2: '#3b82f6',
  3: '#10b981',
  4: '#ef4444',
  5: '#6366f1',
};

interface FetchDependencies {
  fetchTeamData: (leagueId: string, teamId: number) => Promise<TeamData>;
  fetchTeamMoney: (teamId: number) => Promise<TeamMoney>;
}

async function withConcurrency<T>(items: T[], fn: (item: T) => Promise<void>, concurrency = 5) {
  const queue = [...items];
  const running = new Set<Promise<void>>();

  while (queue.length > 0 || running.size > 0) {
    while (running.size < concurrency && queue.length > 0) {
      const item = queue.shift()!;
      const promise = fn(item).finally(() => running.delete(promise));
      running.add(promise);
    }
    if (running.size > 0) {
      await Promise.race(running);
    }
  }
}

/** Reintenta una vez tras 600 ms (la API devuelve 403 transitorios en ráfagas). */
async function fetchWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return fn();
  }
}

export async function buildLeagueAnalysis(
  league: FantasyLeague,
  teamData: TeamData,
  lineup: TeamLineup,
  money: TeamMoney,
  market: MarketPlayer[],
  standing: StandingEntry[],
  week: WeekInfo,
  calendar: Match[],
  allPlayers: PlayerMaster[],
  deps: FetchDependencies,
): Promise<LeagueAnalysis> {
  const ownTeamId = league.team.id;

  const rivals: RivalTeam[] = [];

  const rivalEntries = standing.filter((entry) => Number(entry.team.id) !== ownTeamId);

  await withConcurrency(
    rivalEntries,
    async (entry) => {
      const teamId = Number(entry.team.id);
      try {
        // La plantilla es imprescindible; se reintenta una vez por errores transitorios.
        const data = await fetchWithRetry(() => deps.fetchTeamData(league.id, teamId));

        // El dinero de rivales está restringido por la API (403 suave: HTTP 200
        // con cuerpo {"code":403}). Es opcional: nunca debe impedir cargar al rival.
        let teamMoney: number | null = null;
        try {
          const rivalMoney = await deps.fetchTeamMoney(teamId);
          const value = Number(rivalMoney?.teamMoney);
          if (Number.isFinite(value)) teamMoney = value;
        } catch {
          // Sin dato de dinero: se marca null y el análisis usa el valor del equipo.
        }

        rivals.push({
          teamId,
          managerId: entry.team.managerId,
          managerName: entry.team.manager?.managerName || `Equipo ${teamId}`,
          teamValue: entry.team.teamValue,
          teamMoney,
          players: data.players || [],
        });
      } catch (error) {
        // Si no podemos cargar un rival, lo saltamos para no romper todo el análisis.
        const message = error instanceof Error ? error.message : 'unknown';
        console.warn(`[league-analysis] Failed to load rival ${teamId}: ${message}`);
      }
    },
    5,
  );

  const ownNeeds = computeOwnNeeds(teamData.players, lineup);
  const rivalNeeds = computeRivalNeeds(rivals);
  const aggregates = computeAggregates(rivals, market, teamData, money);

  return {
    league,
    teamData,
    lineup,
    money,
    market,
    standing,
    week,
    calendar,
    allPlayers,
    rivals,
    rivalNeeds,
    ownNeeds,
    clauseRisks: [], // Se calculan en clause-risk.ts
    captain: recommendCaptain({
      league,
      teamData,
      lineup,
      money,
      market,
      standing,
      week,
      calendar,
      allPlayers,
      rivals,
      rivalNeeds,
      ownNeeds,
      clauseRisks: [],
      aggregates,
      externalSignals: {},
      starterInfo: {},
    }),
    aggregates,
    externalSignals: {},
    starterInfo: {},
  };
}

function computeOwnNeeds(players: TeamPlayer[], lineup: TeamLineup): PositionNeed[] {
  const lineupEntries = [
    ...(lineup.formation.goalkeeper || []),
    ...(lineup.formation.defender || []),
    ...(lineup.formation.midfielder || []),
    ...(lineup.formation.attacker || []),
  ];
  const lineupIds = new Set(lineupEntries.map((e) => e.playerMaster.id));

  const counts: Record<number, { total: number; healthy: number; lineup: number }> = {};

  for (const p of players) {
    const pos = p.playerMaster.positionId;
    if (!counts[pos]) counts[pos] = { total: 0, healthy: 0, lineup: 0 };
    counts[pos].total += 1;
    if (p.playerMaster.playerStatus === 'ok') counts[pos].healthy += 1;
    if (lineupIds.has(p.playerMaster.id)) counts[pos].lineup += 1;
  }

  const idealMin: Record<number, number> = {
    1: 2,
    2: 5,
    3: 6,
    4: 4,
    5: 1,
  };

  return Object.entries(counts).map(([posId, count]) => {
    const id = Number(posId);
    const recommendedMin = idealMin[id] ?? 2;
    const needScore = Math.min(1, Math.max(0, (recommendedMin - count.healthy) / recommendedMin));
    return {
      positionId: id,
      positionName: POSITION_ORDER[id] || 'Otro',
      ownCount: count.total,
      ownHealthyCount: count.healthy,
      recommendedMin,
      needScore,
    };
  });
}

function computeRivalNeeds(rivals: RivalTeam[]): RivalNeed[] {
  const needs: RivalNeed[] = [];
  const idealMin: Record<number, number> = {
    1: 2,
    2: 5,
    3: 6,
    4: 4,
    5: 1,
  };

  for (const rival of rivals) {
    const counts: Record<number, number> = {};
    for (const p of rival.players) {
      if (p.playerMaster.playerStatus !== 'ok') continue;
      counts[p.playerMaster.positionId] = (counts[p.playerMaster.positionId] || 0) + 1;
    }

    for (const [posIdStr, min] of Object.entries(idealMin)) {
      const posId = Number(posIdStr);
      const healthyCount = counts[posId] || 0;
      const needScore = Math.min(1, Math.max(0, (min - healthyCount) / min));
      if (needScore > 0) {
        needs.push({
          teamId: rival.teamId,
          managerId: rival.managerId,
          managerName: rival.managerName,
          positionId: posId,
          positionName: POSITION_ORDER[posId] || 'Otro',
          needScore,
        });
      }
    }
  }

  return needs;
}

export function computeAggregates(
  rivals: RivalTeam[],
  market: MarketPlayer[],
  ownTeam: TeamData,
  ownMoney: TeamMoney,
): LeagueAggregates {
  const allTeamPlayers = [...ownTeam.players];
  let totalLeagueValue = ownMoney.teamMoney;
  let totalMoneyAvailable = ownMoney.teamMoney;

  for (const rival of rivals) {
    totalLeagueValue += rival.teamValue;
    totalMoneyAvailable += rival.teamMoney ?? 0;
    allTeamPlayers.push(...rival.players);
  }

  const positionDistribution: Record<number, { name: string; count: number; color: string }> = {};
  for (const p of allTeamPlayers) {
    const pos = p.playerMaster.positionId;
    if (!positionDistribution[pos]) {
      positionDistribution[pos] = {
        name: POSITION_ORDER[pos] || 'Otro',
        count: 0,
        color: POSITION_COLORS[pos] || '#94a3b8',
      };
    }
    positionDistribution[pos].count += 1;
  }

  const allPoints = allTeamPlayers.map((p) => p.playerMaster.points || p.playerMaster.lastSeasonPoints || 0);
  const totalPoints = allPoints.reduce((sum, v) => sum + v, 0);

  return {
    totalLeagueValue,
    totalMoneyAvailable,
    totalPlayers: allTeamPlayers.length,
    playersOnSale: market.length,
    injuredPlayers: allTeamPlayers.filter((p) => p.playerMaster.playerStatus !== 'ok').length,
    averageTeamValue: rivals.length > 0 ? totalLeagueValue / (rivals.length + 1) : totalLeagueValue,
    averageTeamPoints: rivals.length > 0 ? totalPoints / (rivals.length + 1) : totalPoints,
    positionDistribution,
  };
}
