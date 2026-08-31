'use client';

import { Skeleton } from '../ui/skeleton';
import { cn } from '../../lib/utils';

interface LoadingSectionProps {
  className?: string;
  titleWidth?: string;
  rows?: number;
  cardCount?: number;
  /** Lo que se está cargando, para el anuncio del lector de pantalla. */
  label?: string;
}

/**
 * Andamio de carga de una sección completa.
 *
 * Reproduce la silueta real de la vista (cabecera → indicadores → filas) para
 * que al llegar los datos nada se desplace. El anuncio accesible se hace una
 * sola vez aquí, no en cada rectángulo.
 */
export default function LoadingSection({
  className,
  titleWidth = 'w-56',
  rows = 4,
  cardCount,
  label = 'Cargando datos de la liga',
}: LoadingSectionProps) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-busy="true" aria-label={label}>
      <span className="sr-only">{label}…</span>

      <div className="space-y-2">
        <Skeleton className="h-3 w-24" variant="text" />
        <Skeleton className={cn('h-7', titleWidth)} />
      </div>

      {cardCount !== undefined && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: cardCount }).map((_, i) => (
            <Skeleton key={i} className="h-[116px] w-full" variant="card" />
          ))}
        </div>
      )}

      <Skeleton className="h-10 w-full max-w-md" />

      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" variant="card" />
        ))}
      </div>
    </div>
  );
}

export function LoadingCards({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)} role="status" aria-busy="true">
      <span className="sr-only">Cargando indicadores…</span>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[116px] w-full" variant="card" />
      ))}
    </div>
  );
}
