'use client';

import NumberFlow from '@number-flow/react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  trend?: { value: number; label?: string } | null;
  className?: string;
  suffix?: string;
  prefix?: string;
}

export default function KpiCard({ icon, label, value, sub, trend, className, suffix, prefix }: KpiCardProps) {
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  const isValidNumber = !Number.isNaN(numericValue);
  const trendPositive = trend ? trend.value > 0 : false;
  const trendNegative = trend ? trend.value < 0 : false;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-surface-2 text-foreground">
            {icon}
          </span>
          <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {isValidNumber ? (
                <NumberFlow
                  value={numericValue}
                  prefix={prefix}
                  suffix={suffix}
                  format={{ maximumFractionDigits: 1 }}
                  transformTiming={{ duration: 500, easing: 'ease-out' }}
                />
              ) : (
                <span>{value}</span>
              )}
            </div>
            {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
          </div>
          {trend && (
            <Badge
              variant={trendPositive ? 'success' : trendNegative ? 'danger' : 'muted'}
              className="h-fit shrink-0 gap-1"
            >
              {trendPositive ? <TrendingUp className="h-3 w-3" /> : trendNegative ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {Math.abs(trend.value).toFixed(trend.value % 1 === 0 ? 0 : 1)}%
              {trend.label && <span className="hidden sm:inline">· {trend.label}</span>}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
