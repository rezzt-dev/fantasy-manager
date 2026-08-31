'use client';

import { AlertTriangle, Info, OctagonAlert, X } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface AlertPanelProps {
  title: string;
  description?: string;
  level?: 'info' | 'warning' | 'danger';
  onDismiss?: () => void;
  /** Acción que resuelve el aviso. Un aviso sin salida es ruido. */
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Aviso contextual dentro de una vista.
 *
 * `danger` usa `role="alert"` (interrumpe al lector de pantalla porque hay algo
 * que corregir ya); `info` y `warning` usan `role="status"`, que se anuncia sin
 * robar el foco.
 */
const LEVELS = {
  info: {
    box: 'border-info/25 bg-info-quiet',
    icon: 'text-info-text',
    Icon: Info,
  },
  warning: {
    box: 'border-caution/25 bg-caution-quiet',
    icon: 'text-caution-text',
    Icon: AlertTriangle,
  },
  danger: {
    box: 'border-negative/30 bg-negative-quiet',
    icon: 'text-negative-text',
    Icon: OctagonAlert,
  },
} as const;

export default function AlertPanel({
  title,
  description,
  level = 'info',
  onDismiss,
  action,
  className,
  children,
}: AlertPanelProps) {
  const { box, icon, Icon } = LEVELS[level];

  return (
    <div
      role={level === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-lg border p-4', box, className)}
    >
      <Icon className={cn('mt-0.5 h-[18px] w-[18px] shrink-0', icon)} aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-content">{title}</p>
        {description && (
          <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-content-secondary">{description}</p>
        )}
        {children}
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </div>

      {onDismiss && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDismiss}
          className="-mr-1 -mt-1 shrink-0"
          aria-label={`Descartar aviso: ${title}`}
        >
          <X />
        </Button>
      )}
    </div>
  );
}
