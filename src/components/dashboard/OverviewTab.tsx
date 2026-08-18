'use client';

import { useQuery } from '@tanstack/react-query';
import fantasyAPI from '../../lib/fantasy/api';
import type { FantasyLeague, Recommendation } from '../../types/fantasy';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { StaggerContainer, StaggerItem } from '../ui/motion';
import KpiCard from '../shared/KpiCard';
import PlayerAvatar from '../shared/PlayerAvatar';
import PlayerStatusBadge from '../shared/PlayerStatusBadge';
import Currency from '../shared/Currency';
import SignalChips from '../shared/SignalChips';
import SectionHeader from '../shared/SectionHeader';
import AlertPanel from '../shared/AlertPanel';
import EmptyState from '../shared/EmptyState';
import NextMatchdayCard from './NextMatchdayCard';
import LeagueActivityFeed from './LeagueActivityFeed';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import {
  Wallet,
  Users,
  TrendingUp,
  Trophy,
  AlertTriangle,
  ArrowRight,
  Banknote,
  ShieldCheck,
  ShoppingCart,
  Zap,
} from 'lucide-react';
import { positionColor, getPositionName, statusText } from '../../lib/format';
import { useNotifications } from '../../hooks/useNotifications';

interface OverviewTabProps {
  league: FantasyLeague;
}

export default function OverviewTab({ league }: OverviewTabProps) {
  const { isRead, markAsRead } = useNotifications();
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

  const marketQuery = useQuery({
    queryKey: ['market', leagueId],
    queryFn: () => fantasyAPI.getMarket(leagueId),
    enabled: !!leagueId,
  });

  const recommendationsQuery = useQuery({
    queryKey: ['recommendations', leagueId, teamId],
    queryFn: () => fantasyAPI.getRecommendations(leagueId, teamId),
    enabled: !!teamId,
  });

  const analysisQuery = useQuery({
    queryKey: ['league-analysis', leagueId, teamId],
    queryFn: () => fantasyAPI.getLeagueAnalysis(leagueId, teamId),
    enabled: !!teamId,
  });

  const currentWeekQuery = useQuery({
    queryKey: ['current-week'],
    queryFn: fantasyAPI.getCurrentWeek,
  });

  const weekNumber = currentWeekQuery.data?.number ?? currentWeekQuery.data?.weekNumber ?? 1;
  const calendarQuery = useQuery({
    queryKey: ['calendar', weekNumber],
    queryFn: () => fantasyAPI.getCalendar(weekNumber),
    enabled: !!weekNumber,
  });

  const isLoading = teamQuery.isLoading || moneyQuery.isLoading || marketQuery.isLoading || recommendationsQuery.isLoading;
  const hasError = teamQuery.error || moneyQuery.error || marketQuery.error || recommendationsQuery.error;

  if (isLoading) return <OverviewSkeleton />;

  if (hasError) {
    return (
      <AlertPanel
        level="danger"
        title="Error cargando datos"
        description="No se han podido cargar los datos de la liga."
      />
    );
  }

  const teamPlayers = teamQuery.data?.players || [];
  const money = moneyQuery.data;
  const marketCount = marketQuery.data?.length || 0;
  const recommendations = recommendationsQuery.data?.recommendations || [];
  const highPriority = recommendations.filter((r) => r.priority === 'high').slice(0, 4);

  const HARD_NEWS_CATEGORIES = new Set(['injury', 'illness', 'suspension']);
  const unavailablePlayers = teamPlayers.filter(
    (p) => p.playerMaster.playerStatus !== 'ok' && !isRead(`status-${p.playerMaster.id}-${p.playerMaster.playerStatus}`),
  );
  const newsAlerts = recommendations
    .filter(
      (r) =>
        !isRead(`news-${r.id}`) &&
        (r.externalSignals || []).some((s) => s.signal === 'sell' && s.category && HARD_NEWS_CATEGORIES.has(s.category)),
    )
    .slice(0, 3);
  const clauseAlerts = recommendations
    .filter((r) => r.type === 'protect_clause' && (r.riskScore ?? 0) >= 70 && !isRead(`clause-${r.id}`))
    .slice(0, 3);

  const positionData = teamPlayers.reduce<Record<string, { name: string; value: number; color: string }>>(
    (acc, p) => {
      const pos = getPositionName(p.playerMaster.positionId);
      if (!acc[pos]) acc[pos] = { name: pos, value: 0, color: positionColor(pos) };
      acc[pos].value += 1;
      return acc;
    },
    {},
  );
  const chartData = Object.values(positionData);

  const analysis = analysisQuery.data?.analysis;
  const leagueActivity = analysis?.leagueActivity || [];
  const standing = analysis?.standing || [];
  const managersById = standing.reduce<Record<number, string>>((acc, entry) => {
    if (entry.team?.manager?.id) {
      acc[Number(entry.team.manager.id)] = entry.team.manager.managerName || 'Manager';
    }
    return acc;
  }, {});

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <SectionHeader
        title={league.name}
        description="Resumen general de tu equipo, mercado y próxima jornada."
      />

      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.06}>
        <StaggerItem>
          <KpiCard
            icon={<Wallet className="h-5 w-5" />}
            label="Dinero disponible"
            value={money?.teamMoney ?? 0}
            sub={money ? `Inversiones: ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(money.teamInvestment)}` : undefined}
            suffix="€"
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Valor del equipo"
            value={league.team.teamValue}
            sub={`Posición ${league.team.position ?? '-'}`}
            suffix="€"
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            icon={<Users className="h-5 w-5" />}
            label="Jugadores"
            value={league.team.playersNumber}
            sub={`${teamPlayers.length} en plantilla`}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            icon={<ShoppingCart className="h-5 w-5" />}
            label="En mercado"
            value={marketCount}
            sub="Jugadores en venta"
          />
        </StaggerItem>
      </StaggerContainer>

      {unavailablePlayers.length > 0 && (
        <AlertPanel
          level="warning"
          title="Bajas o dudas en tu plantilla"
          description={`Tienes ${unavailablePlayers.length} jugador${unavailablePlayers.length > 1 ? 'es' : ''} ${unavailablePlayers.map((p) => p.playerMaster.nickname).join(', ')}.`}
          onDismiss={() => unavailablePlayers.forEach((p) => markAsRead(`status-${p.playerMaster.id}-${p.playerMaster.playerStatus}`))}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Plantilla por posición</CardTitle>
            <CardDescription>Distribución de jugadores en tu equipo</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                      >
                        {chartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: number, name: string) => [value, name]}
                        contentStyle={{
                          backgroundColor: 'rgba(28,28,28,0.95)',
                          border: '1px solid rgba(236,236,236,0.08)',
                          borderRadius: '0.75rem',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {chartData.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}:</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Sin datos de posiciones.</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <div>
              <CardTitle className="text-base">Acciones prioritarias</CardTitle>
              <CardDescription>Recomendaciones urgentes para esta jornada</CardDescription>
            </div>
            {highPriority.length > 0 && (
              <Badge variant="muted" className="h-fit gap-1">
                <Zap className="h-3 w-3" /> {highPriority.length}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {highPriority.length === 0 ? (
              <EmptyState
                compact
                title="Tu equipo está bien equilibrado"
                description="No hay acciones urgentes para esta jornada."
                icon={<Trophy className="h-5 w-5" />}
              />
            ) : (
              <StaggerContainer className="grid gap-3 sm:grid-cols-2" stagger={0.05}>
                {highPriority.map((rec) => (
                  <StaggerItem key={rec.id}>
                    <PriorityRow recommendation={rec} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {(newsAlerts.length > 0 || clauseAlerts.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {newsAlerts.map((rec) => (
            <AlertPanel
              key={rec.id}
              level="danger"
              title={rec.player.nickname}
              description={rec.reason}
              onDismiss={() => markAsRead(`news-${rec.id}`)}
            />
          ))}
          {clauseAlerts.map((rec) => (
            <AlertPanel
              key={rec.id}
              level="warning"
              title={`${rec.player.nickname} en riesgo`}
              description={`Riesgo de clausulazo ${rec.riskScore}/100`}
              onDismiss={() => markAsRead(`clause-${rec.id}`)}
            />
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <NextMatchdayCard
          week={currentWeekQuery.data}
          matches={calendarQuery.data}
          leagueName={league.name}
        />
        <LeagueActivityFeed events={leagueActivity} managersById={managersById} />
      </div>
    </div>
  );
}

function PriorityRow({ recommendation: rec }: { recommendation: Recommendation }) {
  const icon =
    rec.type === 'sell' ? <AlertTriangle className="h-4 w-4" /> :
    rec.type === 'buy' ? <Banknote className="h-4 w-4" /> :
    rec.type === 'increase_clause' ? <ShieldCheck className="h-4 w-4" /> :
    <ArrowRight className="h-4 w-4" />;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-card p-3 transition-colors hover:bg-surface-2">
      <PlayerAvatar player={rec.player} size="md" showPosition />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-card-foreground">{rec.player.nickname}</span>
          <Badge variant="muted" className="text-[10px]">
            {rec.type === 'buy' ? 'Comprar' : rec.type === 'sell' ? 'Vender' : rec.type === 'increase_clause' ? 'Cláusula' : 'Alineación'}
          </Badge>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{rec.reason}</p>
        {rec.externalSignals && rec.externalSignals.length > 0 && <SignalChips signals={rec.externalSignals} />}
      </div>
      <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-80 w-full lg:col-span-2" />
        <Skeleton className="h-80 w-full lg:col-span-3" />
      </div>
    </div>
  );
}
