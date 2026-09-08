'use client';

import { CalendarClock, Home, Plane, Trophy } from 'lucide-react';
import type { EuropeanFixtureRef, EuropeanOutlook, PlayerEuropeanImpact } from '../../types/fantasy';
import { europeanTone } from './EuropeanChip';
import { cn } from '../../lib/utils';

interface EuropeanPanelProps {
  european?: EuropeanOutlook | null;
  /** Efecto concreto sobre este jugador, cuando se conoce. */
  impact?: PlayerEuropeanImpact | null;
  className?: string;
}

function formatKickoff(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatRest(days: number): string {
  if (days < 1.5) return '1 día';
  return `${Math.round(days)} días`;
}

/** Una de las dos patas del calendario: el partido europeo y su distancia. */
function FixtureLine({ fixture, side }: { fixture: EuropeanFixtureRef; side: 'before' | 'after' }) {
  const VenueIcon = fixture.isHome ? Home : Plane;
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/[0.09] bg-white/[0.05] text-content-tertiary">
        <VenueIcon className="h-3 w-3" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-xs font-medium text-content">
          {side === 'before' ? 'Antes: ' : 'Después: '}
          {fixture.isHome ? 'vs' : 'en'} {fixture.opponentName}
        </div>
        <div className="text-[11px] text-content-tertiary">
          {fixture.competitionShortName} · {fixture.stageLabel} · {formatKickoff(fixture.kickoff)} ·{' '}
          <span className="numeral">{formatRest(fixture.restDays)}</span>{' '}
          {side === 'before' ? 'de descanso' : 'después de la jornada'}
        </div>
      </div>
    </div>
  );
}

/**
 * Ficha completa del compromiso europeo del equipo.
 *
 * Enseña de dónde sale el ajuste: qué partido europeo hay pegado a la jornada,
 * cuántos días de descanso quedan y cuántos cambios se esperan en el once. Sin
 * esto el usuario solo ve unos puntos esperados más bajos y no sabe si es que
 * el jugador ha bajado su nivel o que su entrenador tiene la cabeza en el
 * martes — dos cosas que se arreglan de forma opuesta.
 */
export default function EuropeanPanel({ european, impact, className }: EuropeanPanelProps) {
  if (!european) return null;

  const effect = impact ? Math.round((impact.xpMultiplier - 1) * 100) : null;
  const fatigue = Math.round((1 - european.fatigueMultiplier) * 100);

  return (
    <div className={cn('rounded-lg border border-white/[0.09] bg-surface-raised/50 p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.05] text-content-tertiary">
            <Trophy className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wider text-content-tertiary">
              Coordinación con Europa
            </div>
            <div className="truncate text-sm font-medium text-content">{european.competitionName}</div>
          </div>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
            europeanTone(european.rotationRisk),
          )}
        >
          {european.label}
          <span className="numeral opacity-70">{european.rotationRisk}/100</span>
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {european.before && <FixtureLine fixture={european.before} side="before" />}
        {european.after && <FixtureLine fixture={european.after} side="after" />}
        {!european.before && !european.after && (
          <div className="flex items-center gap-2 text-xs text-content-tertiary">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Sin partido europeo pegado a esta jornada.
          </div>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-3 text-[11px]">
        <div>
          <dt className="text-content-tertiary">Cambios previstos</dt>
          <dd className="numeral text-sm font-medium text-content">{european.expectedRotatedSlots.toFixed(1)}</dd>
        </div>
        <div>
          <dt className="text-content-tertiary">Titularidad</dt>
          <dd className="numeral text-sm font-medium text-content">
            {impact && impact.pStarterBefore !== null && impact.pStarterAfter !== null ? (
              <>
                {Math.round(impact.pStarterBefore * 100)}% → {Math.round(impact.pStarterAfter * 100)}%
              </>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div>
          <dt className="text-content-tertiary">Desgaste</dt>
          <dd className="numeral text-sm font-medium text-content">{fatigue > 0 ? `−${fatigue}%` : 'ninguno'}</dd>
        </div>
      </dl>

      {impact?.advice && (
        <p className="mt-3 border-t border-white/[0.06] pt-3 text-xs leading-relaxed text-content-tertiary">
          {effect !== null && effect !== 0 && (
            <>
              <span
                className={cn('numeral font-medium', effect > 0 ? 'text-positive-text' : 'text-negative-text')}
              >
                {effect > 0 ? '+' : '−'}
                {Math.abs(effect)}%
              </span>{' '}
              sobre sus puntos esperados.{' '}
            </>
          )}
          {impact.advice}
        </p>
      )}

      {impact?.weight === 0 && (
        <p className="mt-2 text-[11px] leading-relaxed text-content-tertiary">
          Su alineación ya se conoce, así que el modelo de rotación no se aplica: manda el dato real.
        </p>
      )}
    </div>
  );
}
