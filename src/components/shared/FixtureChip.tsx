'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Home, Plane } from 'lucide-react';
import fantasyAPI from '../../lib/fantasy/api';
import type { FixtureOutlook } from '../../types/fantasy';
import { cn } from '../../lib/utils';

/**
 * Tono de la dificultad. El color NUNCA va solo: el chip lleva siempre el
 * icono de local/visitante, el nombre del rival y la cifra de dificultad, así
 * que se lee entero sin distinguir verde de rojo.
 */
export function difficultyTone(difficulty: number): string {
  if (difficulty <= 25) return 'border-positive/25 bg-positive-quiet text-positive-text';
  if (difficulty <= 42) return 'border-positive/15 bg-positive-quiet/60 text-positive-text';
  if (difficulty <= 58) return 'border-white/[0.09] bg-white/[0.05] text-content-tertiary';
  if (difficulty <= 75) return 'border-caution/25 bg-caution-quiet text-caution-text';
  return 'border-negative/25 bg-negative-quiet text-negative-text';
}

/** Nombre del rival desde el catálogo de equipos (`/api/teams`). */
export function useTeamName(teamId: number | undefined): { short: string; full: string } {
  const { data: teams } = useQuery({
    queryKey: ['teams-catalog'],
    queryFn: () => fantasyAPI.getTeamsCatalog(),
    staleTime: 24 * 60 * 60 * 1000,
  });

  return useMemo(() => {
    const team = teamId === undefined ? undefined : teams?.find((entry) => entry.id === teamId);
    if (!team) return { short: teamId === undefined ? '—' : `#${teamId}`, full: 'Rival por confirmar' };
    return { short: team.shortName || team.name, full: team.name };
  }, [teams, teamId]);
}

/** Frase completa del emparejamiento, para tooltips y lectores de pantalla. */
export function fixtureSummary(fixture: FixtureOutlook, opponentName: string): string {
  const effect = Math.round((fixture.multiplier - 1) * 100);
  const effectText = effect === 0 ? 'sin efecto sobre sus puntos' : `${effect > 0 ? '+' : '−'}${Math.abs(effect)}% de puntos esperados`;
  return (
    `${fixture.isHome ? 'En casa contra' : 'A domicilio contra'} ${opponentName}. ` +
    `Emparejamiento ${fixture.label.toLowerCase()} (${fixture.difficulty}/100): ${effectText}. ` +
    `Victoria ${Math.round(fixture.pWin * 100)}%, empate ${Math.round(fixture.pDraw * 100)}%, ` +
    `derrota ${Math.round(fixture.pLoss * 100)}%.`
  );
}

interface FixtureChipProps {
  fixture?: FixtureOutlook | null;
  className?: string;
  /** Añade el efecto en puntos (+/−%) junto a la dificultad. */
  showEffect?: boolean;
}

/**
 * Emparejamiento de la jornada en una línea: contra quién juega, dónde y cómo
 * de duro es. Es la respuesta visible a "este jugador es bueno, pero ¿contra
 * quién juega?".
 */
export default function FixtureChip({ fixture, className, showEffect = false }: FixtureChipProps) {
  const opponent = useTeamName(fixture?.opponentTeamId);
  if (!fixture) return null;

  const Icon = fixture.isHome ? Home : Plane;
  const effect = Math.round((fixture.multiplier - 1) * 100);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        'transition-colors duration-fast',
        difficultyTone(fixture.difficulty),
        className,
      )}
      title={fixtureSummary(fixture, opponent.full)}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{opponent.short}</span>
      <span className="numeral opacity-70">{fixture.difficulty}</span>
      {showEffect && effect !== 0 && (
        <span className="numeral">
          {effect > 0 ? '+' : '−'}
          {Math.abs(effect)}%
        </span>
      )}
      <span className="sr-only">{fixtureSummary(fixture, opponent.full)}</span>
    </span>
  );
}
