'use client';

import { Trophy } from 'lucide-react';
import type { EuropeanOutlook } from '../../types/fantasy';
import { cn } from '../../lib/utils';

/**
 * Tono por riesgo de rotación. El color nunca va solo: el chip lleva siempre
 * el icono de competición, su nombre corto y la cifra de riesgo, así que se
 * lee entero sin distinguir un tono de otro.
 */
export function europeanTone(rotationRisk: number): string {
  if (rotationRisk < 32) return 'border-white/[0.09] bg-white/[0.05] text-content-tertiary';
  if (rotationRisk < 55) return 'border-info/25 bg-info-quiet text-info-text';
  if (rotationRisk < 75) return 'border-caution/25 bg-caution-quiet text-caution-text';
  return 'border-negative/25 bg-negative-quiet text-negative-text';
}

/** Frase completa, para tooltips y lectores de pantalla. */
export function europeanSummary(european: EuropeanOutlook): string {
  return `${european.competitionName}. ${european.summary}`;
}

interface EuropeanChipProps {
  european?: EuropeanOutlook | null;
  className?: string;
  /** Oculta el chip cuando el compromiso europeo no condiciona la jornada. */
  hideWhenIrrelevant?: boolean;
}

/**
 * Compromiso europeo del equipo en una línea: qué competición, cuándo y
 * cuánto riesgo de rotación trae a la jornada de LaLiga.
 *
 * Es la respuesta visible a "este jugador rinde, pero ¿va a jugar?", que en
 * semana de Champions es una pregunta distinta de "¿contra quién juega?".
 */
export default function EuropeanChip({ european, className, hideWhenIrrelevant = true }: EuropeanChipProps) {
  if (!european) return null;
  if (hideWhenIrrelevant && european.rotationRisk < 12) return null;

  const summary = europeanSummary(european);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        'transition-colors duration-fast',
        europeanTone(european.rotationRisk),
        className,
      )}
      title={summary}
    >
      <Trophy className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{european.competitionShortName}</span>
      <span className="numeral opacity-70">{european.rotationRisk}</span>
      <span className="sr-only">{summary}</span>
    </span>
  );
}
