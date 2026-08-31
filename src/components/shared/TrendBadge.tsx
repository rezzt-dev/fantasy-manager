'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TrendBadgeProps {
  value: number;
  label?: string;
  className?: string;
  /** Cuando subir es malo (riesgo, precio de compra), invierte la lectura. */
  inverse?: boolean;
}

/**
 * Variación porcentual.
 *
 * Lleva tres señales redundantes —flecha, signo y color— porque el color solo
 * no vale: quien no distingue rojo de verde sigue leyendo la flecha y el signo.
 */
export default function TrendBadge({ value, label, className, inverse = false }: TrendBadgeProps) {
  const good = inverse ? value < 0 : value > 0;
  const bad = inverse ? value > 0 : value < 0;
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        good && 'border-positive/25 bg-positive-quiet text-positive-text',
        bad && 'border-negative/25 bg-negative-quiet text-negative-text',
        !good && !bad && 'border-white/[0.09] bg-white/[0.05] text-content-tertiary',
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="numeral">
        {value > 0 ? '+' : value < 0 ? '−' : ''}
        {Math.abs(value).toFixed(value % 1 === 0 ? 0 : 1)}%
      </span>
      {label && <span className="hidden text-content-tertiary sm:inline">{label}</span>}
    </span>
  );
}
