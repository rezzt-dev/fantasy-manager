'use client';

import { motion } from 'framer-motion';
import PlayerAvatar from './PlayerAvatar';
import PlayerStatusBadge from './PlayerStatusBadge';
import Currency from './Currency';
import { Badge } from '../ui/badge';
import { Shield, Sparkles } from 'lucide-react';
import type { PlayerMaster } from '../../types/fantasy';
import { positionShortName, positionBgClass } from '../../lib/format';
import { cn } from '../../lib/utils';

interface PlayerCardProps {
  player: PlayerMaster;
  buyoutClause?: number;
  isShielded?: boolean;
  suggested?: boolean;
  expectedPoints?: number | null;
  highlight?: boolean;
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
  onClick,
  className,
}: PlayerCardProps) {
  const points = player.points || player.lastSeasonPoints || 0;
  const posColor = positionBgClass(player.position || '', player.positionId);

  return (
    <motion.div
      whileHover={onClick ? { y: -2, transition: { duration: 0.15 } } : undefined}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-4 rounded-xl border bg-card p-3 transition-colors',
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
          <span className="truncate font-semibold text-card-foreground">{player.nickname}</span>
          <Badge variant="secondary" className={`hidden border-0 text-[10px] text-white sm:inline-flex ${posColor}`}>
            {positionShortName(player.position, player.positionId)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{player.team?.name || 'Sin equipo'}</span>
          <span>·</span>
          <span>{points} pts</span>
          {expectedPoints !== undefined && expectedPoints !== null && (
            <>
              <span>·</span>
              <span className="font-medium text-foreground">{expectedPoints.toFixed(1)} xP</span>
            </>
          )}
        </div>
        {suggested && (
          <span className="mt-1 inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400">
            Sugerido
          </span>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5">
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
