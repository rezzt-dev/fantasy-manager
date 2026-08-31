import type { LeagueAnalysis } from '../../types/analysis';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import Currency from '../shared/Currency';
import { TrendingUp, Users, Wallet, Activity } from 'lucide-react';

interface SummaryCardsProps {
  analysis: LeagueAnalysis;
}

export default function SummaryCards({ analysis }: SummaryCardsProps) {
  const { aggregates, standing, market } = analysis;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        icon={<TrendingUp className="h-5 w-5 text-content" />}
        label="Valor total de la liga"
        value={<Currency value={aggregates.totalLeagueValue} />}
        sub={`Media: ${formatCompact(aggregates.averageTeamValue)}`}
      />
      <KpiCard
        icon={<Wallet className="h-5 w-5 text-content-secondary" />}
        label="Dinero disponible"
        value={<Currency value={aggregates.totalMoneyAvailable} />}
        sub="Suma de todos los managers"
      />
      <KpiCard
        icon={<Users className="h-5 w-5 text-content-secondary" />}
        label="Jugadores en plantillas"
        value={aggregates.totalPlayers.toString()}
        sub={`${standing.length} equipos · ${market.length} en venta`}
      />
      <KpiCard
        icon={<Activity className="h-5 w-5 text-content-secondary" />}
        label="Jugadores no disponibles"
        value={aggregates.injuredPlayers.toString()}
        sub="Lesionados, dudosos o fuera"
      />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-content-tertiary">
          {icon}
          <span className="text-xs font-medium text-content-secondary">{label}</span>
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight text-content">{value}</div>
        {sub && <div className="text-xs text-content-tertiary">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
