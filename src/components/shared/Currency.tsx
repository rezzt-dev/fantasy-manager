'use client';

import NumberFlow from '@number-flow/react';
import { formatCurrency, formatCurrencyCompact } from '../../lib/format';
import { cn } from '../../lib/utils';

interface CurrencyProps {
  value: number;
  className?: string;
  /** Anima el cambio de cifra. Solo donde el valor cambia en vivo. */
  animated?: boolean;
  /** Abrevia a «14,2 M €». Úsalo en columnas estrechas y tarjetas. */
  compact?: boolean;
}

/**
 * Importe en euros.
 *
 * Siempre en cifras tabulares: en una columna de valores de mercado, las cifras
 * proporcionales hacen que los millares no se alineen y la comparación deje de
 * ser instantánea.
 */
export default function Currency({ value, className, animated = false, compact = false }: CurrencyProps) {
  if (animated) {
    return (
      <NumberFlow
        value={value}
        locales="es-ES"
        format={
          compact
            ? { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 }
            : { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }
        }
        className={cn('numeral', className)}
        transformTiming={{ duration: 400, easing: 'cubic-bezier(0.2,0.8,0.3,1)' }}
      />
    );
  }

  return (
    <span data-numeric="" className={cn('numeral', className)}>
      {compact ? formatCurrencyCompact(value) : formatCurrency(value)}
    </span>
  );
}
