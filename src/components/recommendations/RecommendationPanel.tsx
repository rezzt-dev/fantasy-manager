import { useQuery } from '@tanstack/react-query';
import fantasyAPI from '../../lib/fantasy/api';
import type { FantasyLeague, Recommendation } from '../../types/fantasy';
import {
  ArrowRightLeft,
  AlertTriangle,
  Banknote,
  ShieldCheck,
  Trophy,
  UserRound,
  Crown,
  Gavel,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import SignalChips from '../shared/SignalChips';

export default function RecommendationPanel({
  league,
}: {
  league: FantasyLeague;
}) {
  const teamId = league.team.id;
  const leagueId = league.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ['recommendations', leagueId, teamId],
    queryFn: () => fantasyAPI.getRecommendations(leagueId, teamId),
    enabled: !!teamId,
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-white/[0.09] bg-surface p-5">
        <h3 className="mb-3 text-base font-semibold text-content">Recomendaciones</h3>
        <div className="py-4 text-sm text-content-tertiary">Analizando tu equipo y el mercado...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-negative/30 bg-surface p-5 text-negative-text">
        <h3 className="mb-2 text-base font-semibold">Recomendaciones</h3>
        <p className="text-sm text-content-tertiary">No se han podido generar las recomendaciones: {error.message}</p>
      </div>
    );
  }

  const recommendations = data?.recommendations || [];
  const money = data?.money;

  const grouped = recommendations.reduce<Record<string, Recommendation[]>>((acc, rec) => {
    acc[rec.type] = acc[rec.type] || [];
    acc[rec.type].push(rec);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-white/[0.09] bg-surface p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-content">Recomendaciones</h3>
          {money && (
            <span className="text-sm text-content-tertiary">
              Dinero disponible: <strong className="text-content">{formatCurrency(money.teamMoney)}</strong>
            </span>
          )}
        </div>

        {recommendations.length === 0 ? (
          <div className="rounded-lg border border-white/[0.09] bg-surface-raised p-4 text-content">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-content-tertiary" />
              <span className="font-medium">Tu equipo está bien equilibrado</span>
            </div>
            <p className="mt-1 text-sm text-content-tertiary">No hay recomendaciones urgentes para esta jornada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <RecommendationCard key={rec.id} recommendation={rec} />
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CountCard icon={<Banknote className="h-4 w-4" />} label="Compras" count={grouped.buy?.length || 0} />
        <CountCard icon={<AlertTriangle className="h-4 w-4" />} label="Ventas" count={grouped.sell?.length || 0} />
        <CountCard icon={<ArrowRightLeft className="h-4 w-4" />} label="Alineación" count={grouped.change_lineup?.length || 0} />
        <CountCard icon={<ShieldCheck className="h-4 w-4" />} label="Cláusulas" count={(grouped.increase_clause?.length || 0) + (grouped.protect_clause?.length || 0) + (grouped.buyout?.length || 0)} />
      </div>
    </div>
  );
}

function RecommendationCard({ recommendation: rec }: { recommendation: Recommendation }) {
  const { icon, label, variant } = typeMeta(rec.type);

  return (
    <div className="rounded-lg border border-white/[0.09] bg-surface p-4 transition-colors hover:bg-surface-raised">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-content-tertiary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge variant={variant as never} className="text-[10px]">
              {label}
            </Badge>
            {rec.priority === 'high' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-negative-quiet px-2 py-0.5 text-xs font-medium text-negative-text">
                <AlertTriangle className="h-3 w-3" /> Prioridad alta
              </span>
            )}
          </div>
          <h4 className="font-semibold text-content">{rec.player.nickname}</h4>
          <p className="text-sm text-content-tertiary">{rec.reason}</p>
          {rec.details && <p className="mt-1 text-xs text-content-tertiary">{rec.details}</p>}
          {typeof rec.riskScore === 'number' && (
            <p className="mt-1 text-xs font-medium text-negative-text">Riesgo de clausulazo: {rec.riskScore}/100</p>
          )}
          {typeof rec.recommendedClause === 'number' && rec.recommendedClause > 0 && (
            <p className="mt-1 text-xs font-medium text-content">
              Cláusula recomendada: {formatCurrency(rec.recommendedClause)}
            </p>
          )}
          {typeof rec.suggestedBidPrice === 'number' && rec.suggestedBidPrice > 0 && (
            <p className="mt-1 text-xs font-medium text-positive-text">
              Puja sugerida: {formatCurrency(rec.suggestedBidPrice)}
            </p>
          )}
          {rec.externalSignals && rec.externalSignals.length > 0 && (
            <SignalChips signals={rec.externalSignals} />
          )}
          {rec.suggestedAction && (
            <p className="mt-2 text-sm font-medium text-content">{rec.suggestedAction}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function typeMeta(type: Recommendation['type']) {
  switch (type) {
    case 'buy':
      return { icon: <Banknote className="h-5 w-5" />, label: 'Comprar', variant: 'success' as const };
    case 'sell':
      return { icon: <AlertTriangle className="h-5 w-5" />, label: 'Vender', variant: 'danger' as const };
    case 'change_lineup':
      return { icon: <ArrowRightLeft className="h-5 w-5" />, label: 'Cambiar alineación', variant: 'warning' as const };
    case 'captain':
      return { icon: <Crown className="h-5 w-5" />, label: 'Capitán', variant: 'warning' as const };
    case 'increase_clause':
    case 'protect_clause':
      return { icon: <ShieldCheck className="h-5 w-5" />, label: type === 'protect_clause' ? 'Proteger cláusula' : 'Subir cláusula', variant: 'info' as const };
    case 'buyout':
      return { icon: <Gavel className="h-5 w-5" />, label: 'Clausulazo', variant: 'warning' as const };
    case 'decrease_clause':
      return { icon: <ShieldCheck className="h-5 w-5" />, label: 'Bajar cláusula', variant: 'muted' as const };
    default:
      return { icon: <UserRound className="h-5 w-5" />, label: 'Observar', variant: 'secondary' as const };
  }
}

function CountCard({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div className="rounded-lg border border-white/[0.09] bg-surface p-4">
      <div className="flex items-center gap-2 text-content-tertiary">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold text-content">{count}</div>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}
