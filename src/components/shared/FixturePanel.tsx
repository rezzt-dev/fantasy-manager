'use client';

import { Home, Plane, Swords } from 'lucide-react';
import type { FixtureOutlook } from '../../types/fantasy';
import { difficultyTone, useTeamName } from './FixtureChip';
import { cn } from '../../lib/utils';

interface FixturePanelProps {
  fixture?: FixtureOutlook | null;
  className?: string;
}

/** Barra apilada de victoria / empate / derrota. */
function OutcomeBar({ fixture }: { fixture: FixtureOutlook }) {
  const segments = [
    { key: 'win', value: fixture.pWin, label: 'Victoria', className: 'bg-positive' },
    { key: 'draw', value: fixture.pDraw, label: 'Empate', className: 'bg-white/25' },
    { key: 'loss', value: fixture.pLoss, label: 'Derrota', className: 'bg-negative' },
  ];

  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full border border-white/[0.09]">
        {segments.map((segment) => (
          <span
            key={segment.key}
            className={cn('h-full', segment.className)}
            style={{ width: `${Math.max(0, segment.value) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-content-tertiary">
        {segments.map((segment) => (
          <span key={segment.key}>
            {segment.label} <span className="numeral text-content-secondary">{Math.round(segment.value * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Ficha completa del emparejamiento de la jornada.
 *
 * Enseña de dónde sale el ajuste de puntos esperados: contra quién juega, qué
 * dice el modelo de goles del partido y cuánto mueve eso la estimación. Sin
 * esto el usuario solo ve un número distinto y no sabe por qué.
 */
export default function FixturePanel({ fixture, className }: FixturePanelProps) {
  const opponent = useTeamName(fixture?.opponentTeamId);
  if (!fixture) return null;

  const VenueIcon = fixture.isHome ? Home : Plane;
  const effect = Math.round((fixture.multiplier - 1) * 100);

  return (
    <div className={cn('rounded-lg border border-white/[0.09] bg-surface-raised/50 p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.05] text-content-tertiary">
            <Swords className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wider text-content-tertiary">
              Próxima jornada
            </div>
            <div className="flex items-center gap-1.5 truncate text-sm font-medium text-content">
              <VenueIcon className="h-3.5 w-3.5 shrink-0 text-content-tertiary" aria-hidden="true" />
              <span className="truncate">
                {fixture.isHome ? 'vs' : 'en'} {opponent.full}
              </span>
            </div>
          </div>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
            difficultyTone(fixture.difficulty),
          )}
        >
          {fixture.label}
          <span className="numeral opacity-70">{fixture.difficulty}/100</span>
        </span>
      </div>

      <div className="mt-3">
        <OutcomeBar fixture={fixture} />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <dt className="text-content-tertiary">Goles a favor</dt>
          <dd className="numeral text-sm font-medium text-content">{fixture.expectedGoalsFor.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-content-tertiary">Goles en contra</dt>
          <dd className="numeral text-sm font-medium text-content">{fixture.expectedGoalsAgainst.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-content-tertiary">Portería a cero</dt>
          <dd className="numeral text-sm font-medium text-content">{Math.round(fixture.pCleanSheet * 100)}%</dd>
        </div>
      </dl>

      <p className="mt-3 border-t border-white/[0.06] pt-3 text-xs leading-relaxed text-content-tertiary">
        {effect === 0 ? (
          <>El emparejamiento no mueve sus puntos esperados respecto a una jornada media.</>
        ) : (
          <>
            El emparejamiento{' '}
            <span className={cn('numeral font-medium', effect > 0 ? 'text-positive-text' : 'text-negative-text')}>
              {effect > 0 ? '+' : '−'}
              {Math.abs(effect)}%
            </span>{' '}
            sus puntos esperados frente a una jornada media, ya contando su demarcación: contra un rival superior el
            portero pierde mucho menos que el delantero.
          </>
        )}
      </p>
    </div>
  );
}
