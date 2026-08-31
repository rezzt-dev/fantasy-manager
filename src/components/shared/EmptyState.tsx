import { Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  title?: string;
  /** Di qué falta y qué puede hacer el usuario, no «no hay datos». */
  description?: string;
  icon?: React.ReactNode;
  /** Salida del estado vacío: casi siempre hay una. */
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
  /**
   * Ilustración a pantalla completa en lugar del icono en su círculo.
   *
   * Reservado a los estados vacíos que ocupan TODA la ventana y de los que el
   * usuario no puede salir desde la propia aplicación —«no juegas ninguna
   * liga»—. En un estado vacío embebido dentro de una tarjeta, una ilustración
   * roba más atención de la que aporta: ahí el icono es lo correcto.
   */
  illustration?: React.ReactNode;
}

/**
 * Estado vacío.
 *
 * El icono va dentro de un círculo tenue en lugar de escalarse a 48 px: un
 * glifo de 20 px estirado se ve tosco y sin detalle.
 */
export default function EmptyState({
  title = 'Todavía no hay nada aquí',
  description = 'Cuando haya datos de tu liga aparecerán en esta sección.',
  icon,
  action,
  className,
  compact = false,
  illustration,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-400 bg-surface text-center',
        compact ? 'gap-2 p-6' : 'gap-3 p-8 sm:p-12',
        className,
      )}
    >
      {illustration ?? (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-white/[0.05] text-content-tertiary',
            compact ? 'h-10 w-10 [&>svg]:size-[18px]' : 'h-12 w-12 [&>svg]:size-5',
          )}
          aria-hidden="true"
        >
          {icon || <Inbox />}
        </span>
      )}
      <div>
        <h3 className={cn('font-display font-semibold text-content', compact ? 'text-sm' : 'text-base')}>
          {title}
        </h3>
        <p
          className={cn(
            'mx-auto mt-1 max-w-[38ch] leading-relaxed text-content-tertiary',
            compact ? 'text-xs' : 'text-sm',
          )}
        >
          {description}
        </p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
