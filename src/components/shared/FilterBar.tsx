'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

interface Filter {
  key: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

interface FilterBarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: Filter[];
  className?: string;
}

export default function FilterBar({ search, onSearchChange, searchPlaceholder = 'Buscar…', filters, className }: FilterBarProps) {
  const activeFilters = filters?.filter((f) => f.value && f.value !== 'all') || [];

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      {onSearchChange && (
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={search || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 border-white/[0.08] bg-surface-2 pl-9 text-sm placeholder:text-muted-foreground focus:border-white/[0.18] focus:ring-white/10"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {filters && filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="hidden h-4 w-4 text-muted-foreground sm:block" />
          {filters.map((filter) => (
            <select
              key={filter.key}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="h-10 rounded-lg border border-white/[0.08] bg-surface-2 px-3 text-sm text-foreground outline-none transition-colors hover:border-white/[0.12] focus:border-white/[0.18] focus:ring-1 focus:ring-white/10"
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ))}
        </div>
      )}

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((f) => (
            <Badge key={f.key} variant="outline-muted" className="gap-1">
              {f.label}: {f.options.find((o) => o.value === f.value)?.label}
              <button onClick={() => f.onChange('all')} aria-label="Quitar filtro">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="xs" onClick={() => activeFilters.forEach((f) => f.onChange('all'))}>
            Limpiar
          </Button>
        </div>
      )}
    </div>
  );
}
