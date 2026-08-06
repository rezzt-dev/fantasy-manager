'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import PlayerAvatar from './PlayerAvatar';
import PlayerStatusBadge from './PlayerStatusBadge';
import SignalChips from './SignalChips';
import Currency from './Currency';
import type { PlayerMaster, ExternalSignal, Recommendation } from '../../types/fantasy';
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
  const average = player.averagePoints || 0;
  const posColor = positionBgClass(player.position || '', player.positionId);
  const hasXp = expectedPoints !== undefined && expectedPoints !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
