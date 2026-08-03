'use client';

import { AlertTriangle, Info, AlertOctagon, X } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface AlertPanelProps {
  title: string;
  description?: string;
  level?: 'info' | 'warning' | 'danger';
  onDismiss?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export default function AlertPanel({ title, description, level = 'info', onDismiss, className, children }: AlertPanelProps) {
  const styles = {
    info: {
      wrapper: 'border-indigo-500/20 bg-indigo-500/[0.06]',
      icon: <Info className="h-5 w-5 text-indigo-400" />,
      title: 'text-foreground',
      text: 'text-indigo-100/80',
    },
    warning: {
      wrapper: 'border-amber-500/20 bg-amber-500/[0.06]',
      icon: <AlertTriangle className="h-5 w-5 text-amber-400" />,
      title: 'text-foreground',
      text: 'text-amber-100/80',
    },
    danger: {
      wrapper: 'border-rose-500/20 bg-rose-500/[0.06]',
      icon: <AlertOctagon className="h-5 w-5 text-rose-400" />,
      title: 'text-foreground',
      text: 'text-rose-100/80',
    },
  }[level];

  return (
    <div className={cn('relative flex items-start gap-3 rounded-xl border p-4', styles.wrapper, className)}>
      <div className="mt-0.5 shrink-0">{styles.icon}</div>
      <div className="min-w-0 flex-1">
        <div className={cn('text-sm font-semibold', styles.title)}>{title}</div>
        {description && <p className={cn('mt-0.5 text-sm', styles.text)}>{description}</p>}
        {children}
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Cerrar alerta"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
