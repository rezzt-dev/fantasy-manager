'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LaLigaFantasyClient } from '../../lib/fantasy/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import PlayerAvatar from './PlayerAvatar';
import PlayerStatusBadge from './PlayerStatusBadge';
import SignalChips from './SignalChips';
import Currency from './Currency';
import type { PlayerMaster, ExternalSignal, Recommendation, FantasyLeague, MarketPlayer, TeamPlayer } from '../../types/fantasy';
import type { StarterInfo } from '../../types/analysis';
import { positionShortName, positionBgClass } from '../../lib/format';
import {
  Shield,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Activity,
  Gauge,
  UserCheck,
  Newspaper,
  Coins,
  ShoppingCart,
  Trash2,
  Lock,
  Plus,
  Loader2,
  Check,
  X,
} from 'lucide-react';

interface PlayerDetailDialogProps {
  player: PlayerMaster | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buyoutClause?: number;
  isShielded?: boolean;
  starterInfo?: StarterInfo;
  signals?: ExternalSignal[];
  expectedPoints?: number | null;
  recommendation?: Recommendation;
  marketPlayer?: MarketPlayer;
  teamPlayer?: TeamPlayer;
  league?: FantasyLeague;
  onActionSuccess?: () => void;
}

export default function PlayerDetailDialog({
  player,
  open,
  onOpenChange,
  buyoutClause,
  isShielded,
  starterInfo,
  signals,
  expectedPoints,
  recommendation,
  marketPlayer,
  teamPlayer,
  league,
  onActionSuccess,
}: PlayerDetailDialogProps) {
  const queryClient = useQueryClient();

  // Action states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAction, setActiveAction] = useState<'sell' | 'withdraw' | 'bid' | 'clausulazo' | 'shield' | 'clause_increase' | 'direct_offer' | null>(null);

  // Form input states
  const [inputVal, setInputVal] = useState<string>('');

  if (!player) return null;

  const points = player.points || player.lastSeasonPoints || 0;
  const average = player.averagePoints || 0;
  const posColor = positionBgClass(player.position || '', player.positionId);
  const hasXp = expectedPoints !== undefined && expectedPoints !== null;

  // Determine ownership and market status
  const userTeamId = league?.team?.id;
  const userMoney = league?.team?.money || 0;
  const isOurs = !!teamPlayer;

  const resetActionState = () => {
    setActiveAction(null);
    setInputVal('');
  };

  const handleActionClick = (action: typeof activeAction, defaultVal: string = '') => {
    setActiveAction(action);
    setInputVal(defaultVal);
  };

  const executeAction = async () => {
    if (!league || isSubmitting) return;

    setIsSubmitting(true);
    const amountNum = parseInt(inputVal.replace(/\D/g, ''), 10) || 0;

    try {
      if (activeAction === 'sell') {
        if (!amountNum || amountNum <= 0) {
          toast.error('❌ Introduce un precio de venta válido.');
          setIsSubmitting(false);
          return;
        }
        await LaLigaFantasyClient.sellPlayerToMarket(league.id, player.id, amountNum);
        toast.success(`⚽ ${player.nickname} puesto en venta por ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amountNum)}!`);
      } else if (activeAction === 'withdraw') {
        const marketId = marketPlayer?.id || player.id;
        await LaLigaFantasyClient.withdrawPlayerFromMarket(league.id, marketId);
        toast.success(`⚽ ${player.nickname} retirado del mercado con éxito.`);
      } else if (activeAction === 'bid') {
        if (!amountNum || amountNum <= 0) {
          toast.error('❌ Introduce una cantidad de puja válida.');
          setIsSubmitting(false);
          return;
        }
        if (amountNum > userMoney) {
          toast.error('❌ No tienes suficiente saldo para esta puja.');
          setIsSubmitting(false);
          return;
        }
        const marketId = marketPlayer?.id || player.id;
        await LaLigaFantasyClient.makeBid(league.id, marketId, amountNum);
        toast.success(`⚽ Puja de ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amountNum)} por ${player.nickname} enviada con éxito!`);
      } else if (activeAction === 'clausulazo') {
        const cost = buyoutClause || player.marketValue;
        if (cost > userMoney) {
          toast.error('❌ No tienes suficiente saldo para pagar la cláusula.');
          setIsSubmitting(false);
          return;
        }
        await LaLigaFantasyClient.payBuyoutClause(league.id, player.id, cost);
        toast.success(`🔥 ¡Clausulazo ejecutado! Has fichado a ${player.nickname} por ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(cost)}.`);
      } else if (activeAction === 'shield') {
        await LaLigaFantasyClient.shieldPlayer(league.id, player.id);
        toast.success(`🛡️ ¡${player.nickname} blindado con éxito!`);
      } else if (activeAction === 'clause_increase') {
        if (!amountNum || amountNum <= 0) {
          toast.error('❌ Introduce un incremento de cláusula válido.');
          setIsSubmitting(false);
          return;
        }
        await LaLigaFantasyClient.increaseBuyoutClause(league.id, player.id, 1, amountNum);
        toast.success(`📈 Cláusula de ${player.nickname} incrementada en ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amountNum)}!`);
      } else if (activeAction === 'direct_offer') {
        if (!amountNum || amountNum <= 0) {
          toast.error('❌ Introduce un importe de oferta válido.');
          setIsSubmitting(false);
          return;
        }
        await LaLigaFantasyClient.makeDirectOffer(league.id, player.id, amountNum);
        toast.success(`✉️ Oferta de traspaso directo de ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amountNum)} enviada a su propietario.`);
      }

      resetActionState();
      queryClient.invalidateQueries();
      if (onActionSuccess) onActionSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('[Action Error]', error);
      toast.error(`❌ Error al ejecutar operación: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isSubmitting) { onOpenChange(v); resetActionState(); } }}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <div className="relative flex flex-col items-center border-b border-white/[0.06] bg-gradient-to-b from-white/[0.05] to-transparent px-6 pb-6 pt-8 text-center">
          <div className="mb-4 rounded-full bg-gradient-to-b from-white/[0.10] to-white/[0.02] p-[3px] shadow-glow-sm">
            <div className="rounded-full bg-surface-3">
              <PlayerAvatar player={player} size="xl" />
            </div>
          </div>
          <DialogHeader className="items-center space-y-1.5">
            <DialogTitle className="font-display text-2xl font-semibold tracking-tight">
              {player.nickname}
            </DialogTitle>
            <DialogDescription className="flex flex-col items-center gap-2">
              {player.name !== player.nickname && (
                <span className="text-xs text-muted-foreground">{player.name}</span>
              )}
              <span className="flex flex-wrap items-center justify-center gap-1.5">
                <Badge variant="secondary" className={`border-0 text-[10px] text-white ${posColor}`}>
                  {positionShortName(player.position, player.positionId)}
                </Badge>
                <Badge variant="outline-muted" className="text-[10px] font-medium">
                  {player.team?.name || 'Sin equipo'}
                </Badge>
                {player.playerStatus && <PlayerStatusBadge status={player.playerStatus} />}
              </span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid max-h-[55vh] gap-4 overflow-y-auto p-6 scrollbar-thin">
          {/* Main Action Confirmation Panel */}
          {activeAction ? (
            <div className="rounded-xl border border-white/[0.12] bg-surface-2 p-5 animate-fade-in space-y-4">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Confirmar acción</span>
              </div>

              <div className="text-sm text-muted-foreground leading-relaxed">
                {activeAction === 'sell' && (
                  <div className="space-y-3">
                    <p>¿Seguro que quieres poner a <strong>{player.nickname}</strong> en venta en el mercado?</p>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Precio de venta (€)</label>
                      <Input
                        type="number"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        placeholder="Importe de venta"
                        className="bg-background text-sm"
                      />
                    </div>
                  </div>
                )}
                {activeAction === 'withdraw' && (
                  <p>¿Seguro que quieres retirar a <strong>{player.nickname}</strong> de la venta en el mercado?</p>
                )}
                {activeAction === 'bid' && (
                  <div className="space-y-3">
                    <p>Introduce la cantidad que quieres pujar por <strong>{player.nickname}</strong>:</p>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Tu puja (€)</label>
                      <Input
                        type="number"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        placeholder="Importe de puja"
                        className="bg-background text-sm"
                      />
                      <span className="text-[11px] text-muted-foreground">Saldo disponible: <Currency value={userMoney} /></span>
                    </div>
                  </div>
                )}
                {activeAction === 'clausulazo' && (
                  <div className="space-y-2">
                    <p>¿Seguro que quieres ejecutar el <strong>clausulazo</strong> sobre <strong>{player.nickname}</strong>?</p>
                    <p className="text-xs text-rose-400">Esta acción descontará inmediatamente el coste de la cláusula de tu presupuesto y sumará el jugador a tu equipo.</p>
                    <div className="rounded-lg bg-background p-3 flex justify-between items-center text-sm font-semibold border border-white/[0.06]">
                      <span className="text-muted-foreground">Coste de la Cláusula:</span>
                      <span className="text-foreground"><Currency value={buyoutClause || player.marketValue} /></span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Saldo disponible: <Currency value={userMoney} /></span>
                  </div>
                )}
                {activeAction === 'shield' && (
                  <p>¿Seguro que quieres <strong>blindar</strong> a <strong>{player.nickname}</strong> contra clausulazos rivales por esta jornada?</p>
                )}
                {activeAction === 'clause_increase' && (
                  <div className="space-y-3">
                    <p>Introduce la cantidad para aumentar la cláusula de <strong>{player.nickname}</strong>:</p>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Aumento de Cláusula (€)</label>
                      <Input
                        type="number"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        placeholder="Incremento"
                        className="bg-background text-sm"
                      />
                    </div>
                  </div>
                )}
                {activeAction === 'direct_offer' && (
                  <div className="space-y-3">
                    <p>Introduce tu oferta directa de traspaso para fichar a <strong>{player.nickname}</strong>:</p>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Oferta (€)</label>
                      <Input
                        type="number"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        placeholder="Importe de oferta"
                        className="bg-background text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={resetActionState} disabled={isSubmitting}>
                  <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
                <Button variant="default" size="sm" onClick={executeAction} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Procesando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" /> Confirmar
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Interactive Actions Panel with High-Contrast Styles */
            league && (
              <div className="rounded-xl border border-white/[0.06] bg-surface-2/40 p-4 space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5" />
                  Operaciones disponibles
                </div>

                <div className="flex flex-wrap gap-2">
                  {isOurs ? (
                    <>
                      {marketPlayer || player.marketValue <= 0 ? (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleActionClick('withdraw')}
                          className="text-rose-400 border-rose-500/30 bg-rose-500/[0.04] hover:bg-rose-500/[0.12] hover:border-rose-500/50 hover:text-rose-300 font-semibold"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Retirar de la venta
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleActionClick('sell', String(player.marketValue))}
                          className="text-emerald-400 border-emerald-500/30 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.12] hover:border-emerald-500/50 hover:text-emerald-300 font-semibold"
                        >
                          <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Vender al mercado
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleActionClick('clause_increase', '1000000')}
                        className="text-foreground border-white/[0.12] hover:bg-white/[0.08]"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Incrementar cláusula
                      </Button>

                      {!isShielded && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleActionClick('shield')}
                          className="text-blue-400 border-blue-500/30 bg-blue-500/[0.04] hover:bg-blue-500/[0.12] hover:border-blue-500/50 hover:text-blue-300 font-semibold"
                        >
                          <Lock className="h-3.5 w-3.5 mr-1" /> Blindar jugador
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      {marketPlayer ? (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleActionClick('bid', String(marketPlayer.salePrice))}
                          className="text-emerald-400 border-emerald-500/30 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.12] hover:border-emerald-500/50 hover:text-emerald-300 font-semibold"
                        >
                          <Coins className="h-3.5 w-3.5 mr-1" /> Pujar por jugador
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleActionClick('direct_offer', String(player.marketValue))}
                          className="text-foreground border-white/[0.12] hover:bg-white/[0.08]"
                        >
                          ✉️ Enviar Oferta Directa
                        </Button>
                      )}

                      {typeof buyoutClause === 'number' && buyoutClause > 0 && league.config?.features?.buyoutClause !== false && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleActionClick('clausulazo')}
                          className="text-amber-400 border-amber-500/30 bg-amber-500/[0.04] hover:bg-amber-500/[0.12] hover:border-amber-500/50 hover:text-amber-300 font-semibold"
                          disabled={userMoney < buyoutClause}
                        >
                          🔥 Clausulazo (<Currency value={buyoutClause} />)
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          )}

          <div className="grid grid-cols-3 gap-3">
            <StatTile
              label="Puntos"
              value={points}
              icon={<Activity className="h-3.5 w-3.5" />}
            />
            <StatTile
              label="Media"
              value={average.toFixed(1)}
              icon={<Gauge className="h-3.5 w-3.5" />}
            />
            <StatTile
              label="Valor"
              value={<Currency value={player.marketValue} />}
              icon={<TrendingUp className="h-3.5 w-3.5" />}
            />
          </div>

          {hasXp && (
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.10] bg-gradient-to-r from-white/[0.07] to-transparent p-4 shadow-glow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.10] bg-white/[0.06] text-foreground">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Puntos esperados
                </div>
                <div className="text-xs text-muted-foreground">Estimación del motor para la jornada</div>
              </div>
              <div className="font-display text-2xl font-bold text-foreground">
                {expectedPoints!.toFixed(1)}
              </div>
            </div>
          )}

          {(typeof buyoutClause === 'number' || isShielded) && (
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-surface-2/50 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-muted-foreground">
                <Shield className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Cláusula de rescisión
                </div>
                <Currency value={buyoutClause ?? 0} className="font-display text-lg font-bold text-foreground" />
              </div>
              {isShielded && (
                <Badge variant="info" className="gap-1">
                  <Shield className="h-3 w-3" /> Blindado
                </Badge>
              )}
            </div>
          )}

          {starterInfo && (
            <div className="rounded-xl border border-white/[0.06] bg-surface-2/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-muted-foreground">
                    <UserCheck className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-semibold text-foreground">{starterInfo.label}</span>
                </div>
                <span className="font-display text-sm font-bold text-foreground">
                  {Math.round(starterInfo.score * 100)}%
                </span>
              </div>
              <Progress value={Math.round(starterInfo.score * 100)} className="mt-3 h-1.5" />
              <p className="mt-2 text-xs text-muted-foreground">
                {starterInfo.source === 'minutes'
                  ? 'Basada en minutos jugados esta temporada'
                  : 'Basada en puntos de la temporada pasada'}
              </p>
            </div>
          )}

          {signals && signals.length > 0 && (
            <div>
              <SectionTitle icon={<Newspaper className="h-3.5 w-3.5" />}>Señales externas</SectionTitle>
              <SignalChips signals={signals} />
            </div>
          )}

          {recommendation && (
            <div className="rounded-xl border border-white/[0.06] bg-surface-2/50 p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-semibold text-foreground">Recomendación</span>
                <Badge variant="muted" className="ml-auto text-[10px]">
                  {recommendation.type}
                </Badge>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{recommendation.reason}</p>
              {recommendation.suggestedAction && (
                <p className="mt-2 text-sm font-semibold text-foreground">{recommendation.suggestedAction}</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatTile({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-surface-2/50 p-3.5">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.04] text-muted-foreground">
          {icon}
        </span>
        <span className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-2.5 truncate font-display text-lg font-bold text-foreground">{value}</div>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      {icon}
      {children}
    </div>
  );
}
