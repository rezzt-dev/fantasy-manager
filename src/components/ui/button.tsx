import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Los variantes se nombran por JERARQUÍA, no por semántica.
 *
 *   default   → acción sólida de alto contraste. La que hace avanzar la tarea.
 *   accent    → la ÚNICA acción primaria de una pantalla (regla primary-action).
 *               Reservada al acento de marca; si hay dos en una vista, sobra una.
 *   secondary → acción de apoyo con fondo tenue.
 *   outline   → acción de apoyo con borde que cumple 3:1 (WCAG 1.4.11).
 *   ghost     → acción terciaria dentro de una barra de herramientas.
 *   link      → acción terciaria en línea con el texto.
 *   danger    → destructiva. Solo se usa cuando destruir ES la acción principal
 *               (normalmente dentro de un diálogo de confirmación); fuera de ahí
 *               una acción destructiva va en `ghost`.
 *
 * El foco no se declara aquí: lo aporta `:focus-visible` global, para que el
 * anillo sea idéntico en todo el producto.
 */
const buttonVariants = cva(
  [
    'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap',
    'font-medium leading-none',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-fast ease-out',
    'active:scale-[0.985]',
    'disabled:pointer-events-none disabled:opacity-40',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    // Reduce el retardo de 300 ms en táctil.
    '[touch-action:manipulation]',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-ink-900 text-ink-50 shadow-1 hover:bg-white hover:shadow-2 active:bg-ink-800',
        accent:
          'bg-accent text-accent-fg shadow-1 hover:bg-accent-hover hover:shadow-2 active:bg-accent-600',
        secondary:
          'bg-surface-raised text-content shadow-1 hover:bg-surface-overlay active:bg-ink-400',
        outline:
          'border border-ink-600 bg-transparent text-content hover:border-ink-700 hover:bg-white/[0.05] active:bg-white/[0.1]',
        ghost:
          'text-content-secondary hover:bg-white/[0.05] hover:text-content active:bg-white/[0.1]',
        danger:
          'bg-negative text-ink-50 shadow-1 hover:brightness-110 active:brightness-95',
        link: 'text-content underline decoration-ink-600 underline-offset-4 hover:decoration-accent hover:text-accent',

        /* Alias heredados — mismo aspecto que su equivalente actual. */
        destructive: 'bg-negative text-ink-50 shadow-1 hover:brightness-110',
        'ghost-accent': 'text-content hover:bg-white/[0.1] hover:text-white',
        glass:
          'border border-white/[0.09] bg-white/[0.05] text-content backdrop-blur-sm hover:bg-white/[0.1] hover:border-white/[0.14]',
        pill: 'rounded-full border border-white/[0.09] bg-surface-raised text-content hover:bg-surface-overlay',
      },
      size: {
        /* Alturas de la escala. `touch` es la única obligatoria en superficies
           táctiles (≥44 px, regla touch-target-size); los tamaños menores están
           reservados a barras de herramientas de escritorio. */
        xs: 'h-7 rounded-sm px-2 text-xs [&_svg]:size-3.5',
        sm: 'h-9 rounded-md px-3 text-sm [&_svg]:size-4',
        default: 'h-10 rounded-md px-4 text-sm [&_svg]:size-4',
        touch: 'h-11 rounded-md px-4 text-sm [&_svg]:size-[18px]',
        lg: 'h-12 rounded-lg px-6 text-base [&_svg]:size-5',
        icon: 'h-10 w-10 rounded-md [&_svg]:size-[18px]',
        'icon-touch': 'h-11 w-11 rounded-md [&_svg]:size-5',
        'icon-sm': 'h-8 w-8 rounded-md [&_svg]:size-[18px]',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Estado de carga. Bloquea el botón, anuncia `aria-busy` y conserva el ancho
   * (el texto sigue ocupando su sitio) para que el layout no salte.
   */
  loading?: boolean;
  /** Texto que sustituye al contenido mientras carga. Si se omite, se mantiene. */
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading = false, loadingText, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {/* `motion-essential`: con movimiento reducido la ruleta no se congela,
          pasa a pulsar en opacidad. Un botón «cargando» con la ruleta parada
          parece un botón colgado. */}
      {loading && <Loader2 className="motion-essential animate-spin" aria-hidden="true" />}
      {loading && loadingText ? loadingText : children}
    </button>
  ),
);
Button.displayName = 'Button';

export { Button, buttonVariants };
