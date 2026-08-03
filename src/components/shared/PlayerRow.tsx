'use client';

import PlayerAvatar from './PlayerAvatar';
import PlayerStatusBadge from './PlayerStatusBadge';
import Currency from './Currency';
import { Badge } from '../ui/badge';
import { Shield, MoreHorizontal } from 'lucide-react';
import type { PlayerMaster } from '../../types/fantasy';
import { positionShortName, positionBgClass } from '../../lib/format';
import { cn } from '../../lib/utils';

interface PlayerRowProps {
  player: PlayerMaster;
  buyoutClause?: number;
  isShielded?: boolean;
  points?: number;
  starterLabel?: string;
  starterScore?: number;
  onClick?: () => void;
  className?: string;
}

export default function PlayerRow({
  player,
  buyoutClause,
  isShielded,
  points,
  starterLabel,
  starterScore,
  onClick,
  className,
}: PlayerRowProps) {
  const displayPoints = points ?? player.points ?? player.lastSeasonPoints ?? 0;
  const posColor = positionBgClass(player.position || '', player.positionId);

  const starterVariant =
    starterScore === undefined
      ? undefined
      : starterScore >= 0.8
      ? 'success'
      : starterScore >= 0.55
      ? 'secondary'
      : starterScore >= 0.35
      ? 'warning'
      : 'danger';

  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-white/[0.04] transition-colors',
        onClick && 'cursor-pointer hover:bg-white/[0.035]',
        className,
      )}
    >
      <td className="px-2 py-2 sm:px-4">
        <PlayerAvatar player={player} size="md" showPosition />
      </td>
      <td className="px-2 py-2 sm:px-4">
        <div className="font-semibold text-foreground">{player.nickname}</div>
        <div className="text-xs text-muted-foreground">{player.team?.name || 'Sin equipo'}</div>
      </td>
      <td className="px-2 py-2 sm:px-4">
        <Badge variant="secondary" className={`border-0 text-[10px] text-white ${posColor}`}>
          {positionShortName(player.position, player.positionId)}
        </Badge>
      </td>
      <td className="px-2 py-2 sm:px-4">
        <div className="flex flex-col gap-1">
          <PlayerStatusBadge status={player.playerStatus} />
          {starterLabel && starterVariant && (
            <Badge variant={starterVariant as never} className="w-fit text-[10px]">
              {starterLabel}
            </Badge>
          )}
        </div>
      </td>
      <td className="px-2 py-2 sm:px-4 font-display text-sm font-semibold text-foreground">{displayPoints}</td>
      <td className="px-2 py-2 sm:px-4">
        <Currency value={player.marketValue} className="text-sm text-muted-foreground" />
      </td>
      <td className="px-2 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          <Currency value={buyoutClause ?? 0} className="text-sm" />
          {isShielded && <Shield className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </td>
      {onClick && (
        <td className="px-2 py-2 sm:px-4 text-right">
          <MoreHorizontal className="ml-auto h-4 w-4 text-muted-foreground" />
        </td>
      )}
    </tr>
  );
}
