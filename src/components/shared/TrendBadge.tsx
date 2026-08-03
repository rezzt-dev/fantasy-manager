'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

interface TrendBadgeProps {
  value: number;
  label?: string;
  className?: string;
  inverse?: boolean;
}

export default function TrendBadge({ value, label, className, inverse = false }: TrendBadgeProps) {
  const positive = inverse ? value < 0 : value > 0;
  const negative = inverse ? value > 0 : value < 0;

  return (
    <Badge
      variant={positive ? 'success' : negative ? 'danger' : 'muted'}
      className={cn('gap-1', className)}
    >
      {positive ? (
        <TrendingUp className="h-3 w-3" />
      ) : negative ? (
        <TrendingDown className="h-3 w-3" />
      ) : (
        <Minus className="h-3 w-3" />
      )}
      {Math.abs(value).toFixed(value % 1 === 0 ? 0 : 1)}%
      {label && <span className="hidden sm:inline">· {label}</span>}
    </Badge>
  );
}
