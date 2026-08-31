'use client';

import { Shield, ChevronRight } from 'lucide-react';
import PlayerAvatar from './PlayerAvatar';
import PlayerStatusBadge from './PlayerStatusBadge';
import Currency from './Currency';
import type { PlayerMaster } from '../../types/fantasy';
import { positionShortName, positionTextClass } from '../../lib/format';
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

/**
 * Fila de jugador en tabla.
 *
 * El nombre y la demarcación van juntos en la misma celda: partirlos en dos
 * columnas obliga a la mirada a saltar para identificar a una sola persona.
 * Todas las cifras van en `.numeral` para que las columnas se alineen al
 * ordenar.
 */
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
  const position = positionShortName(player.position, player.positionId);

  // Titularidad: por debajo de 0,35 el jugador es un suplente claro y conviene
  // que salte a la vista; entre 0,35 y 0,8 es una duda, no un problema.
  const starterTone =
    starterScore === undefined
      ? ''
      : starterScore >= 0.8
        ? 'border-positive/25 bg-positive-quiet text-positive-text'
        : starterScore >= 0.55
          ? 'border-white/[0.09] bg-white/[0.05] text-content-secondary'
          : starterScore >= 0.35
            ? 'border-caution/25 bg-caution-quiet text-caution-text'
            : 'border-negative/25 bg-negative-quiet text-negative-text';

  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-white/[0.05] transition-colors duration-fast',
        onClick && 'cursor-pointer hover:bg-white/[0.05]',
        className,
      )}
    >
      <td className="py-2.5 pl-2 pr-3 sm:pl-4 [.density-dense_&]:py-1.5">
        <div className="flex items-center gap-3">
          <PlayerAvatar player={player} size="sm" />
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="truncate font-medium text-content">{player.nickname}</span>
              <span
                className={cn(
                  'numeral shrink-0 text-[10px] font-bold uppercase tracking-wider',
                  positionTextClass(player.position, player.positionId),
                )}
              >
                {position}
              </span>
            </div>
            {player.team?.name && (
              <div className="truncate text-xs text-content-tertiary">{player.team.name}</div>
            )}
          </div>
        </div>
      </td>

      <td className="px-3 py-2.5 [.density-dense_&]:py-1.5">
        <div className="flex flex-col items-start gap-1">
          <PlayerStatusBadge status={player.playerStatus} />
          {starterLabel && starterScore !== undefined && (
            <span
              className={cn(
                'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium',
                starterTone,
              )}
            >
              {starterLabel}
            </span>
          )}
        </div>
      </td>

      <td className="numeral px-3 py-2.5 text-right font-semibold text-content [.density-dense_&]:py-1.5">
        {displayPoints}
      </td>

      <td className="px-3 py-2.5 text-right [.density-dense_&]:py-1.5">
        <Currency value={player.marketValue} compact className="text-sm text-content-secondary" />
      </td>

      <td className="px-3 py-2.5 text-right [.density-dense_&]:py-1.5">
        <span className="inline-flex items-center justify-end gap-1.5">
          <Currency value={buyoutClause ?? 0} compact className="text-sm text-content" />
          {isShielded && (
            <Shield className="h-3.5 w-3.5 shrink-0 text-content-tertiary" aria-label="Cláusula blindada" />
          )}
        </span>
      </td>

      {onClick && (
        <td className="w-8 py-2.5 pr-2 text-right sm:pr-4 [.density-dense_&]:py-1.5">
          <ChevronRight className="ml-auto h-4 w-4 text-content-tertiary" aria-hidden="true" />
        </td>
      )}
    </tr>
  );
}
