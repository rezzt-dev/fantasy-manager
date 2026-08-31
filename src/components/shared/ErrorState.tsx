'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface ErrorStateProps {
  title?: string;
  /** Debe explicar la causa y cómo salir del error (regla error-clarity). */
  description?: string;
  onRetry?: () => void;
  /** Detalle técnico plegado: útil para depurar sin gritarle al usuario. */
  detail?: string;
  compact?: boolean;
  className?: string;
}

export default function ErrorState({
  title = 'No hemos podido cargar esta sección',
  description = 'La API de LALIGA FANTASY no ha respondido. Suele ser temporal: vuelve a intentarlo en unos segundos.',
  onRetry,
  detail,
  compact,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-3 rounded-lg border border-negative/30 bg-negative-quiet',
        compact ? 'p-4' : 'p-6',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-negative/15 text-negative-text"
          aria-hidden="true"
        >
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className={cn('font-display font-semibold text-content', compact ? 'text-sm' : 'text-base')}>
            {title}
          </h3>
          <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-content-secondary">{description}</p>
        </div>
      </div>

      {detail && (
        <details className="w-full">
          <summary className="cursor-pointer text-xs font-medium text-content-tertiary hover:text-content">
            Ver detalle técnico
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-sm bg-surface-sunken p-3 text-[11px] leading-relaxed text-content-tertiary">
            {detail}
          </pre>
        </details>
      )}

      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="sm:ml-11">
          <RotateCcw />
          Reintentar
        </Button>
      )}
    </div>
  );
}
