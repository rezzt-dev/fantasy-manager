import { Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export default function EmptyState({
  title = 'No hay datos',
  description = 'Todavía no hay información disponible para esta sección.',
  icon,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-card p-8 text-center',
        compact && 'p-6',
        className,
      )}
    >
      <div
        className={cn(
          'mb-3 inline-flex items-center justify-center rounded-full bg-surface-2 text-muted-foreground',
          compact ? 'h-10 w-10' : 'h-14 w-14',
        )}
      >
        {icon || <Inbox className={compact ? 'h-5 w-5' : 'h-6 w-6'} />}
      </div>
      <h3 className={cn('font-semibold text-foreground', compact ? 'text-sm' : 'text-base')}>{title}</h3>
      <p className={cn('max-w-xs text-muted-foreground', compact ? 'mt-1 text-xs' : 'mt-1.5 text-sm')}>
        {description}
      </p>
    </div>
  );
}
