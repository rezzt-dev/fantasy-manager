'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import fantasyAPI, { LaLigaFantasyClient } from '../../lib/fantasy/api';
import type { FantasyLeague, Recommendation, TeamPlayer, PlayerMaster } from '../../types/fantasy';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { StaggerContainer, StaggerItem } from '../ui/motion';
import PlayerAvatar from '../shared/PlayerAvatar';
import PlayerStatusBadge from '../shared/PlayerStatusBadge';
import Currency from '../shared/Currency';
import ErrorState from '../shared/ErrorState';
import SectionHeader from '../shared/SectionHeader';
import SignalChips from '../shared/SignalChips';
import EmptyState from '../shared/EmptyState';
import PlayerDetailDialog from '../shared/PlayerDetailDialog';
import {
  Lightbulb,
  Banknote,
  AlertTriangle,
  ArrowRightLeft,
  ShieldCheck,
  Trophy,
  TrendingDown,
  TrendingUp,
  Crown,
  Gavel,
  Sparkles,
  ShoppingCart,
  Users,
  Shield,
  Loader2,
  Check,
  X,
  Wallet,
  Clock,
  Plus,
  Lock,
} from 'lucide-react';
import { positionShortName } from '../../lib/format';

interface RecommendationsTabProps {
  league: FantasyLeague;
}

export default function RecommendationsTab({ league }: RecommendationsTabProps) {
  const teamId = league.team.id;
  const leagueId = league.id;
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['recommendations', leagueId, teamId],
    queryFn: () => fantasyAPI.getRecommendations(leagueId, teamId),
    enabled: !!teamId,
  });

  const { data: teamDataQuery } = useQuery({
    queryKey: ['team', leagueId, teamId],
    queryFn: () => fantasyAPI.getTeamData(leagueId, teamId),
    enabled: !!teamId,
  });

  const recommendations = data?.recommendations || [];
  const money = data?.money;
  const ownMoney = money?.teamMoney ?? 0;
  const teamPlayers = teamDataQuery?.players || [];

  // Dialog and Action states
  const [selectedDetailPlayer, setSelectedDetailPlayer] = useState<any | null>(null);
  const [activeAction, setActiveAction] = useState<{
    type: 'sell' | 'bid' | 'clausulazo' | 'shield' | 'clause_increase';
    player: PlayerMaster;
    defaultVal: string;
    marketId?: string;
    buyoutClause?: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionInput, setActionInput] = useState('');

  // Extract recommendations into categories
  const sellRecommendations = useMemo(() => recommendations.filter((r) => r.type === 'sell'), [recommendations]);
  const buyRecommendations = useMemo(() => recommendations.filter((r) => r.type === 'buy' || r.type === 'buyout'), [recommendations]);
  const futurePlans = useMemo(() => recommendations.filter((r) => r.type === 'watch' || r.type === 'wait' || r.type === 'protect_clause' || r.type === 'increase_clause'), [recommendations]);

  // Order all opportunities by impactScore for highlights
  const highlightedOpportunities = useMemo(() => {
    return [...recommendations]
      .filter((r) => r.type === 'buy' || r.type === 'buyout' || r.type === 'sell' || r.type === 'protect_clause')
      .sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0))
      .slice(0, 4);
  }, [recommendations]);

  if (isLoading) return <RecommendationsSkeleton />;
  if (error) return <ErrorState title="Error cargando recomendaciones" description={error.message} onRetry={refetch} />;

  const resetActionState = () => {
    setActiveAction(null);
    setActionInput('');
  };

  const handleActionClick = (
    type: NonNullable<typeof activeAction>['type'],
    player: PlayerMaster,
    defaultVal: string,
    marketId?: string,
    buyoutClause?: number
  ) => {
    setActiveAction({ type, player, defaultVal, marketId, buyoutClause });
    setActionInput(defaultVal);
  };

  const handleExecuteAction = async () => {
    if (!activeAction || isSubmitting) return;

    setIsSubmitting(true);
    const amountNum = parseInt(actionInput.replace(/\D/g, ''), 10) || 0;
    const player = activeAction.player;

    try {
      if (activeAction.type === 'sell') {
        if (!amountNum || amountNum <= 0) {
          toast.error('❌ Introduce un precio de venta válido.');
          setIsSubmitting(false);
          return;
        }
        await LaLigaFantasyClient.sellPlayerToMarket(leagueId, player.id, amountNum);
        toast.success(`⚽ ¡${player.nickname} puesto en venta por ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amountNum)}!`);
      } else if (activeAction.type === 'bid') {
        if (!amountNum || amountNum <= 0) {
          toast.error('❌ Introduce una cantidad de puja válida.');
          setIsSubmitting(false);
          return;
        }
        if (amountNum > ownMoney) {
          toast.error('❌ No tienes suficiente saldo para esta puja.');
          setIsSubmitting(false);
          return;
        }
        await LaLigaFantasyClient.makeBid(leagueId, activeAction.marketId || player.id, amountNum);
        toast.success(`⚽ Puja de ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amountNum)} por ${player.nickname} enviada con éxito!`);
      } else if (activeAction.type === 'clausulazo') {
        const cost = activeAction.buyoutClause || player.marketValue;
        if (cost > ownMoney) {
          toast.error('❌ No tienes suficiente saldo para pagar la cláusula.');
          setIsSubmitting(false);
          return;
        }
        await LaLigaFantasyClient.payBuyoutClause(leagueId, player.id, cost);
        toast.success(`🔥 ¡Clausulazo ejecutado! Has fichado a ${player.nickname} por ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(cost)}.`);
      } else if (activeAction.type === 'shield') {
        await LaLigaFantasyClient.shieldPlayer(leagueId, player.id);
        toast.success(`🛡️ ¡${player.nickname} blindado con éxito!`);
      } else if (activeAction.type === 'clause_increase') {
        if (!amountNum || amountNum <= 0) {
          toast.error('❌ Introduce un incremento de cláusula válido.');
          setIsSubmitting(false);
          return;
        }
        await LaLigaFantasyClient.increaseBuyoutClause(leagueId, player.id, 1, amountNum);
        toast.success(`📈 Cláusula de ${player.nickname} incrementada en ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amountNum)}!`);
      }

      setActiveAction(null);
      setActionInput('');

      // Reactive UI refresh
      await queryClient.invalidateQueries();
      refetch();
    } catch (err: any) {
      console.error('[Action Error]', err);
      toast.error(`❌ Error al ejecutar operación: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <SectionHeader
        title="Centro de Estrategia"
        description="Tu consejero inteligente para planificar fichajes, ventas y blindajes en LaLiga Fantasy."
      />

      {/* Header Indicators with high contrast styles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-white/[0.08] bg-surface-2/40 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium">PRESUPUESTO DISPONIBLE</div>
            <div className="mt-1 text-2xl font-bold font-display text-foreground">
              <Currency value={ownMoney} />
            </div>
          </div>
          <Wallet className="h-6 w-6 text-emerald-400 shrink-0" />
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-surface-2/40 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium">JUGADORES EN PLANTILLA</div>
            <div className="mt-1 text-2xl font-bold font-display text-foreground">{teamPlayers.length} / 24</div>
          </div>
          <Users className="h-6 w-6 text-blue-400 shrink-0" />
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-surface-2/40 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium">ACCIONES RECOMENDADAS</div>
            <div className="mt-1 text-2xl font-bold font-display text-foreground">{recommendations.length}</div>
          </div>
          <Lightbulb className="h-6 w-6 text-amber-400 shrink-0" />
        </div>
      </div>

      {/* 🔥 Oportunidades Destacadas (Highlights) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />
            Oportunidades Destacadas
          </CardTitle>
          <CardDescription>Movimientos prioritarios con el mayor impacto estimado en tu puntuación de la jornada (ΔxP).</CardDescription>
        </CardHeader>
        <CardContent>
          {highlightedOpportunities.length === 0 ? (
            <EmptyState compact title="Sin oportunidades destacadas" description="Tu plantilla y el mercado están equilibrados para esta jornada." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {highlightedOpportunities.map((rec) => (
                <div key={rec.id} className="rounded-xl border border-white/[0.06] bg-surface-2/50 p-4 flex items-start gap-3 hover:bg-surface-3 transition-colors">
                  <PlayerAvatar player={rec.player} size="lg" showPosition />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        rec.type === 'sell' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {rec.type === 'sell' ? 'Vender' : 'Comprar'}
                      </span>
                      {typeof rec.impactScore === 'number' && rec.impactScore > 0 && (
                        <span className="text-xs font-bold text-foreground">+{rec.impactScore.toFixed(1)} xP</span>
                      )}
                    </div>
                    <div className="font-bold text-sm text-foreground mt-1 truncate">{rec.player.nickname}</div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{rec.reason}</p>

                    {/* Action buttons inside highlight card */}
                    <div className="flex items-center gap-2 mt-3">
                      <Button variant="glass" size="xs" onClick={() => setSelectedDetailPlayer(rec.player)} className="text-xs text-muted-foreground hover:text-foreground">
                        Detalles
                      </Button>

                      {rec.type === 'sell' ? (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleActionClick('sell', rec.player, String(rec.player.marketValue))}
                          className="text-xs text-rose-400 border-rose-500/30 bg-rose-500/[0.04] hover:bg-rose-500/[0.12] hover:border-rose-500/50 hover:text-rose-300 font-semibold"
                        >
                          Vender jugador
                        </Button>
                      ) : rec.type === 'buy' ? (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleActionClick('bid', rec.player, String(rec.estimatedValue || rec.player.marketValue), rec.id)}
                          className="text-xs text-emerald-400 border-emerald-500/30 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.12] hover:border-emerald-500/50 hover:text-emerald-300 font-semibold"
                        >
                          Pujar ahora
                        </Button>
                      ) : rec.type === 'buyout' && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleActionClick('clausulazo', rec.player, '', undefined, rec.estimatedValue)}
                          className="text-xs text-amber-400 border-amber-500/30 bg-amber-500/[0.04] hover:bg-amber-500/[0.12] hover:border-amber-500/50 hover:text-amber-300 font-semibold"
                          disabled={ownMoney < (rec.estimatedValue || 0)}
                        >
                          Clausulazo
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid panels for Buy, Sell, and Future Plans */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* 🔴 VENTAS RECOMENDADAS */}
        <Card className="border-rose-500/10 shadow-[0_0_12px_-4px_rgba(244,63,94,0.08)]">
          <CardHeader className="pb-3 border-b border-white/[0.04] bg-rose-500/[0.01]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-rose-400">
                <AlertTriangle className="h-4 w-4" />
                Ventas Recomendadas
              </CardTitle>
              {sellRecommendations.length > 0 && <Badge variant="destructive" className="bg-rose-500/10 text-rose-400 border-rose-500/20">{sellRecommendations.length}</Badge>}
            </div>
            <CardDescription>Jugadores de tu plantilla con señales de caída de valor, baja probabilidad de minutos o lesiones.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 max-h-[500px] overflow-y-auto space-y-3 scrollbar-thin">
            {sellRecommendations.length === 0 ? (
              <EmptyState compact title="Sin recomendaciones de venta" description="No tienes jugadores en plantilla con señales de salida urgente." />
            ) : (
              sellRecommendations.map((rec) => (
                <div key={rec.id} className="rounded-xl border border-white/[0.06] bg-surface-2 p-3.5 space-y-3 hover:bg-surface-3 transition-colors">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar player={rec.player} size="md" showPosition />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-foreground truncate">{rec.player.nickname}</div>
                      <div className="text-xs text-muted-foreground">Valor: <Currency value={rec.player.marketValue} /> · xP: {(rec.impactScore || 0).toFixed(1)}</div>
                    </div>
                    {rec.priority === 'high' && (
                      <Badge variant="destructive" className="text-[10px] bg-rose-500/10 text-rose-400 border-rose-500/20 font-bold">ALTA</Badge>
                    )}
                  </div>

                  <div className="text-xs leading-relaxed text-muted-foreground bg-background/50 p-2.5 rounded-lg border border-white/[0.04]">
                    <div className="font-semibold text-foreground mb-1">Motivo:</div>
                    {rec.reason}
                  </div>

                  <div className="flex justify-between items-center pt-1 text-xs">
                    <span className="text-muted-foreground">Precio sugerido: <Currency value={rec.player.marketValue * 1.05} className="font-semibold text-foreground" /></span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="xs" onClick={() => setSelectedDetailPlayer(rec.player)}>Ver</Button>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleActionClick('sell', rec.player, String(rec.player.marketValue))}
                        className="text-rose-400 border-rose-500/30 bg-rose-500/[0.04] hover:bg-rose-500/[0.12] hover:border-rose-500/50 hover:text-rose-300 font-semibold"
                      >
                        Vender
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 🟢 COMPRAS RECOMENDADAS */}
        <Card className="border-emerald-500/10 shadow-[0_0_12px_-4px_rgba(16,185,129,0.08)]">
          <CardHeader className="pb-3 border-b border-white/[0.04] bg-emerald-500/[0.01]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-emerald-400">
                <ShoppingCart className="h-4 w-4" />
                Compras Recomendadas
              </CardTitle>
              {buyRecommendations.length > 0 && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{buyRecommendations.length}</Badge>}
            </div>
            <CardDescription>Oportunidades destacadas del mercado o cláusulas asequibles de rivales.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 max-h-[500px] overflow-y-auto space-y-3 scrollbar-thin">
            {buyRecommendations.length === 0 ? (
              <EmptyState compact title="Sin recomendaciones de compra" description="No hay gangas de mercado ni clausulazos oportunos ahora." />
            ) : (
              buyRecommendations.map((rec) => (
                <div key={rec.id} className="rounded-xl border border-white/[0.06] bg-surface-2 p-3.5 space-y-3 hover:bg-surface-3 transition-colors">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar player={rec.player} size="md" showPosition />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-foreground truncate">{rec.player.nickname}</div>
                      <div className="text-xs text-muted-foreground">Valor: <Currency value={rec.player.marketValue} /> · xP: {(rec.impactScore || 0).toFixed(1)}</div>
                    </div>
                    {rec.type === 'buyout' ? (
                      <Badge className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20 font-bold">RIVAL</Badge>
                    ) : (
                      <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold">MERCADO</Badge>
                    )}
                  </div>

                  <div className="text-xs leading-relaxed text-muted-foreground bg-background/50 p-2.5 rounded-lg border border-white/[0.04]">
                    <div className="font-semibold text-foreground mb-1">Estrategia:</div>
                    {rec.reason}
                  </div>

                  <div className="flex justify-between items-center pt-1 text-xs">
                    <span className="text-muted-foreground">
                      Coste: <Currency value={rec.estimatedValue || rec.player.marketValue} className="font-semibold text-foreground" />
                    </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="xs" onClick={() => setSelectedDetailPlayer(rec.player)}>Ver</Button>

                      {rec.type === 'buy' ? (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleActionClick('bid', rec.player, String(rec.estimatedValue || rec.player.marketValue), rec.id)}
                          className="text-emerald-400 border-emerald-500/30 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.12] hover:border-emerald-500/50 hover:text-emerald-300 font-semibold"
                        >
                          Pujar
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleActionClick('clausulazo', rec.player, '', undefined, rec.estimatedValue)}
                          className="text-amber-400 border-amber-500/30 bg-amber-500/[0.04] hover:bg-amber-500/[0.12] hover:border-amber-500/50 hover:text-amber-300 font-semibold"
                          disabled={ownMoney < (rec.estimatedValue || 0)}
                        >
                          Clausulazo
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* 🔮 PLANES A FUTURO */}
      <Card>
        <CardHeader className="pb-3 border-b border-white/[0.04] bg-white/[0.01]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400 shrink-0" />
              🔮 Planes a Futuro y Especulación
            </CardTitle>
            {futurePlans.length > 0 && <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20">{futurePlans.length}</Badge>}
          </div>
          <CardDescription>Recomendaciones con visión a medio plazo, protección de cláusulas, tendencias y revalorizaciones de mercado.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 max-h-[400px] overflow-y-auto space-y-3 scrollbar-thin">
          {futurePlans.length === 0 ? (
            <EmptyState compact title="Sin planes futuros sugeridos" description="No hay jugadores que requieran blindaje o vigilancia prioritaria." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {futurePlans.map((rec) => {
                const isProtect = rec.type === 'protect_clause' || rec.type === 'increase_clause';
                const horizon = isProtect ? 'Próxima jornada' : rec.type === 'watch' ? '2-3 jornadas' : 'Largo plazo';

                return (
                  <div key={rec.id} className="rounded-xl border border-white/[0.06] bg-surface-2 p-4 flex flex-col justify-between gap-3 hover:bg-surface-3 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <PlayerAvatar player={rec.player} size="md" showPosition />
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-foreground truncate">{rec.player.nickname}</div>
                          <div className="text-xs text-muted-foreground">{rec.player.team?.name} · {positionShortName(rec.player.position, rec.player.positionId)}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20 flex gap-1 items-center font-semibold">
                        <Clock className="h-3 w-3" /> {horizon}
                      </Badge>
                    </div>

                    <div className="text-xs leading-relaxed text-muted-foreground bg-background/50 p-2.5 rounded-lg border border-white/[0.04] flex-1">
                      <div className="font-semibold text-foreground mb-1">Análisis táctico:</div>
                      {rec.reason}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-white/[0.04] text-xs">
                      <span className="text-[11px] text-muted-foreground">Valor actual: <Currency value={rec.player.marketValue} className="font-semibold" /></span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="xs" onClick={() => setSelectedDetailPlayer(rec.player)}>Ver</Button>

                        {isProtect ? (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => handleActionClick('clause_increase', rec.player, String(rec.recommendedClause || 1000000))}
                            className="text-amber-400 border-amber-500/30 bg-amber-500/[0.04] hover:bg-amber-500/[0.12] hover:border-amber-500/50 hover:text-amber-300 font-semibold"
                          >
                            Subir Cláusula
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => handleActionClick('shield', rec.player, '')}
                            className="text-blue-400 border-blue-500/30 bg-blue-500/[0.04] hover:bg-blue-500/[0.12] hover:border-blue-500/50 hover:text-blue-300 font-semibold"
                          >
                            Blindar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main details dialog */}
      <PlayerDetailDialog
        player={selectedDetailPlayer}
        open={!!selectedDetailPlayer}
        onOpenChange={(open) => !open && setSelectedDetailPlayer(null)}
        league={league}
        onActionSuccess={refetch}
      />

      {/* Double execution prevention confirmation overlay dialog */}
      <Dialog open={!!activeAction} onOpenChange={(open) => !open && !isSubmitting && resetActionState()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
              <span>Confirmar operación</span>
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {activeAction?.type === 'sell' && (
                <div className="space-y-3 pt-2">
                  <p>¿Seguro que quieres poner a <strong>{activeAction.player.nickname}</strong> en venta?</p>
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-muted-foreground">Precio de venta (€)</label>
                    <Input
                      type="number"
                      value={actionInput}
                      onChange={(e) => setActionInput(e.target.value)}
                      placeholder="Importe de venta"
                      className="bg-background text-sm"
                    />
                  </div>
                </div>
              )}
              {activeAction?.type === 'withdraw' && (
                <p className="pt-2">¿Seguro que quieres retirar a <strong>{activeAction.player.nickname}</strong> de la venta en el mercado?</p>
              )}
              {activeAction?.type === 'bid' && (
                <div className="space-y-3 pt-2">
                  <p>Introduce tu puja por <strong>{activeAction.player.nickname}</strong>:</p>
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-muted-foreground">Importe de puja (€)</label>
                    <Input
                      type="number"
                      value={actionInput}
                      onChange={(e) => setActionInput(e.target.value)}
                      placeholder="Importe de puja"
                      className="bg-background text-sm"
                    />
                    <span className="text-[11px] text-muted-foreground">Presupuesto disponible: <Currency value={ownMoney} /></span>
                  </div>
                </div>
              )}
              {activeAction?.type === 'clausulazo' && (
                <div className="space-y-3 pt-2">
                  <p>¿Seguro que quieres ejecutar el clausulazo sobre <strong>{activeAction.player.nickname}</strong>?</p>
                  <p className="text-xs text-rose-400">Fichas inmediatamente al jugador y se deducirá de tu saldo.</p>
                  <div className="rounded-lg bg-surface-2 p-3 flex justify-between items-center text-sm font-semibold border border-white/[0.06]">
                    <span className="text-muted-foreground">Cláusula de rescisión:</span>
                    <span className="text-foreground"><Currency value={activeAction.buyoutClause || activeAction.player.marketValue} /></span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Presupuesto disponible: <Currency value={ownMoney} /></span>
                </div>
              )}
              {activeAction?.type === 'shield' && (
                <p className="pt-2">¿Seguro que quieres <strong>blindar</strong> a <strong>{activeAction.player.nickname}</strong> contra clausulazos rivales para esta jornada?</p>
              )}
              {activeAction?.type === 'clause_increase' && (
                <div className="space-y-3 pt-2">
                  <p>Aumentar la cláusula de rescisión de <strong>{activeAction.player.nickname}</strong>:</p>
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-muted-foreground">Incremento de cláusula (€)</label>
                    <Input
                      type="number"
                      value={actionInput}
                      onChange={(e) => setActionInput(e.target.value)}
                      placeholder="Importe de incremento"
                      className="bg-background text-sm"
                    />
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="ghost" onClick={resetActionState} disabled={isSubmitting} className="hover:bg-white/[0.06] text-muted-foreground hover:text-foreground">
              Cancelar
            </Button>
            <Button variant="default" onClick={handleExecuteAction} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Procesando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecommendationsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    </div>
  );
}
