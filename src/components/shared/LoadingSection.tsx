'use client';

import { Skeleton } from '../ui/skeleton';
import { cn } from '../../lib/utils';

interface LoadingSectionProps {
  className?: string;
  titleWidth?: string;
  rows?: number;
  cardCount?: number;
}

export default function LoadingSection({
  className,
  titleWidth = 'w-48',
  rows = 4,
  cardCount,
}: LoadingSectionProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <Skeleton className={`h-8 ${titleWidth}`} />
      {cardCount !== undefined && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: cardCount }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function LoadingCards({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  );
}
