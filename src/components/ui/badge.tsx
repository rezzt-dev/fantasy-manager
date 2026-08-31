import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/**
 * Distintivo de estado o categoría.
 *
 * Regla dura del sistema: **el color nunca es la única señal**. Los variantes
 * cromáticos (`success` / `warning` / `danger` / `accent`) esperan un icono o
 * un signo junto al texto; por eso el componente acepta `icon` y lo coloca él
 * mismo con el tamaño correcto. Si un distintivo de color aparece sin icono ni
 * texto que explique el estado, está mal usado.
 *
 * Los tintes cromáticos van sobre el tono 900 de su rampa (no un `/10` sobre
 * blanco): así el fondo mantiene su color en cualquier superficie y el texto
 * usa el tono 400, que cumple 4.5:1 sobre él.
 */
const badgeVariants = cva(
  [
    'inline-flex max-w-full items-center gap-1.5 rounded-full border',
    'px-2 py-0.5 text-xs font-medium leading-5',
    'transition-colors duration-fast ease-out',
    '[&>svg]:size-3 [&>svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        /* Neutros */
        neutral: 'border-white/[0.09] bg-white/[0.05] text-content-secondary',
        muted: 'border-transparent bg-white/[0.05] text-content-tertiary',
        outline: 'border-ink-600 bg-transparent text-content-secondary',
        solid: 'border-transparent bg-ink-900 text-ink-50 font-semibold',

        /* Cromáticos — siempre con icono */
        accent: 'border-accent/30 bg-accent-quiet text-accent-300 font-semibold',
        success: 'border-positive/25 bg-positive-quiet text-positive-text',
        warning: 'border-caution/25 bg-caution-quiet text-caution-text',
        danger: 'border-negative/25 bg-negative-quiet text-negative-text',

        /* Alias heredados */
        default: 'border-transparent bg-ink-900 text-ink-50 font-semibold',
        secondary: 'border-white/[0.09] bg-surface-raised text-content-secondary',
        destructive: 'border-negative/25 bg-negative-quiet text-negative-text',
        'outline-muted': 'border-white/[0.09] bg-white/[0.05] text-content-tertiary',
        info: 'border-info/25 bg-info-quiet text-info-text',
        glow: 'border-accent/30 bg-accent-quiet text-accent-300',
        dot: 'border-transparent bg-white/[0.05] text-content-tertiary',
      },
      size: {
        sm: 'px-1.5 text-[11px] leading-4 [&>svg]:size-2.5',
        default: '',
      },
    },
    defaultVariants: { variant: 'neutral', size: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Señal no cromática que acompaña al color. Obligatoria en los variantes de estado. */
  icon?: React.ReactNode;
}

/**
 * Va con `forwardRef` porque los primitivos de Radix que lo envuelven con
 * `asChild` (Tooltip, Popover) necesitan la referencia al nodo: sin ella el
 * tooltip no se ancla y React avisa por consola.
 */
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, icon, children, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {icon}
      {children}
    </span>
  ),
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
