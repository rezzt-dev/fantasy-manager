import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/**
 * Una tarjeta NO es «un rectángulo con sombra». El variante declara en qué
 * peldaño del eje Z vive el contenido, y de ahí salen a la vez la superficie,
 * el filete y la elevación. Si todas las tarjetas de una pantalla usan
 * `default`, la pantalla no tiene jerarquía: eso es un error de diseño, no de
 * estilo.
 *
 *   sunken      → pozo dentro de otra tarjeta (tablas embebidas, resúmenes).
 *   flat        → agrupa sin competir. Sin filete ni sombra.
 *   default     → la unidad de contenido normal.
 *   raised      → el panel protagonista de la vista. Uno, como mucho dos.
 *   interactive → default que además se puede pulsar; se levanta al pasar.
 *   accent      → la voz del motor de recomendaciones. Filete de acento a la
 *                 izquierda + tinte. Nunca decorativo.
 *   critical    → algo va mal y hay que actuar.
 */
const cardVariants = cva('relative rounded-lg text-content', {
  variants: {
    variant: {
      sunken: 'bg-surface-sunken',
      flat: 'bg-surface',
      default: 'border border-white/[0.09] bg-surface shadow-1',
      raised: 'border border-white/[0.09] bg-surface-raised shadow-3',
      interactive: [
        'border border-white/[0.09] bg-surface shadow-1 cursor-pointer',
        'transition-[transform,border-color,background-color,box-shadow] duration-base ease-out',
        'hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-surface-raised hover:shadow-3',
        'active:translate-y-0 active:shadow-1',
      ].join(' '),
      outline: 'border border-white/[0.09] bg-transparent',
      accent: 'border border-accent/25 bg-accent-quiet shadow-1 before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full before:bg-accent before:content-[""]',
      critical: 'border border-negative/30 bg-negative-quiet shadow-1',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, variant, ...props }, ref) => (
  <div ref={ref} className={cn(cardVariants({ variant }), className)} {...props} />
));
Card.displayName = 'Card';

/* Los relieves [.density-dense_&] compactan el interior cuando <html> lleva la
   clase density-dense (modo compacto global, ver useDensity). El padding sale
   siempre de la escala 12/16/20/24: nunca un p-[17px]. */

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col gap-1 p-5 [.density-dense_&]:gap-0.5 [.density-dense_&]:p-3',
        className,
      )}
      {...props}
    />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'font-display text-base font-semibold leading-tight tracking-[-0.015em] text-content [.density-dense_&]:text-sm',
        className,
      )}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm leading-normal text-content-tertiary [.density-dense_&]:text-xs', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-5 pt-0 [.density-dense_&]:px-3 [.density-dense_&]:pb-3', className)}
      {...props}
    />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-3 border-t border-white/[0.09] px-5 py-3 [.density-dense_&]:px-3 [.density-dense_&]:py-2',
        className,
      )}
      {...props}
    />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
