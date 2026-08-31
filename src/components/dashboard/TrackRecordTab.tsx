'use client';

import { useQuery } from '@tanstack/react-query';
import fantasyAPI from '../../lib/fantasy/api';
import type { FantasyLeague } from '../../types/fantasy';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import ErrorState from '../shared/ErrorState';
import SectionHeader from '../shared/SectionHeader';
import EmptyState from '../shared/EmptyState';
import TrackRecordChart from './TrackRecordChart';
import NumberFlow from '@number-flow/react';
import { TrendingUp, Target, Award, BarChart3, AlertCircle } from 'lucide-react';

interface TrackRecordTabProps {
  league: FantasyLeague;
}

function formatMetric(value: number | null, suffix = ''): string {
  if (value === null) return '—';
  return `${value}${suffix}`;
}

function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-content-tertiary">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.09] bg-surface-raised text-content">
            {icon}
          </span>
          <span className="text-xs font-medium uppercase tracking-wider">{title}</span>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold font-display tracking-tight text-content">
              {typeof value === 'number' ? <NumberFlow value={value} format={{ maximumFractionDigits: 2 }} /> : value}
            </div>
            <div className="mt-0.5 text-xs text-content-tertiary">{description}</div>
          </div>
          {trend && <Badge variant="secondary" className="text-[10px]">{trend}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TrackRecordTab({ league }: TrackRecordTabProps) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['track-record', league.id],
    queryFn: () => fantasyAPI.getTrackRecord(league.id),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Track record" description="Rendimiento real del motor por jornada" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) return (
      <ErrorState
        title="No hemos podido leer el histórico del motor"
        description="El acierto del motor se guarda jornada a jornada en disco. Si el fichero aún no existe para esta liga, aparecerá tras la primera jornada liquidada."
        detail={error.message}
        onRetry={refetch}
      />
    );
  if (!data) return null;

  const { summary, walkForward, calibration, notes } = data;
  const { totals } = summary;
  const maeDelta =
    totals.maeXp !== null && totals.maeLegacy !== null && totals.maeLegacy > 0
      ? Math.round(((totals.maeXp - totals.maeLegacy) / totals.maeLegacy) * 100)
      : null;

  const hasSettled = summary.weeks.some((w) => w.settled > 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        as="h1"
        eyebrow={`Acierto del motor · jornada ${data.week}`}
        title="Cuánto acierta de verdad"
        description="Cada predicción se guarda y se compara con los puntos reales de la jornada. Si el modelo falla más que el baseline, aquí se ve."
      />

      {notes.length > 0 && (
        <Card className="border-caution/25 bg-caution-quiet">
          <CardContent className="pt-4">
            {notes.map((note) => (
              <p key={note} className="text-sm text-caution-text">{note}</p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          icon={<BarChart3 className="h-5 w-5" />}
          title="MAE modelo vs baseline"
          value={totals.maeXp !== null && totals.maeLegacy !== null ? `${totals.maeXp} / ${totals.maeLegacy}` : '—'}
          description={maeDelta !== null ? `${maeDelta}% respecto al motor anterior` : 'Error medio de puntos por jugador'}
          trend={maeDelta !== null && maeDelta < 0 ? 'Mejorando' : undefined}
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          title="Spearman (ranking)"
          value={totals.spearmanXp ?? '—'}
          description="Correlación entre ranking predicho y real"
        />
        <MetricCard
          icon={<Target className="h-5 w-5" />}
          title="Top-11 hit rate"
          value={totals.top11HitRate !== null ? `${(totals.top11HitRate * 100).toFixed(0)}%` : '—'}
          description="Titulares del once recomendado en el ideal"
        />
        <MetricCard
          icon={<Award className="h-5 w-5" />}
          title="Puntos del capitán"
          value={totals.captainPointsAvg ?? '—'}
          description="Media de puntos reales del capitán recomendado"
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          title="Precision@5 compras"
          value={totals.buyPrecision5 !== null ? `${Math.round(totals.buyPrecision5 * 100)}%` : '—'}
          description="Compras top-5 que cumplieron sus xP"
        />
        <MetricCard
          icon={<BarChart3 className="h-5 w-5" />}
          title="ROI de fichajes"
          value={totals.buyRoiPerMillion !== null ? `${totals.buyRoiPerMillion} pts/M€` : '—'}
          description="Puntos reales por millón gastado"
        />
      </div>

      {hasSettled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolución por jornada</CardTitle>
            <CardDescription>MAE, Spearman y top-11 hit rate a lo largo de la temporada</CardDescription>
          </CardHeader>
          <CardContent>
            <TrackRecordChart weeks={summary.weeks} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Por jornada</CardTitle>
          <CardDescription>
            {totals.settled > 0
              ? `${totals.settled} predicciones liquidadas de ${totals.predictions} persistidas`
              : `${totals.predictions} predicciones persistidas; se liquidan al cerrarse cada jornada`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary.weeks.length === 0 ? (
            <EmptyState
              compact
              title="Aún no hay jornadas liquidadas"
              description="El acierto del motor se mide comparando su predicción con los puntos reales. La primera medición llega tras el cierre de la próxima jornada."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.09] text-left text-xs text-content-tertiary">
                    <th className="py-2 pr-4 font-medium">Jornada</th>
                    <th className="py-2 pr-4 font-medium">Predicciones</th>
                    <th className="py-2 pr-4 font-medium">MAE modelo</th>
                    <th className="py-2 pr-4 font-medium">MAE baseline</th>
                    <th className="py-2 pr-4 font-medium">Spearman</th>
                    <th className="py-2 pr-4 font-medium">Top-11</th>
                    <th className="py-2 font-medium">Capitán</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.weeks.map((week) => (
                    <tr key={week.week} className="border-b border-white/[0.09] last:border-0">
                      <td className="py-2 pr-4 font-medium">J{week.week}</td>
                      <td className="py-2 pr-4 text-content-tertiary">{week.settled}/{week.predictions}</td>
                      <td className="py-2 pr-4">{formatMetric(week.maeXp)}</td>
                      <td className="py-2 pr-4">{formatMetric(week.maeLegacy)}</td>
                      <td className="py-2 pr-4">{formatMetric(week.spearmanXp)}</td>
                      <td className="py-2 pr-4">{formatMetric(week.top11HitRate)}</td>
                      <td className="py-2">{formatMetric(week.captainPoints)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="walk-forward">
          <AccordionTrigger>Walk-forward (forma)</AccordionTrigger>
          <AccordionContent>
            {walkForward && walkForward.samples > 0 ? (
              <p className="text-sm">
                MAE baseline {walkForward.maeLegacy} · MAE decaimiento {walkForward.maeV1} · {walkForward.samples} muestras
              </p>
            ) : (
              <p className="text-sm text-content-tertiary">{walkForward?.note ?? 'Sin datos todavía.'}</p>
            )}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="calibration">
          <AccordionTrigger>Calibración automática</AccordionTrigger>
          <AccordionContent>
            {calibration?.status === 'ok' && calibration.best ? (
              <p className="text-sm">
                Mejor configuración: k={calibration.best.shrinkageK}, divisor Elo={calibration.best.eloDiffDivisor} · MAE{' '}
                {calibration.best.mae} ({calibration.samples} muestras)
              </p>
            ) : (
              <p className="text-sm text-content-tertiary">
                {calibration?.note ?? 'Se activará cuando haya suficientes jornadas liquidadas (mínimo 30 muestras jugador-jornada).'}
              </p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
