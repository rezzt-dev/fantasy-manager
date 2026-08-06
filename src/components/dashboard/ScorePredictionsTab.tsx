'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import fantasyAPI from '../../lib/fantasy/api';
import type { FantasyLeague } from '../../types/fantasy';
import type { TeamScorePrediction, PredictedPlayerScore } from '../../types/analysis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import NumberFlow from '@number-flow/react';
import { Trophy, TrendingUp, Users, AlertCircle, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import KpiCard from '../shared/KpiCard';
import SectionHeader from '../shared/SectionHeader';
import ErrorState from '../shared/ErrorState';
import LoadingSection from '../shared/LoadingSection';
import DataTable from '../shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { cn } from '../../lib/utils';

interface ScorePredictionsTabProps {
  league: FantasyLeague;
}

function ScoreSkeleton() {
  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <SectionHeader title="Puntuación" description="Predicción de puntos por equipo de la jornada" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

function dataQualityVariant(level: 'high' | 'medium' | 'low') {
  switch (level) {
    case 'high':
      return 'success' as const;
    case 'medium':
      return 'warning' as const;
    case 'low':
      return 'danger' as const;
  }
}

function dataQualityLabel(level: 'high' | 'medium' | 'low') {
  switch (level) {
    case 'high':
      return 'Alta';
    case 'medium':
      return 'Media';
    case 'low':
      return 'Baja';
  }
}

function PlayerScoreRow({ entry, showCaptain }: { entry: PredictedPlayerScore; showCaptain?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold',
            entry.isCaptain && 'bg-amber-500/20 text-amber-300',
            entry.isCoach && 'bg-indigo-500/20 text-indigo-300',
            !entry.isCaptain && !entry.isCoach && 'bg-surface-2 text-muted-foreground',
          )}
        >
          {entry.isCaptain ? 'C' : entry.isCoach ? 'E' : entry.player.position.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">
            {entry.player.nickname}
            {entry.isCaptain && showCaptain && (
              <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-400">Capitán</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {entry.player.team?.name} · {entry.expectedMinutes !== null ? `${entry.expectedMinutes} min` : 'minutos estimados'}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-semibold text-foreground">
          <NumberFlow value={entry.expectedPoints} format={{ maximumFractionDigits: 1 }} />
        </div>
        <div className="text-[10px] text-muted-foreground">{entry.source}</div>
      </div>
    </div>
  );
}

function TeamDetail({ prediction }: { prediction: TeamScorePrediction }) {
  const lineup = prediction.predictedLineup;
  return (
    <div className="space-y-4 pt-2">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-surface-2/40">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Titulares</div>
            <div className="text-xl font-semibold text-foreground">
              <NumberFlow value={lineup.fieldExpected} format={{ maximumFractionDigits: 1 }} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-surface-2/40">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Capitán</div>
            <div className="text-xl font-semibold text-foreground">
              <NumberFlow value={lineup.captainBonus} format={{ maximumFractionDigits: 1 }} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-surface-2/40">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Entrenador</div>
            <div className="text-xl font-semibold text-foreground">
              <NumberFlow value={lineup.coachPoints} format={{ maximumFractionDigits: 1 }} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-surface-2/40">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Banquillo (potencial)</div>
            <div className="text-xl font-semibold text-foreground">
              <NumberFlow value={lineup.benchExpected} format={{ maximumFractionDigits: 1 }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Titulares · {lineup.formation}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {lineup.starters.map((s) => (
              <PlayerScoreRow key={s.player.id} entry={s} showCaptain />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Banquillo</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {lineup.bench.length > 0 ? (
                lineup.bench.map((b) => <PlayerScoreRow key={b.player.id} entry={b} />)
              ) : (
                <p className="py-4 text-sm text-muted-foreground">Sin suplentes disponibles.</p>
              )}
            </CardContent>
          </Card>

          {lineup.coach && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Entrenador</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <PlayerScoreRow entry={lineup.coach} />
                <div className="mt-2 text-xs text-muted-foreground">
                  {prediction.coachPrediction.notes.join(' · ')}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryChart({ history }: { history: Awaited<ReturnType<typeof fantasyAPI.getScorePredictions>>['history'] }) {
  if (history.length === 0) return null;

  const byWeek = new Map<number, typeof history>();
  for (const h of history) {
    const list = byWeek.get(h.week) || [];
    list.push(h);
    byWeek.set(h.week, list);
  }

  const weeks = [...byWeek.keys()].sort((a, b) => a - b);
  if (weeks.length < 2) return null;

  const maxTotal = Math.max(...history.map((h) => h.totalExpected), 1);
  const barWidth = 24;
  const gap = 8;
  const width = weeks.length * (barWidth + gap) + 40;
  const height = 160;
  const chartHeight = 120;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Evolución por jornadas</CardTitle>
        <CardDescription>Media de puntos esperados por jornada</CardDescription>
      </CardHeader>
      <CardContent>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          {weeks.map((week, i) => {
            const list = byWeek.get(week)!;
            const avg = list.reduce((sum, h) => sum + h.totalExpected, 0) / list.length;
            const h = (avg / maxTotal) * chartHeight;
            const x = i * (barWidth + gap) + 20;
            const y = chartHeight - h + 20;
            return (
              <g key={week}>
                <rect x={x} y={y} width={barWidth} height={h} className="fill-foreground/70" rx={4} />
                <text x={x + barWidth / 2} y={chartHeight + 36} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                  J{week}
                </text>
                <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" className="fill-foreground text-[10px]">
                  {avg.toFixed(1)}
                </text>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}

export default function ScorePredictionsTab({ league }: ScorePredictionsTabProps) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['score-predictions', league.id, league.team.id],
    queryFn: () => fantasyAPI.getScorePredictions(league.id, league.team.id),
  });
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  if (isLoading) return <ScoreSkeleton />;
  if (error) return <ErrorState title="Error cargando predicciones" description={error.message} onRetry={refetch} />;
  if (!data) return null;

  const { predictions, notes, week, history } = data;
  const leader = predictions[0];
  const average = predictions.reduce((sum, p) => sum + p.predictedLineup.totalExpected, 0) / Math.max(predictions.length, 1);
  const lowQualityCount = predictions.filter((p) => p.predictedLineup.dataQuality.level === 'low').length;

  const columns: ColumnDef<TeamScorePrediction>[] = [
    {
      accessorKey: 'managerName',
      header: 'Equipo',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{row.original.managerName}</span>
          {row.original.predictedLineup.inferred && (
            <Badge variant="warning" className="text-[10px]">Inferido</Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'predictedLineup.totalExpected',
      header: 'xP total',
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">
          <NumberFlow value={row.original.predictedLineup.totalExpected} format={{ maximumFractionDigits: 1 }} />
        </span>
      ),
    },
    {
      accessorKey: 'predictedLineup.fieldExpected',
      header: 'Titulares',
      cell: ({ row }) => row.original.predictedLineup.fieldExpected.toFixed(1),
    },
    {
      accessorKey: 'predictedLineup.captainBonus',
      header: 'Capitán',
      cell: ({ row }) => row.original.predictedLineup.captainBonus.toFixed(1),
    },
    {
      accessorKey: 'predictedLineup.coachPoints',
      header: 'Entrenador',
      cell: ({ row }) => row.original.predictedLineup.coachPoints.toFixed(1),
    },
    {
      accessorKey: 'predictedLineup.dataQuality.level',
      header: 'Confianza',
      cell: ({ row }) => {
        const level = row.original.predictedLineup.dataQuality.level;
        return <Badge variant={dataQualityVariant(level)} className="text-[10px]">{dataQualityLabel(level)}</Badge>;
      },
    },
  ];

  const toggle = (id: number) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <SectionHeader
        title="Puntuación"
        description={`Predicción de puntos por equipo · Jornada ${week} · ${league.name}`}
      />

      {notes.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4">
            {notes.map((note) => (
              <p key={note} className="flex items-start gap-2 text-sm text-amber-200/90">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {note}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Trophy className="h-5 w-5" />}
          label="Líder predicho"
          value={leader.managerName}
          sub={`${leader.predictedLineup.totalExpected.toFixed(1)} xP`}
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Media de la liga"
          value={average}
          suffix=" xP"
        />
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Equipos predichos"
          value={predictions.length}
        />
        <KpiCard
          icon={<Shield className="h-5 w-5" />}
          label="Predicciones de baja confianza"
          value={lowQualityCount}
          sub={`de ${predictions.length}`}
        />
      </div>

      <HistoryChart history={history} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clasificación por puntos esperados</CardTitle>
          <CardDescription>Click en una fila para ver el detalle de la alineación</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={predictions}
            pageSize={20}
            onRowClick={(row) => toggle(row.teamId)}
          />
          {predictions.map((p) => (
            <div key={p.teamId}>
              {expanded.has(p.teamId) && (
                <div className="mt-4 border-t border-white/[0.06] pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{p.managerName}</h3>
                    <Button variant="ghost" size="sm" onClick={() => toggle(p.teamId)}>
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                  </div>
                  <TeamDetail prediction={p} />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
