'use client';

import { useQuery } from '@tanstack/react-query';
import fantasyAPI from '../../lib/fantasy/api';
import type { FantasyLeague } from '../../types/fantasy';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import ErrorState from '../shared/ErrorState';
import SectionHeader from '../shared/SectionHeader';
import SummaryCards from '../statistics/SummaryCards';
import StandingsChart from '../statistics/StandingsChart';
import TeamValueChart from '../statistics/TeamValueChart';
import PositionDistributionChart from '../statistics/PositionDistributionChart';
import PointsVsValueChart from '../statistics/PointsVsValueChart';
import PlayerStatsTable from '../statistics/PlayerStatsTable';
import MarketStatsPanel from '../statistics/MarketStatsPanel';
import ManagerComparison from '../statistics/ManagerComparison';
import RiskAnalysisPanel from '../statistics/RiskAnalysisPanel';

interface StatisticsTabProps {
  league: FantasyLeague;
}

export default function StatisticsTab({ league }: StatisticsTabProps) {
  const teamId = league.team.id;
  const leagueId = league.id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['league-analysis', leagueId, teamId],
    queryFn: () => fantasyAPI.getLeagueAnalysis(leagueId, teamId),
    enabled: !!teamId,
  });

  if (isLoading) return <StatisticsSkeleton />;
  if (error) return <ErrorState title="Error cargando estadísticas" description={error.message} onRetry={refetch} />;

  const analysis = data?.analysis;
  if (!analysis) {
    return <ErrorState title="Sin datos" description="No se han podido cargar los datos de análisis de la liga." onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Estadísticas"
        description={`Análisis completo de ${league.name}`}
      />

      <SummaryCards analysis={analysis} />

      <Tabs defaultValue="standings" className="space-y-6">
        <TabsList className="flex w-full items-start gap-1 overflow-x-auto rounded-xl p-1 scrollbar-thin lg:grid lg:grid-cols-7">
          <TabsTrigger value="standings" className="shrink-0">Clasificación</TabsTrigger>
          <TabsTrigger value="teams" className="shrink-0">Equipos</TabsTrigger>
          <TabsTrigger value="positions" className="shrink-0">Posiciones</TabsTrigger>
          <TabsTrigger value="players" className="shrink-0">Jugadores</TabsTrigger>
          <TabsTrigger value="market" className="shrink-0">Mercado</TabsTrigger>
          <TabsTrigger value="rivals" className="shrink-0">Rivales</TabsTrigger>
          <TabsTrigger value="risks" className="shrink-0">Riesgos</TabsTrigger>
        </TabsList>

        <TabsContent value="standings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Puntos por equipo</CardTitle>
              <CardDescription>Clasificación visual de la liga</CardDescription>
            </CardHeader>
            <CardContent>
              <StandingsChart standing={analysis.standing} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Valor de plantilla</CardTitle>
              <CardDescription>Comparativa del valor de cada equipo</CardDescription>
            </CardHeader>
            <CardContent>
              <TeamValueChart standing={analysis.standing} ownTeamId={teamId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribución por posición</CardTitle>
              <CardDescription>Jugadores en plantillas de toda la liga</CardDescription>
            </CardHeader>
            <CardContent>
              <PositionDistributionChart distribution={analysis.aggregates.positionDistribution} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="players" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Jugadores de la liga</CardTitle>
              <CardDescription>Todos los jugadores en plantillas</CardDescription>
            </CardHeader>
            <CardContent>
              <PlayerStatsTable
                teamPlayers={[
                  ...analysis.teamData.players,
                  ...analysis.rivals.flatMap((r) => r.players),
                ]}
                ownPlayerIds={new Set(analysis.teamData.players.map((p) => p.playerMaster.id))}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Puntos vs Valor de mercado</CardTitle>
              <CardDescription>Relación entre rendimiento y precio</CardDescription>
            </CardHeader>
            <CardContent>
              <PointsVsValueChart
                teamPlayers={[
                  ...analysis.teamData.players,
                  ...analysis.rivals.flatMap((r) => r.players),
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="market" className="space-y-6">
          <MarketStatsPanel market={analysis.market} />
        </TabsContent>

        <TabsContent value="rivals" className="space-y-6">
          <ManagerComparison rivals={analysis.rivals} ownMoney={analysis.money} ownTeamValue={analysis.league.team.teamValue} />
        </TabsContent>

        <TabsContent value="risks" className="space-y-6">
          <RiskAnalysisPanel clauseRisks={analysis.clauseRisks} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatisticsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
