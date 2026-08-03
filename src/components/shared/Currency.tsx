'use client';

import NumberFlow from '@number-flow/react';

interface CurrencyProps {
  value: number;
  className?: string;
  animated?: boolean;
}

export default function Currency({ value, className, animated = false }: CurrencyProps) {
  if (!animated) {
    return (
      <span className={className}>
        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)}
      </span>
    );
  }

  return (
    <NumberFlow
      value={value}
      format={{ style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }}
      className={className}
      transformTiming={{ duration: 400, easing: 'ease-out' }}
    />
  );
}
