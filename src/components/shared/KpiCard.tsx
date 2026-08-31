'use client';

import NumberFlow, { type Format } from '@number-flow/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  trend?: { value: number; label?: string } | null;
  /**
   * `lead` levanta la tarjeta al peldaño superior. Se usa para el dato que
   * gobierna la vista, y solo para uno: si todas destacan, ninguna destaca.
   */
  emphasis?: 'default' | 'lead';
  /** Si subir es malo (p. ej. riesgo de clausulazo), invierte la lectura del signo. */
  inverse?: boolean;
  className?: string;
  suffix?: string;
  prefix?: string;
  /** Sobrescribe el formato. Por defecto las magnitudes grandes se abrevian. */
  format?: Format;
}

/**
 * Indicador clave.
 *
 * Jerarquía dentro de la tarjeta: la cifra manda (cuerpo grande, cifras
 * tabulares), la etiqueta es terciaria y el icono se atenúa a propósito —un
 * icono sólido pesa visualmente más que el texto que acompaña, así que se
 * compensa bajándole el color en vez de encerrarlo en una caja que compite
 * con el dato.
 */
export default function KpiCard({
  icon,
  label,
  value,
  sub,
  trend,
  emphasis = 'default',
  inverse = false,
  className,
  suffix,
  prefix,
  format,
}: KpiCardProps) {
  const numericValue = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  const isValidNumber = !Number.isNaN(numericValue);

  // Los valores de mercado llegan en euros enteros: sin abreviar, «128.400.000»
  // no cabe en la tarjeta y obliga a reducir el cuerpo hasta que deja de leerse.
  // Por debajo de 100.000 la cifra exacta sí importa (puntos, jugadores), así
  // que solo se abrevian las magnitudes grandes.
  const numberFormat: Format =
    format ??
    (Math.abs(numericValue) >= 100_000
      ? { notation: 'compact', maximumFractionDigits: 1 }
      : { maximumFractionDigits: 1 });

  const raw = trend?.value ?? 0;
  const good = inverse ? raw < 0 : raw > 0;
  const bad = inverse ? raw > 0 : raw < 0;
  const TrendIcon = raw > 0 ? TrendingUp : raw < 0 ? TrendingDown : Minus;

  return (
    <Card
      variant={emphasis === 'lead' ? 'raised' : 'default'}
      className={cn('flex h-full flex-col justify-between gap-4 p-5 [.density-dense_&]:gap-3 [.density-dense_&]:p-3.5', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="eyebrow leading-tight">{label}</span>
        <span className="shrink-0 text-content-tertiary [&>svg]:size-[18px]" aria-hidden="true">
          {icon}
        </span>
      </div>

      {/* La cifra y la variación comparten fila; el pie ocupa la suya entera.
          Metiéndolo en la misma columna que el número se quedaba sin anchura y
          acababa recortado con puntos suspensivos. */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <div
            data-numeric=""
            className={cn(
              'numeral min-w-0 font-semibold tracking-[-0.03em] text-content',
              emphasis === 'lead' ? 'text-3xl sm:text-4xl' : 'text-2xl',
              '[.density-dense_&]:text-xl',
            )}
          >
            {isValidNumber ? (
              <NumberFlow
                value={numericValue}
                prefix={prefix}
                suffix={suffix}
                locales="es-ES"
                format={numberFormat}
                transformTiming={{ duration: 450, easing: 'cubic-bezier(0.2,0.8,0.3,1)' }}
              />
            ) : (
              <span>{value}</span>
            )}
          </div>

          {trend && (
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                good && 'border-positive/25 bg-positive-quiet text-positive-text',
                bad && 'border-negative/25 bg-negative-quiet text-negative-text',
                !good && !bad && 'border-white/[0.09] bg-white/[0.05] text-content-tertiary',
              )}
            >
              <TrendIcon className="h-3 w-3" aria-hidden="true" />
              <span className="numeral">
                {raw > 0 ? '+' : raw < 0 ? '−' : ''}
                {Math.abs(raw).toFixed(raw % 1 === 0 ? 0 : 1)}%
              </span>
            </span>
          )}
        </div>

        {(sub || trend?.label) && (
          <p className="mt-1.5 text-xs leading-snug text-content-tertiary">
            {sub}
            {sub && trend?.label && ' · '}
            {trend?.label}
          </p>
        )}
      </div>
    </Card>
  );
}
