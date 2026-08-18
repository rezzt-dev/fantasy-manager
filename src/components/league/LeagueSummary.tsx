import { useQuery } from '@tanstack/react-query';
import fantasyAPI, { LaLigaFantasyClient } from '../../lib/fantasy/api';
import type { FantasyLeague } from '../../types/fantasy';
import { EuroIcon, Users, TrendingUp, Wallet } from 'lucide-react';
import RecommendationPanel from '../recommendations/RecommendationPanel';

export default function LeagueSummary({ league }: { league: FantasyLeague }) {
  const teamId = league.team.id;
  const leagueId = league.id;

  const teamQuery = useQuery({
    queryKey: ['team', leagueId, teamId],
    queryFn: () => fantasyAPI.getTeamData(leagueId, teamId),
    enabled: !!teamId,
  });

  const moneyQuery = useQuery({
    queryKey: ['money', teamId],
    queryFn: () => fantasyAPI.getTeamMoney(teamId),
    enabled: !!teamId,
  });

  const lineupQuery = useQuery({
    queryKey: ['lineup', teamId],
    queryFn: () => LaLigaFantasyClient.getCurrentLineup(teamId),
    enabled: !!teamId,
  });

  const marketQuery = useQuery({
    queryKey: ['market', leagueId],
    queryFn: () => fantasyAPI.getMarket(leagueId),
    enabled: !!leagueId,
  });

  const isLoading = teamQuery.isLoading || moneyQuery.isLoading || lineupQuery.isLoading || marketQuery.isLoading;
  const hasError = teamQuery.error || moneyQuery.error || lineupQuery.error || marketQuery.error;

  if (isLoading) {
    return <div className="py-4 text-sm text-muted-foreground">Cargando datos de la liga...</div>;
  }

  if (hasError) {
    return <div className="rounded-lg border border-destructive/20 bg-card p-4 text-sm text-destructive">Error cargando datos de la liga.</div>;
  }

  const teamPlayers = teamQuery.data?.players || [];
  const money = moneyQuery.data;
  const marketCount = marketQuery.data?.length || 0;
  const formation = lineupQuery.data?.formation;

  const playersByPosition: Record<string, number> = {};
  teamPlayers.forEach((p) => {
    const pos = p.playerMaster.position || 'Otro';
    playersByPosition[pos] = (playersByPosition[pos] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Wallet className="h-5 w-5 text-muted-foreground" />}
          label="Dinero disponible"
          value={money ? formatCurrency(money.teamMoney) : '-'}
        />
        <SummaryCard
          icon={<EuroIcon className="h-5 w-5 text-muted-foreground" />}
          label="Valor del equipo"
          value={formatCurrency(league.team.teamValue)}
        />
        <SummaryCard
          icon={<Users className="h-5 w-5 text-muted-foreground" />}
          label="Jugadores"
          value={`${league.team.playersNumber}`}
          sub={`${teamPlayers.length} en plantilla`}
        />
        <SummaryCard
          icon={<TrendingUp className="h-5 w-5 text-muted-foreground" />}
          label="En mercado"
          value={`${marketCount}`}
        />
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-card p-5">
        <h3 className="mb-3 text-base font-semibold text-foreground">Plantilla por posición</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(playersByPosition).map(([position, count]) => (
            <span
              key={position}
              className="rounded-full border border-white/[0.08] bg-surface-2 px-3 py-1 text-sm font-medium text-foreground"
            >
              {position}: {count}
            </span>
          ))}
        </div>
      </div>

      {formation && (
        <div className="rounded-xl border border-white/[0.08] bg-card p-5">
          <h3 className="mb-3 text-base font-semibold text-foreground">Alineación actual</h3>
          <div className="grid gap-2 text-sm text-muted-foreground">
            {formation.goalkeeper?.length > 0 && (
              <p><span className="font-medium text-foreground">Porteros:</span> {formation.goalkeeper.length}</p>
            )}
            {formation.defender?.length > 0 && (
              <p><span className="font-medium text-foreground">Defensas:</span> {formation.defender.length}</p>
            )}
            {formation.midfielder?.length > 0 && (
              <p><span className="font-medium text-foreground">Centrocampistas:</span> {formation.midfielder.length}</p>
            )}
            {formation.attacker?.length > 0 && (
              <p><span className="font-medium text-foreground">Delanteros:</span> {formation.attacker.length}</p>
            )}
          </div>
        </div>
      )}
      <RecommendationPanel league={league} />
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}
