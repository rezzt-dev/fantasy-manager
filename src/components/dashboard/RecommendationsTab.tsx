'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import fantasyAPI from '../../lib/fantasy/api';
import type { FantasyLeague, Recommendation } from '../../types/fantasy';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { StaggerContainer, StaggerItem } from '../ui/motion';
import PlayerAvatar from '../shared/PlayerAvatar';
import PlayerStatusBadge from '../shared/PlayerStatusBadge';
import Currency from '../shared/Currency';
import ErrorState from '../shared/ErrorState';
import SectionHeader from '../shared/SectionHeader';
import SignalChips from '../shared/SignalChips';
import EmptyState from '../shared/EmptyState';
import MultiWeekPlan from './MultiWeekPlan';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Lightbulb,
  Banknote,
  AlertTriangle,
  ArrowRightLeft,
  ShieldCheck,
  Trophy,
  Filter,
  TrendingDown,
  TrendingUp,
  Crown,
  Gavel,
  Sparkles,
  ShoppingCart,
  Users,
  Shield,
} from 'lucide-react';
import { positionShortName } from '../../lib/format';

interface RecommendationsTabProps {
  league: FantasyLeague;
}

type FilterType = 'all' | Recommendation['type'];

export default function RecommendationsTab({ league }: RecommendationsTabProps) {
  const teamId = league.team.id;
  const leagueId = league.id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['recommendations', leagueId, teamId],
    queryFn: () => fantasyAPI.getRecommendations(leagueId, teamId),
    enabled: !!teamId,
  });

  const [typeFilter, setTypeFilter] = useState<FilterType>('all');

  const recommendations = data?.recommendations || [];
  const bestMoves: Recommendation[] = data?.bestMoves || [];
  const money = data?.money;
  const multiWeekPlan = data?.multiWeekPlan;

  const grouped = useMemo(() => {
    return recommendations.reduce<Record<string, Recommendation[]>>((acc, rec) => {
      acc[rec.type] = acc[rec.type] || [];
      acc[rec.type].push(rec);
      return acc;
    }, {});
  }, [recommendations]);

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return recommendations;
    return recommendations.filter((r) => r.type === typeFilter);
  }, [recommendations, typeFilter]);

  if (isLoading) return <RecommendationsSkeleton />;
  if (error) return <ErrorState title="Error cargando recomendaciones" description={error.message} onRetry={refetch} />;

  const buyRecs = grouped.buy || [];
  const sellRecs = grouped.sell || [];
  const clauseRecs = (grouped.increase_clause || []).concat(grouped.protect_clause || []);
  const captainRec = (grouped.captain || [])[0];

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <SectionHeader
        title="Recomendaciones"
        description="Análisis de tu equipo y el mercado para esta jornada."
      />

      {captainRec && <CaptainCard recommendation={captainRec} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CountCard icon={<Banknote className="h-4 w-4" />} label="Compras" count={buyRecs.length} color="emerald" />
        <CountCard icon={<AlertTriangle className="h-4 w-4" />} label="Ventas" count={sellRecs.length} color="rose" />
        <CountCard icon={<ArrowRightLeft className="h-4 w-4" />} label="Alineación" count={grouped.change_lineup?.length || 0} color="indigo" />
        <CountCard icon={<ShieldCheck className="h-4 w-4" />} label="Cláusulas" count={clauseRecs.length + (grouped.decrease_clause?.length || 0)} color="amber" />
      </div>

      {bestMoves.length > 0 && (
        <Card className="border-foreground/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-foreground" />
              Mejores movimientos de la jornada
            </CardTitle>
            <CardDescription>
              Las acciones con más impacto considerando tu plantilla, el mercado y las plantillas de tus rivales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {bestMoves.map((move, idx) => (
                <li
                  key={move.id}
                  className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-surface-2/50 p-3"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] font-display text-xs font-bold text-foreground">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <SourceBadge source={move.source} />
                      <span className="text-xs text-muted-foreground">{typeMeta(move.type).badge}</span>
                      {typeof move.impactScore === 'number' && (
                        <span className="ml-auto text-xs font-semibold text-foreground">+{move.impactScore} pts</span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-foreground">{move.player.nickname}</div>
                    <p className="text-xs text-muted-foreground">{move.reason}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  Oportunidades de compra
                </CardTitle>
                <CardDescription>{buyRecs.length} jugadores recomendados</CardDescription>
              </div>
              {buyRecs.length > 0 && <Badge variant="muted">{buyRecs.length}</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {buyRecs.length === 0 ? (
              <EmptyState compact title="Sin recomendaciones de compra" description="No hay oportunidades claras en este momento." />
            ) : (
              <StaggerContainer className="space-y-3" stagger={0.04}>
                {buyRecs.slice(0, 5).map((rec) => (
                  <StaggerItem key={rec.id}>
                    <CompactRecommendationCard recommendation={rec} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  Jugadores a vender
                </CardTitle>
                <CardDescription>{sellRecs.length} jugadores en riesgo</CardDescription>
              </div>
              {sellRecs.length > 0 && <Badge variant="muted">{sellRecs.length}</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {sellRecs.length === 0 ? (
              <EmptyState compact title="Sin recomendaciones de venta" description="Tu plantilla no tiene señales de salida urgentes." />
            ) : (
              <StaggerContainer className="space-y-3" stagger={0.04}>
                {sellRecs.slice(0, 5).map((rec) => (
                  <StaggerItem key={rec.id}>
                    <CompactRecommendationCard recommendation={rec} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <MultiWeekPlan plan={multiWeekPlan} />

      <Card>
        <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
              Todas las acciones sugeridas
            </CardTitle>
            <CardDescription>
              {filtered.length} de {recommendations.length} recomendaciones
              {money && ` · Dinero disponible: ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(money.teamMoney)}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as FilterType)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="buy">Comprar</SelectItem>
                <SelectItem value="sell">Vender</SelectItem>
                <SelectItem value="change_lineup">Cambiar alineación</SelectItem>
                <SelectItem value="increase_clause">Subir cláusula</SelectItem>
                <SelectItem value="protect_clause">Proteger cláusula</SelectItem>
                <SelectItem value="decrease_clause">Bajar cláusula</SelectItem>
                <SelectItem value="buyout">Clausulazo</SelectItem>
                <SelectItem value="captain">Capitán</SelectItem>
                <SelectItem value="watch">Observar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <EmptyState title="Todo en orden" description="No hay recomendaciones para esta jornada." icon={<Trophy className="h-6 w-6" />} />
          ) : (
            <StaggerContainer className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" stagger={0.04}>
              {filtered.map((rec) => (
                <StaggerItem key={rec.id}>
                  <RecommendationCard recommendation={rec} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
          {filtered.length === 0 && recommendations.length > 0 && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Ninguna recomendación coincide con el filtro seleccionado.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CompactRecommendationCard({ recommendation: rec }: { recommendation: Recommendation }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-card p-3 transition-colors hover:bg-surface-2">
      <PlayerAvatar player={rec.player} size="md" showPosition />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-card-foreground">{rec.player.nickname}</div>
        <p className="text-xs text-muted-foreground line-clamp-1">{rec.reason}</p>
      </div>
      <div className="shrink-0 text-muted-foreground">
        {rec.type === 'buy' ? <TrendingDown className="h-4 w-4" /> : rec.type === 'sell' ? <TrendingUp className="h-4 w-4" /> : typeMeta(rec.type).icon}
      </div>
    </div>
  );
}

function RecommendationCard({ recommendation: rec }: { recommendation: Recommendation }) {
  const { icon, badge, badgeClass } = typeMeta(rec.type);
  const priorityClass =
    rec.priority === 'high'
      ? 'border-l-[5px] border-l-foreground'
      : rec.priority === 'medium'
      ? 'border-l-[5px] border-l-white/[0.50]'
      : 'border-l-[5px] border-l-white/[0.25]';

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-card p-4 transition-colors hover:bg-surface-2 ${priorityClass}`}
    >
      <div className="flex items-start gap-3">
        <PlayerAvatar player={rec.player} size="md" showPosition />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
              {icon}
              {badge}
            </span>
            {rec.priority === 'high' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-2 py-0.5 text-xs font-semibold text-foreground">
                <AlertTriangle className="h-3 w-3" /> Alta
              </span>
            )}
          </div>
          <h4 className="truncate font-semibold text-card-foreground">{rec.player.nickname}</h4>
          <div className="text-xs text-muted-foreground">
            {positionShortName(rec.player.position, rec.player.positionId)} · {rec.player.team?.name || 'Sin equipo'}
          </div>
        </div>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{rec.reason}</p>
        {rec.details && <p className="mt-1 text-xs text-muted-foreground">{rec.details}</p>}
        {typeof rec.riskScore === 'number' && (
          <p className="mt-1 text-xs font-semibold text-foreground">Riesgo de clausulazo: {rec.riskScore}/100</p>
        )}
        {typeof rec.recommendedClause === 'number' && rec.recommendedClause > 0 && (
          <p className="mt-1 text-xs font-semibold text-foreground">
            Cláusula recomendada: <Currency value={rec.recommendedClause} />
          </p>
        )}
        {rec.externalSignals && rec.externalSignals.length > 0 && <SignalChips signals={rec.externalSignals} />}
        {rec.estimatedValue && (
          <div className="mt-2 text-sm font-semibold text-foreground">
            Valor estimado: <Currency value={rec.estimatedValue} />
          </div>
        )}
        {typeof rec.suggestedBidPrice === 'number' && rec.suggestedBidPrice > 0 && (
          <div className="mt-1 text-sm font-semibold text-emerald-400">
            Puja sugerida: <Currency value={rec.suggestedBidPrice} />
          </div>
        )}
        {rec.suggestedAction && <p className="mt-2 text-sm font-semibold text-foreground">{rec.suggestedAction}</p>}
      </div>
    </div>
  );
}

function CaptainCard({ recommendation: rec }: { recommendation: Recommendation }) {
  return (
    <Card className="relative overflow-hidden border-foreground/10">
      <div className="absolute right-0 top-0 h-24 w-24 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/[0.03] blur-2xl" />
      <CardHeader className="relative pb-3">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-foreground" />
          <CardTitle className="text-base">Recomendación de capitán</CardTitle>
        </div>
        <CardDescription>{rec.details}</CardDescription>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex items-center gap-4">
          <PlayerAvatar player={rec.player} size="lg" showPosition />
          <div className="min-w-0 flex-1">
            <div className="text-xl font-bold text-card-foreground">{rec.player.nickname}</div>
            <p className="text-sm text-muted-foreground">{rec.reason}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{rec.suggestedAction}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SourceBadge({ source }: { source?: Recommendation['source'] }) {
  if (source === 'market') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
        <ShoppingCart className="h-3 w-3" /> Mercado
      </span>
    );
  }
  if (source === 'rival') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-400">
        <Shield className="h-3 w-3" /> Rival
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-foreground">
      <Users className="h-3 w-3" /> Plantilla
    </span>
  );
}

function typeMeta(type: Recommendation['type']) {
  const badgeClass = 'bg-white/[0.06] text-foreground border border-white/[0.08]';
  switch (type) {
    case 'buy':
      return { icon: <Banknote className="h-4 w-4" />, badge: 'Comprar', badgeClass };
    case 'sell':
      return { icon: <AlertTriangle className="h-4 w-4" />, badge: 'Vender', badgeClass };
    case 'change_lineup':
      return { icon: <ArrowRightLeft className="h-4 w-4" />, badge: 'Alineación', badgeClass };
    case 'captain':
      return { icon: <Crown className="h-4 w-4" />, badge: 'Capitán', badgeClass };
    case 'increase_clause':
    case 'protect_clause':
      return { icon: <ShieldCheck className="h-4 w-4" />, badge: type === 'protect_clause' ? 'Proteger cláusula' : 'Subir cláusula', badgeClass };
    case 'decrease_clause':
      return { icon: <ShieldCheck className="h-4 w-4" />, badge: 'Bajar cláusula', badgeClass };
    case 'buyout':
      return { icon: <Gavel className="h-4 w-4" />, badge: 'Clausulazo', badgeClass };
    default:
      return { icon: <Lightbulb className="h-4 w-4" />, badge: 'Observar', badgeClass };
  }
}

function CountCard({
  icon,
  label,
  count,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: 'emerald' | 'rose' | 'indigo' | 'amber';
}) {
  const colorClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  }[color];

  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-surface-2 p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${colorClasses}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold font-display text-foreground">{count}</div>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function RecommendationsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}
