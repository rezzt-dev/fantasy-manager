'use client';

import { useQuery } from '@tanstack/react-query';
import fantasyAPI from '../../lib/fantasy/api';
import type { FantasyLeague } from '../../types/fantasy';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import ErrorState from '../shared/ErrorState';
import SectionHeader from '../shared/SectionHeader';

interface TrackRecordTabProps {
  league: FantasyLeague;
}

function formatMetric(value: number | null, suffix = ''): string {
  if (value === null) return '—';
  return `${value}${suffix}`;
}

function MetricCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs">{title}</CardDescription>
        <CardTitle className="text-2xl font-display">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

/**
 * Track record del motor (§6.3): métricas reales de las predicciones y
 * recomendaciones frente a los puntos reales de cada jornada. La transparencia
 * de la mejora: si el modelo nuevo no bate al baseline, aquí se ve.
 */
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
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) return <ErrorState title="Error cargando el track record" description={error.message} onRetry={refetch} />;
  if (!data) return null;

  const { summary, walkForward, calibration, notes } = data;
  const { totals } = summary;
  const maeDelta = totals.maeXp !== null && totals.maeLegacy !== null && totals.maeLegacy > 0
    ? Math.round(((totals.maeXp - totals.maeLegacy) / totals.maeLegacy) * 100)
    : null;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Track record"
        description={`Rendimiento real del motor en ${league.name} · jornada actual ${data.week}`}
      />

      {notes.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4">
            {notes.map((note) => (
              <p key={note} className="text-sm text-amber-200/90">{note}</p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="MAE modelo vs baseline"
          value={totals.maeXp !== null && totals.maeLegacy !== null ? `${totals.maeXp} / ${totals.maeLegacy}` : '—'}
          description={maeDelta !== null ? `${maeDelta}% respecto al motor anterior (objetivo: −20-30%)` : 'Error medio de puntos por jugador, al liquidarse jornadas'}
        />
        <MetricCard
          title="Spearman (ranking)"
          value={formatMetric(totals.spearmanXp)}
          description="Correlación entre el ranking predicho y el real (objetivo: ≥ 0.6)"
        />
        <MetricCard
          title="Top-11 hit rate"
          value={formatMetric(totals.top11HitRate, '')}
          description="Titulares del once recomendado que quedaron en el once ideal de la jornada"
        />
        <MetricCard
          title="Puntos del capitán"
          value={formatMetric(totals.captainPointsAvg)}
          description="Media de puntos reales del capitán recomendado (objetivo: +50-100% vs media)"
        />
        <MetricCard
          title="Precision@5 compras"
          value={totals.buyPrecision5 !== null ? `${Math.round(totals.buyPrecision5 * 100)}%` : '—'}
          description="Compras top-5 que cumplieron sus puntos esperados"
        />
        <MetricCard
          title="ROI de fichajes"
          value={totals.buyRoiPerMillion !== null ? `${totals.buyRoiPerMillion} pts/M€` : '—'}
          description="Puntos reales por millón gastado en compras liquidadas"
        />
      </div>

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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs text-muted-foreground">
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
                  <tr key={week.week} className="border-b border-white/[0.04] last:border-0">
                    <td className="py-2 pr-4 font-medium">J{week.week}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{week.settled}/{week.predictions}</td>
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
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Walk-forward (forma)</CardTitle>
            <CardDescription>Media simple vs media con decaimiento, sin factores de fixture</CardDescription>
          </CardHeader>
          <CardContent>
            {walkForward && walkForward.samples > 0 ? (
              <p className="text-sm">
                MAE baseline {walkForward.maeLegacy} · MAE decaimiento {walkForward.maeV1} · {walkForward.samples} muestras
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{walkForward?.note ?? 'Sin datos todavía.'}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Calibración automática</CardTitle>
            <CardDescription>Búsqueda de pesos por backtesting walk-forward (§8, Fase 3)</CardDescription>
          </CardHeader>
          <CardContent>
            {calibration?.status === 'ok' && calibration.best ? (
              <p className="text-sm">
                Mejor configuración: k={calibration.best.shrinkageK}, divisor Elo={calibration.best.eloDiffDivisor} · MAE {calibration.best.mae} ({calibration.samples} muestras)
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {calibration?.note ?? 'Se activará cuando haya suficientes jornadas liquidadas (mínimo 30 muestras jugador-jornada).'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
