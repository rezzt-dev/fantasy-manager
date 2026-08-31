'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { motionTokens } from '../../lib/motion';
import fantasyAPI from '../../lib/fantasy/api';
import type { FantasyLeague } from '../../types/fantasy';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import ErrorState from '../shared/ErrorState';
import EmptyState from '../shared/EmptyState';
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
import { BarChart3, Trophy, Users, ShoppingCart, Shield, AlertTriangle, LayoutGrid } from 'lucide-react';

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
  if (error) return (
      <ErrorState
        title="No hemos podido calcular las estadísticas"
        description="El análisis cruza tu liga entera; si alguna de las plantillas no responde, no se puede completar. Reintenta."
        detail={error.message}
        onRetry={refetch}
      />
    );

  const analysis = data?.analysis;
  if (!analysis) {
    return (
      <EmptyState
        icon={<BarChart3 />}
        title="Todavía no hay estadísticas que enseñar"
        description="El análisis se calcula con las plantillas de todos los managers de la liga. Aparecerá en cuanto la liga tenga al menos una jornada disputada."
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Volver a calcular
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        as="h1"
        eyebrow="Estadísticas"
        title="La temporada en números"
        description={`Rendimiento, valor y riesgo de todos los equipos de ${league.name}, con el tuyo siempre marcado en el gráfico.`}
      />

      <SummaryCards analysis={analysis} />

      <Tabs defaultValue="standings" className="space-y-6">
        <TabsList variant="underline">
          <TabsTrigger value="standings" className="shrink-0 gap-1.5">
            <Trophy className="h-3.5 w-3.5" /> Clasificación
          </TabsTrigger>
          <TabsTrigger value="teams" className="shrink-0 gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Equipos
          </TabsTrigger>
          <TabsTrigger value="positions" className="shrink-0 gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" /> Posiciones
          </TabsTrigger>
          <TabsTrigger value="players" className="shrink-0 gap-1.5">
            <Users className="h-3.5 w-3.5" /> Jugadores
          </TabsTrigger>
          <TabsTrigger value="market" className="shrink-0 gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5" /> Mercado
          </TabsTrigger>
          <TabsTrigger value="rivals" className="shrink-0 gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Rivales
          </TabsTrigger>
          <TabsTrigger value="risks" className="shrink-0 gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Riesgos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standings" className="space-y-6">
          <ChartCard title="Puntos por equipo" description="Clasificación visual de la liga">
            <StandingsChart standing={analysis.standing} />
          </ChartCard>
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          <ChartCard title="Valor de plantilla" description="Comparativa del valor de cada equipo">
            <TeamValueChart standing={analysis.standing} ownTeamId={teamId} />
          </ChartCard>
        </TabsContent>

        <TabsContent value="positions" className="space-y-6">
          <ChartCard title="Distribución por posición" description="Jugadores en plantillas de toda la liga">
            <PositionDistributionChart distribution={analysis.aggregates.positionDistribution} />
          </ChartCard>
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
          <ChartCard title="Puntos vs Valor de mercado" description="Relación entre rendimiento y precio">
            <PointsVsValueChart
              teamPlayers={[
                ...analysis.teamData.players,
                ...analysis.rivals.flatMap((r) => r.players),
              ]}
            />
          </ChartCard>
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

/**
 * Un gráfico tarda en calcularse y en dibujarse. Su entrada existe para tapar
 * ese salto —el hueco vacío que se llena de golpe—, no para adornar: opacidad
 * y 12 px, con la duración y la curva del sistema. Antes eran 350 ms con la
 * curva por defecto del framework, un ritmo que no se parecía al del resto de
 * la aplicación.
 */
function ChartCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  const t = motionTokens();
  return (
    <motion.div
      initial={{ opacity: 0, y: t.move.md }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: t.sec.base, ease: t.ease.out }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
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
