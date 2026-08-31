import { cn } from '../../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'card' | 'circle' | 'text';
}

/**
 * Esqueleto de carga.
 *
 * Reserva el hueco exacto del contenido que va a llegar: eso es lo que evita
 * el salto de layout (CLS). El brillo recorre de izquierda a derecha una sola
 * capa, con `transform`, para no forzar reflow.
 *
 * Lleva `aria-hidden` porque el estado de carga se anuncia una vez en el
 * contenedor (`aria-busy`), no una vez por cada rectángulo.
 *
 * El brillo va marcado como `motion-essential`: con `prefers-reduced-motion` la
 * regla global congela cualquier animación, y un esqueleto congelado no se
 * distingue de una interfaz rota. Bajo esa preferencia el brillo se sustituye
 * por una pulsación lenta de opacidad —cambia el brillo, no la posición—, que
 * sigue diciendo «esto está en marcha» sin desplazar nada.
 */
function Skeleton({ className, variant = 'default', ...props }: SkeletonProps) {
  const shape = {
    default: 'rounded-md',
    card: 'rounded-lg',
    circle: 'rounded-full',
    text: 'rounded-sm',
  }[variant];

  return (
    <div
      aria-hidden="true"
      className={cn('relative overflow-hidden bg-white/[0.05]', shape, className)}
      {...props}
    >
      <div className="shimmer motion-essential absolute inset-0 animate-shimmer" />
    </div>
  );
}

export { Skeleton };
