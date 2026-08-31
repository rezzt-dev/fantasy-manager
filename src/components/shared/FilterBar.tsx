'use client';

import { Search, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
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
  /** Número de resultados tras filtrar. Se anuncia con `aria-live`. */
  resultCount?: number;
  className?: string;
}

/**
 * Barra de búsqueda y filtros.
 *
 * Los filtros activos se repiten debajo como fichas retirables: en un desplegable
 * cerrado no se ve qué está filtrando, y el usuario acaba creyendo que faltan
 * datos. El recuento va en una región `aria-live` para que quien no ve la tabla
 * sepa cuántas filas quedan.
 */
export default function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Buscar…',
  filters,
  resultCount,
  className,
}: FilterBarProps) {
  const active = filters?.filter((f) => f.value && f.value !== 'all') ?? [];
  const hasSearch = Boolean(search);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {onSearchChange && (
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-tertiary"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={search || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="pl-9 pr-9"
            />
            {hasSearch && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-content-tertiary transition-colors duration-fast hover:text-content"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {filters && filters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {filters.map((filter) => (
              <Select key={filter.key} value={filter.value} onValueChange={filter.onChange}>
                <SelectTrigger
                  className="h-11 w-auto min-w-[132px] border-ink-600 bg-surface-raised text-sm sm:h-10"
                  aria-label={filter.label}
                >
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  {filter.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>
        )}
      </div>

      {(active.length > 0 || hasSearch) && (
        <div className="flex flex-wrap items-center gap-2">
          {active.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => f.onChange('all')}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.09] bg-white/[0.05] py-1 pl-2.5 pr-2 text-xs text-content-secondary transition-colors duration-fast hover:border-white/[0.14] hover:text-content"
            >
              <span className="text-content-tertiary">{f.label}:</span>
              {f.options.find((o) => o.value === f.value)?.label}
              <X className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only">Quitar filtro</span>
            </button>
          ))}

          {active.length > 0 && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => active.forEach((f) => f.onChange('all'))}
            >
              Limpiar filtros
            </Button>
          )}

          {resultCount !== undefined && (
            <p className="ml-auto text-xs text-content-tertiary" aria-live="polite">
              <span className="numeral">{resultCount}</span> resultado{resultCount === 1 ? '' : 's'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
