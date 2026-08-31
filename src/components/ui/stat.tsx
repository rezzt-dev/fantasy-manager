import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/**
 * Cifra.
 *
 * Cualquier número que el usuario compara o escanea en columna pasa por aquí:
 * valor de mercado, puntos, xP, porcentajes, cláusulas. Usa cifras tabulares
 * (`.numeral`) para que las columnas no bailen al ordenar la tabla, y el signo
 * se marca con carácter además de con color, porque el color nunca puede ser
 * la única señal.
 *
 * `tone="auto"` deduce el tono del signo del valor y antepone + o −.
 */
const statVariants = cva('numeral inline-flex items-baseline gap-0.5 font-medium tabular-nums', {
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg font-semibold',
      xl: 'text-2xl font-bold tracking-[-0.02em]',
      display: 'text-4xl font-bold tracking-[-0.03em] sm:text-5xl',
    },
    tone: {
      default: 'text-content',
      secondary: 'text-content-secondary',
      tertiary: 'text-content-tertiary',
      positive: 'text-positive-text',
      negative: 'text-negative-text',
      caution: 'text-caution-text',
      accent: 'text-accent-300',
    },
  },
  defaultVariants: { size: 'base', tone: 'default' },
});

export interface StatProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'prefix'>,
    VariantProps<typeof statVariants> {
  /** Texto ya formateado. Formatéalo con `src/lib/format.ts`, nunca a mano. */
  value: string | number;
  /** Unidad pequeña pegada a la cifra: «pts», «xP», «%». */
  unit?: string;
  prefix?: string;
  /** Antepone el signo y deduce el tono. Para variaciones, no para valores absolutos. */
  signed?: boolean;
}

export function Stat({
  value,
  unit,
  prefix,
  signed,
  size,
  tone,
  className,
  ...props
}: StatProps) {
  const numeric = typeof value === 'number' ? value : Number.NaN;
  const resolvedTone =
    tone ?? (signed && !Number.isNaN(numeric) ? (numeric > 0 ? 'positive' : numeric < 0 ? 'negative' : 'tertiary') : undefined);
  const sign = signed && !Number.isNaN(numeric) ? (numeric > 0 ? '+' : numeric < 0 ? '−' : '±') : '';
  const shown = signed && !Number.isNaN(numeric) ? Math.abs(numeric) : value;

  return (
    <span
      data-numeric=""
      className={cn(statVariants({ size, tone: resolvedTone }), className)}
      {...props}
    >
      {sign}
      {prefix}
      {shown}
      {unit && <span className="ml-0.5 text-[0.72em] font-medium opacity-70">{unit}</span>}
    </span>
  );
}

export { statVariants };
