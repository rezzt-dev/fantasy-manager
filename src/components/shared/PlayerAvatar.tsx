import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getInitials, getPlayerImageUrl, positionShortName, positionBgClass } from '../../lib/format';
import type { PlayerMaster } from '../../types/fantasy';

interface PlayerAvatarProps {
  player: PlayerMaster;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showPosition?: boolean;
}

const sizeClasses = {
  sm: 'h-14 w-14 text-xs',
  md: 'h-18 w-18 text-sm',
  lg: 'h-24 w-24 text-base',
  xl: 'h-30 w-30 text-lg',
  '2xl': 'h-36 w-36 text-xl',
};

const ringSizes = {
  sm: 'ring-[3px]',
  md: 'ring-[3px]',
  lg: 'ring-4',
  xl: 'ring-[5px]',
  '2xl': 'ring-[6px]',
};

const badgeSizes = {
  sm: 'text-[10px] px-1.5 py-0.5 min-w-[1.5rem]',
  md: 'text-xs px-2 py-0.5 min-w-[1.75rem]',
  lg: 'text-sm px-2.5 py-0.5 min-w-[2rem]',
  xl: 'text-sm px-2.5 py-1 min-w-[2.25rem]',
  '2xl': 'text-base px-3 py-1 min-w-[2.75rem]',
};

export default function PlayerAvatar({ player, size = 'md', className, showPosition = false }: PlayerAvatarProps) {
  const [failed, setFailed] = useState(false);
  const imageUrl = getPlayerImageUrl(player.images);
  const initials = getInitials(player.nickname || player.name || '?');
  const positionClass = positionBgClass(player.position || '', player.positionId);

  return (
    <div className={`relative inline-flex shrink-0 ${className || ''}`}>
      <Avatar className={`${sizeClasses[size]} ring-[1.5px] ring-white/[0.08]`}>
        {!failed && imageUrl ? (
          <AvatarImage
            src={imageUrl}
            alt={player.nickname || player.name}
            className="object-contain p-0.5"
            onError={() => setFailed(true)}
          />
        ) : null}
        <AvatarFallback className="bg-surface-3 text-foreground uppercase font-bold">
          {initials}
        </AvatarFallback>
      </Avatar>
      {showPosition && (
        <span
          className={`absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full ${positionClass} font-display font-bold text-white shadow-sm shadow-black/40 border-2 border-card ${badgeSizes[size]}`}
        >
          {positionShortName(player.position, player.positionId)}
        </span>
      )}
    </div>
  );
}
