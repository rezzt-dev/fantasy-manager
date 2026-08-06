'use client';

import { motion } from 'framer-motion';
import PlayerAvatar from './PlayerAvatar';
import PlayerStatusBadge from './PlayerStatusBadge';
import Currency from './Currency';
import { Shield, Sparkles } from 'lucide-react';
import type { PlayerMaster } from '../../types/fantasy';
import { cn } from '../../lib/utils';

interface PlayerCardProps {
  player: PlayerMaster;
  buyoutClause?: number;
  isShielded?: boolean;
  suggested?: boolean;
  expectedPoints?: number | null;
  highlight?: boolean;
  owner?: { type: 'official' | 'team'; label: string };
  onClick?: () => void;
  className?: string;
}

export default function PlayerCard({
  player,
  buyoutClause,
  isShielded,
  suggested,
  expectedPoints,
  highlight,
  owner,
  onClick,
  className,
}: PlayerCardProps) {
  const points = player.points || player.lastSeasonPoints || 0;

  return (
    <motion.div
      whileHover={onClick ? { y: -2, transition: { duration: 0.15 } } : undefined}
      onClick={onClick}
      className={cn(
        'relative flex min-w-0 items-center gap-3 rounded-xl border bg-card p-3 transition-colors sm:gap-4 sm:p-4 [.density-dense_&]:gap-2.5 [.density-dense_&]:p-2.5 [.density-dense_&]:sm:gap-3 [.density-dense_&]:sm:p-3',
        onClick && 'cursor-pointer hover:bg-surface-2',
        suggested ? 'border-dashed border-amber-500/50' : 'border-white/[0.08]',
        highlight && 'border-foreground/20 shadow-glow-sm',
        className,
      )}
    >
      {highlight && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
          <Sparkles className="h-3 w-3" />
        </span>
      )}

      <PlayerAvatar player={player} size="md" showPosition />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-card-foreground sm:text-base">
            {player.nickname || player.name}
          </span>
          {suggested && (
            <span className="inline-flex shrink-0 items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400">
              Sugerido
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {player.team?.name && <span className="truncate">{player.team.name}</span>}
          {owner && (
            <span
              className={cn(
                'shrink-0',
                owner.type === 'team' ? 'text-amber-400' : 'text-emerald-400',
              )}
            >
              {owner.label}
            </span>
          )}
          <span className="shrink-0">{points} pts</span>
          {expectedPoints !== undefined && expectedPoints !== null && (
            <span className="shrink-0 font-medium text-foreground">{expectedPoints.toFixed(1)} xP</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <PlayerStatusBadge status={player.playerStatus} />
        {typeof buyoutClause === 'number' && buyoutClause > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <Currency value={buyoutClause} />
            {isShielded && <span className="text-[10px] text-foreground">(B)</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
