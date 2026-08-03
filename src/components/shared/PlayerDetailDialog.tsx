'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import PlayerAvatar from './PlayerAvatar';
import PlayerStatusBadge from './PlayerStatusBadge';
import SignalChips from './SignalChips';
import Currency from './Currency';
import type { PlayerMaster, ExternalSignal, Recommendation } from '../../types/fantasy';
import type { StarterInfo } from '../../types/analysis';
import { positionShortName, positionBgClass } from '../../lib/format';
import { Shield, TrendingUp, AlertTriangle, Sparkles, Activity } from 'lucide-react';

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
}: PlayerDetailDialogProps) {
  if (!player) return null;

  const points = player.points || player.lastSeasonPoints || 0;
  const posColor = positionBgClass(player.position || '', player.positionId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <div className="relative flex flex-col items-center border-b border-white/[0.06] bg-surface-2/50 p-6 text-center">
          <PlayerAvatar player={player} size="xl" showPosition className="mb-4" />
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-semibold">{player.nickname}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {player.name !== player.nickname && <span className="block text-xs">{player.name}</span>}
              <span className="flex items-center justify-center gap-2 text-xs">
                <Badge variant="secondary" className={`border-0 text-[10px] text-white ${posColor}`}>
                  {positionShortName(player.position, player.positionId)}
                </Badge>
                <span>{player.team?.name || 'Sin equipo'}</span>
              </span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid gap-4 p-6">
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="Puntos" value={points} icon={<Activity className="h-3.5 w-3.5" />} />
            <StatBox
              label="Valor mercado"
              value={<Currency value={player.marketValue} />}
              icon={<TrendingUp className="h-3.5 w-3.5" />}
            />
            {expectedPoints !== undefined && expectedPoints !== null && (
              <StatBox
                label="xP jornada"
                value={expectedPoints.toFixed(1)}
                icon={<Sparkles className="h-3.5 w-3.5" />}
              />
            )}
          </div>

          {(typeof buyoutClause === 'number' || isShielded) && (
            <div className="rounded-xl border border-white/[0.06] bg-surface-2/50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Shield className="h-4 w-4" />
                Cláusula
              </div>
              <div className="mt-2 flex items-center gap-3">
                <Currency value={buyoutClause ?? 0} className="text-lg font-bold" />
                {isShielded && (
                  <Badge variant="info" className="gap-1">
                    <Shield className="h-3 w-3" /> Blindado
                  </Badge>
                )}
              </div>
            </div>
          )}

          {starterInfo && (
            <div className="rounded-xl border border-white/[0.06] bg-surface-2/50 p-4">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Titularidad estimada</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{starterInfo.label}</span>
                <span className="text-xs text-muted-foreground">({Math.round(starterInfo.score * 100)}%)</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {starterInfo.source === 'minutes'
                  ? 'Basada en minutos jugados esta temporada'
                  : 'Basada en puntos de la temporada pasada'}
              </p>
            </div>
          )}

          {signals && signals.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Señales externas</div>
              <SignalChips signals={signals} />
            </div>
          )}

          {recommendation && (
            <div className="rounded-xl border border-white/[0.06] bg-surface-2/50 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-foreground" />
                <span className="text-sm font-semibold text-foreground">Recomendación</span>
                <Badge variant="muted" className="text-[10px]">
                  {recommendation.type}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{recommendation.reason}</p>
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

function StatBox({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-surface-2/50 p-3 text-center">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-bold text-foreground">{value}</div>
    </div>
  );
}
