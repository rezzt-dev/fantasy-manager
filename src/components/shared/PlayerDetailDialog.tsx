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
import FixturePanel from './FixturePanel';
import Currency from './Currency';
import type { PlayerMaster, ExternalSignal, FixtureOutlook, Recommendation, FantasyLeague, MarketPlayer, TeamPlayer } from '../../types/fantasy';
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
  /** Emparejamiento de la jornada del equipo real del jugador. */
  fixture?: FixtureOutlook | null;
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
  fixture,
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
          toast.error('Introduce un precio de venta válido.');
          setIsSubmitting(false);
          return;
        }
        await LaLigaFantasyClient.sellPlayerToMarket(league.id, player.id, amountNum);
        toast.success(`${player.nickname} puesto en venta por ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amountNum)}!`);
      } else if (activeAction === 'withdraw') {
        const marketId = marketPlayer?.id || player.id;
        await LaLigaFantasyClient.withdrawPlayerFromMarket(league.id, marketId);
        toast.success(`${player.nickname} retirado del mercado con éxito.`);
      } else if (activeAction === 'bid') {
        if (!amountNum || amountNum <= 0) {
          toast.error('Introduce una cantidad de puja válida.');
          setIsSubmitting(false);
          return;
        }
        if (amountNum > userMoney) {
          toast.error('No tienes suficiente saldo para esta puja.');
          setIsSubmitting(false);
          return;
        }
        const marketId = marketPlayer?.id || player.id;
        await LaLigaFantasyClient.makeBid(league.id, marketId, amountNum);
        toast.success(`Puja de ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amountNum)} por ${player.nickname} enviada con éxito!`);
      } else if (activeAction === 'clausulazo') {
        const cost = buyoutClause || player.marketValue;
        if (cost > userMoney) {
          toast.error('No tienes suficiente saldo para pagar la cláusula.');
          setIsSubmitting(false);
          return;
        }
        await LaLigaFantasyClient.payBuyoutClause(league.id, player.id, cost);
        toast.success(`¡Clausulazo ejecutado! Has fichado a ${player.nickname} por ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(cost)}.`);
      } else if (activeAction === 'shield') {
        await LaLigaFantasyClient.shieldPlayer(league.id, player.id);
        toast.success(`¡${player.nickname} blindado con éxito!`);
      } else if (activeAction === 'clause_increase') {
        if (!amountNum || amountNum <= 0) {
          toast.error('Introduce un incremento de cláusula válido.');
          setIsSubmitting(false);
          return;
        }
        await LaLigaFantasyClient.increaseBuyoutClause(league.id, player.id, 1, amountNum);
        toast.success(`Cláusula de ${player.nickname} incrementada en ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amountNum)}!`);
      } else if (activeAction === 'direct_offer') {
        if (!amountNum || amountNum <= 0) {
          toast.error('Introduce un importe de oferta válido.');
          setIsSubmitting(false);
          return;
        }
        await LaLigaFantasyClient.makeDirectOffer(league.id, player.id, amountNum);
        toast.success(`Oferta de traspaso directo de ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amountNum)} enviada a su propietario.`);
      }

      resetActionState();
      queryClient.invalidateQueries();
      if (onActionSuccess) onActionSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('[Action Error]', error);
      toast.error(`Error al ejecutar operación: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isSubmitting) { onOpenChange(v); resetActionState(); } }}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        {/* Cabecera alineada a la izquierda, no un medallón centrado: el
            nombre es lo que se busca al abrir la ficha, así que empieza donde
            empieza la lectura. */}
        <div className="flex items-start gap-4 border-b border-white/[0.09] bg-surface-raised px-6 py-5">
          <PlayerAvatar player={player} size="lg" />

          <DialogHeader className="min-w-0 flex-1">
            <DialogTitle className="truncate font-display text-xl font-semibold tracking-[-0.025em]">
              {player.nickname}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="min-w-0">
                {player.name !== player.nickname && (
                  <p className="truncate text-xs text-content-tertiary">{player.name}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge size="sm" className={`border-0 font-bold text-ink-0 ${posColor}`}>
                    {positionShortName(player.position, player.positionId)}
                  </Badge>
                  <Badge variant="outline-muted" size="sm">
                    {player.team?.name || 'Sin equipo'}
                  </Badge>
                  {player.playerStatus && <PlayerStatusBadge status={player.playerStatus} />}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="scrollbar-thin grid max-h-[min(60vh,34rem)] gap-4 overflow-y-auto p-6">
          {/* Main Action Confirmation Panel */}
          {activeAction ? (
            <div role="group" aria-label="Confirmar acción" className="animate-scale-in space-y-4 rounded-lg border border-caution/25 bg-caution-quiet p-5">
              <div className="flex items-center gap-2 text-content font-semibold">
                <AlertTriangle className="h-4 w-4 text-caution-text shrink-0" />
                <span>Confirmar acción</span>
              </div>

              <div className="text-sm text-content-tertiary leading-relaxed">
                {activeAction === 'sell' && (
                  <div className="space-y-3">
                    <p>¿Seguro que quieres poner a <strong>{player.nickname}</strong> en venta en el mercado?</p>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-content-tertiary">Precio de venta (€)</label>
                      <Input
                        type="number"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        placeholder="Importe de venta"
                        className="bg-canvas text-sm"
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
                      <label className="text-xs font-semibold text-content-tertiary">Tu puja (€)</label>
                      <Input
                        type="number"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        placeholder="Importe de puja"
                        className="bg-canvas text-sm"
                      />
                      <span className="text-[11px] text-content-tertiary">Saldo disponible: <Currency value={userMoney} /></span>
                    </div>
                  </div>
                )}
                {activeAction === 'clausulazo' && (
                  <div className="space-y-2">
                    <p>¿Seguro que quieres ejecutar el <strong>clausulazo</strong> sobre <strong>{player.nickname}</strong>?</p>
                    <p className="text-xs text-negative-text">Esta acción descontará inmediatamente el coste de la cláusula de tu presupuesto y sumará el jugador a tu equipo.</p>
                    <div className="rounded-lg bg-canvas p-3 flex justify-between items-center text-sm font-semibold border border-white/[0.09]">
                      <span className="text-content-tertiary">Coste de la Cláusula:</span>
                      <span className="text-content"><Currency value={buyoutClause || player.marketValue} /></span>
                    </div>
                    <span className="text-[11px] text-content-tertiary">Saldo disponible: <Currency value={userMoney} /></span>
                  </div>
                )}
                {activeAction === 'shield' && (
                  <p>¿Seguro que quieres <strong>blindar</strong> a <strong>{player.nickname}</strong> contra clausulazos rivales por esta jornada?</p>
                )}
                {activeAction === 'clause_increase' && (
                  <div className="space-y-3">
                    <p>Introduce la cantidad para aumentar la cláusula de <strong>{player.nickname}</strong>:</p>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-content-tertiary">Aumento de Cláusula (€)</label>
                      <Input
                        type="number"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        placeholder="Incremento"
                        className="bg-canvas text-sm"
                      />
                    </div>
                  </div>
                )}
                {activeAction === 'direct_offer' && (
                  <div className="space-y-3">
                    <p>Introduce tu oferta directa de traspaso para fichar a <strong>{player.nickname}</strong>:</p>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-content-tertiary">Oferta (€)</label>
                      <Input
                        type="number"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        placeholder="Importe de oferta"
                        className="bg-canvas text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={resetActionState} disabled={isSubmitting}>
                  <X aria-hidden="true" /> Cancelar
                </Button>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={executeAction}
                  loading={isSubmitting}
                  loadingText="Procesando…"
                >
                  <Check aria-hidden="true" /> Confirmar
                </Button>
              </div>
            </div>
          ) : (
            /* Interactive Actions Panel with High-Contrast Styles */
            league && (
              <div className="rounded-lg border border-white/[0.09] bg-surface-raised/40 p-4 space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-content-tertiary flex items-center gap-1.5">
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
                          className="text-negative-text border-negative/30 bg-negative/[0.04] hover:bg-negative/[0.12] hover:border-negative/40 hover:text-negative-text font-semibold"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Retirar de la venta
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleActionClick('sell', String(player.marketValue))}
                          className="text-positive-text border-positive/25 bg-positive/[0.04] hover:bg-positive/[0.12] hover:border-positive/40 hover:text-positive-text font-semibold"
                        >
                          <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Vender al mercado
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleActionClick('clause_increase', '1000000')}
                        className="text-content border-white/[0.14] hover:bg-white/[0.1]"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Incrementar cláusula
                      </Button>

                      {!isShielded && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleActionClick('shield')}
                          className="text-pitch-df border-blue-500/30 bg-pitch-df/[0.04] hover:bg-pitch-df/[0.12] hover:border-blue-500/50 hover:text-blue-300 font-semibold"
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
                          className="text-positive-text border-positive/25 bg-positive/[0.04] hover:bg-positive/[0.12] hover:border-positive/40 hover:text-positive-text font-semibold"
                        >
                          <Coins className="h-3.5 w-3.5 mr-1" /> Pujar por jugador
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleActionClick('direct_offer', String(player.marketValue))}
                          className="text-content border-white/[0.14] hover:bg-white/[0.1]"
                        >
                          Enviar Oferta Directa
                        </Button>
                      )}

                      {typeof buyoutClause === 'number' && buyoutClause > 0 && league.config?.features?.buyoutClause !== false && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleActionClick('clausulazo')}
                          className="text-caution-text border-caution/25 bg-caution/[0.04] hover:bg-caution/[0.12] hover:border-caution/40 hover:text-caution-text font-semibold"
                          disabled={userMoney < buyoutClause}
                        >
                          Clausulazo (<Currency value={buyoutClause} />)
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
            <div className="flex items-center gap-3 rounded-lg border border-white/[0.09] bg-surface-raised p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.05] text-content">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium uppercase tracking-wider text-content-tertiary">
                  Puntos esperados
                </div>
                <div className="text-xs text-content-tertiary">Estimación del motor para la jornada</div>
              </div>
              <div className="font-display text-2xl font-bold text-content">
                {expectedPoints!.toFixed(1)}
              </div>
            </div>
          )}

          <FixturePanel fixture={fixture} />

          {(typeof buyoutClause === 'number' || isShielded) && (
            <div className="flex items-center gap-3 rounded-lg border border-white/[0.09] bg-surface-raised/50 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.05] text-content-tertiary">
                <Shield className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium uppercase tracking-wider text-content-tertiary">
                  Cláusula de rescisión
                </div>
                <Currency value={buyoutClause ?? 0} className="font-display text-lg font-bold text-content" />
              </div>
              {isShielded && (
                <Badge variant="info" className="gap-1">
                  <Shield className="h-3 w-3" /> Blindado
                </Badge>
              )}
            </div>
          )}

          {starterInfo && (
            <div className="rounded-lg border border-white/[0.09] bg-surface-raised/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.05] text-content-tertiary">
                    <UserCheck className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-semibold text-content">{starterInfo.label}</span>
                </div>
                <span className="font-display text-sm font-bold text-content">
                  {Math.round(starterInfo.score * 100)}%
                </span>
              </div>
              <Progress value={Math.round(starterInfo.score * 100)} className="mt-3 h-1.5" />
              <p className="mt-2 text-xs text-content-tertiary">
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
            <div className="rounded-lg border border-white/[0.09] bg-surface-raised/50 p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.05] text-caution-text">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-semibold text-content">Recomendación</span>
                <Badge variant="muted" className="ml-auto text-[10px]">
                  {recommendation.type}
                </Badge>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-content-tertiary">{recommendation.reason}</p>
              {recommendation.suggestedAction && (
                <p className="mt-2 text-sm font-semibold text-content">{recommendation.suggestedAction}</p>
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
    <div className="rounded-lg border border-white/[0.09] bg-surface-raised/50 p-3.5">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/[0.09] bg-white/[0.05] text-content-tertiary">
          {icon}
        </span>
        <span className="truncate text-[10px] font-medium uppercase tracking-wider text-content-tertiary">
          {label}
        </span>
      </div>
      <div className="mt-2.5 truncate font-display text-lg font-bold text-content">{value}</div>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-content-tertiary">
      {icon}
      {children}
    </div>
  );
}
