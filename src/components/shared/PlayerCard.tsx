'use client';

import { Shield, Sparkles, Crown } from 'lucide-react';
import PlayerAvatar from './PlayerAvatar';
import PlayerStatusBadge from './PlayerStatusBadge';
import Currency from './Currency';
import type { PlayerMaster } from '../../types/fantasy';
import { cn } from '../../lib/utils';

interface PlayerCardProps {
  player: PlayerMaster;
  buyoutClause?: number;
  isShielded?: boolean;
  suggested?: boolean;
  /** Capitán recomendado de la jornada: sus puntos se duplican. */
  isCaptain?: boolean;
  expectedPoints?: number | null;
  highlight?: boolean;
  owner?: { type: 'official' | 'team'; label: string };
  onClick?: () => void;
  className?: string;
}

/**
 * Ficha de jugador en lista.
 *
 * Lo que el motor señala (capitán, sugerido, destacado) se marca con el acento
 * y con un icono; el resto de la ficha se mantiene neutra. Así, al recorrer una
 * lista de veinte jugadores, lo único que llama la atención es la opinión del
 * motor —que es justo para lo que se abre esta pantalla—.
 *
 * Cuando es pulsable se renderiza como `<button>`: un `div` con `onClick` no se
 * alcanza con el tabulador ni responde a Intro.
 */
export default function PlayerCard({
  player,
  buyoutClause,
  isShielded,
  suggested,
  isCaptain,
  expectedPoints,
  highlight,
  owner,
  onClick,
  className,
}: PlayerCardProps) {
  const points = player.points || player.lastSeasonPoints || 0;
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'relative flex w-full min-w-0 items-center gap-3 rounded-md border bg-surface p-3 text-left',
        'transition-[background-color,border-color] duration-fast ease-out',
        '[.density-dense_&]:gap-2.5 [.density-dense_&]:p-2',
        onClick && 'hover:border-white/[0.14] hover:bg-surface-raised',
        isCaptain || highlight ? 'border-accent/40' : 'border-white/[0.09]',
        suggested && !isCaptain && !highlight && 'border-dashed border-accent/30',
        className,
      )}
    >
      {(isCaptain || highlight) && (
        <span
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-fg"
          title={isCaptain ? 'Capitán recomendado: sus puntos se duplican' : 'Elección del motor'}
        >
          {isCaptain ? <Crown className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
          <span className="sr-only">{isCaptain ? 'Capitán recomendado' : 'Elección del motor'}</span>
        </span>
      )}

      <PlayerAvatar player={player} size="md" showPosition />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-display text-sm font-semibold text-content">
            {player.nickname || player.name}
          </span>
          {isCaptain && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-accent/30 bg-accent-quiet px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-300">
              <Crown className="h-2.5 w-2.5" aria-hidden="true" /> Capitán
            </span>
          )}
          {suggested && !isCaptain && (
            <span className="inline-flex shrink-0 items-center rounded-full border border-accent/25 bg-accent-quiet px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent-300">
              Sugerido
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-content-tertiary">
          {player.team?.name && <span className="truncate">{player.team.name}</span>}
          {owner && (
            <span className={cn('shrink-0', owner.type === 'team' ? 'text-caution-text' : 'text-positive-text')}>
              {owner.label}
            </span>
          )}
          <span className="numeral shrink-0">{points} pts</span>
          {expectedPoints != null && (
            <span className="numeral shrink-0 font-medium text-content-secondary">
              {expectedPoints.toFixed(1)} xP
              {isCaptain && <span className="ml-1 text-accent-300">→ {(expectedPoints * 2).toFixed(1)}</span>}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <PlayerStatusBadge status={player.playerStatus} />
        {typeof buyoutClause === 'number' && buyoutClause > 0 && (
          <span className="flex items-center gap-1 text-xs text-content-tertiary">
            <Shield className="h-3 w-3" aria-hidden="true" />
            <Currency value={buyoutClause} compact />
            {isShielded && (
              <span className="text-[10px] font-semibold text-content-secondary" title="Cláusula blindada">
                B
              </span>
            )}
          </span>
        )}
      </div>
    </Wrapper>
  );
}
