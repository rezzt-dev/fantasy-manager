'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getInitials, getPlayerImageUrl, positionShortName, positionTextClass } from '../../lib/format';
import type { PlayerMaster } from '../../types/fantasy';
import { cn } from '../../lib/utils';

interface PlayerAvatarProps {
  player: PlayerMaster;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showPosition?: boolean;
}

/**
 * Retrato del jugador.
 *
 * La demarcación se marca con un anillo de color y una sigla dentro de los
 * límites del retrato, no con una etiqueta colgando por debajo: así la pieza
 * mide siempre lo que dice medir y no se solapa con la fila de al lado.
 *
 * La sigla acompaña siempre al color, porque la demarcación no puede depender
 * de distinguir ámbar de rojo.
 */
const SIZES = {
  sm: { box: 'h-9 w-9', text: 'text-[10px]', chip: 'text-[8px] px-1' },
  md: { box: 'h-11 w-11', text: 'text-xs', chip: 'text-[9px] px-1' },
  lg: { box: 'h-16 w-16', text: 'text-sm', chip: 'text-[10px] px-1.5' },
  xl: { box: 'h-24 w-24', text: 'text-lg', chip: 'text-xs px-1.5' },
  '2xl': { box: 'h-32 w-32', text: 'text-2xl', chip: 'text-sm px-2' },
} as const;

export default function PlayerAvatar({
  player,
  size = 'md',
  className,
  showPosition = false,
}: PlayerAvatarProps) {
  const [failed, setFailed] = useState(false);
  const imageUrl = getPlayerImageUrl(player.images);
  const initials = getInitials(player.nickname || player.name || '?');
  const { box, text, chip } = SIZES[size];
  const position = positionShortName(player.position, player.positionId);
  const positionColor = positionTextClass(player.position, player.positionId);

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      <Avatar className={cn(box, text, 'ring-1 ring-white/[0.09]')}>
        {!failed && imageUrl ? (
          <AvatarImage
            src={imageUrl}
            alt=""
            className="object-contain object-bottom"
            onError={() => setFailed(true)}
          />
        ) : null}
        <AvatarFallback className="bg-surface-overlay font-semibold uppercase text-content-secondary">
          {initials}
        </AvatarFallback>
      </Avatar>

      {showPosition && position !== '---' && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-1 rounded-sm border border-canvas bg-surface-overlay font-display font-bold uppercase leading-4 tracking-wide',
            chip,
            positionColor,
          )}
        >
          {position}
          <span className="sr-only"> — demarcación</span>
        </span>
      )}
    </div>
  );
}
