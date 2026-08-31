'use client';

import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import EmptyState from './EmptyState';
import { useDensity } from '../../hooks/useDensity';
import { cn } from '../../lib/utils';

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  emptyMessage?: string;
  pageSize?: number;
  className?: string;
  /** Nombre del fichero exportado, sin extensión. */
  exportName?: string;
  /** Descripción accesible de la tabla. */
  caption?: string;
  /** Si no se indica, sigue el modo compacto global (useDensity). */
  dense?: boolean;
}

/**
 * Tabla de datos.
 *
 * Decisiones que la hacen legible con 300 filas:
 * - Cabecera pegajosa con superficie propia: al desplazarse no se pierde de
 *   vista qué es cada columna.
 * - `aria-sort` en la cabecera activa, para que un lector de pantalla anuncie
 *   el orden en vigor (regla sortable-table).
 * - El icono de orden distingue las tres situaciones: sin ordenar (doble
 *   flecha, atenuada), ascendente y descendente. No basta con girar una flecha.
 * - Toda la fila es pulsable, pero la cabecera de orden es un `<button>`
 *   real, alcanzable con el tabulador.
 */
export default function DataTable<TData>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'Ninguna fila coincide con los filtros activos.',
  pageSize = 10,
  className,
  exportName = 'fantasy-manager',
  caption,
  dense,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });
  const { dense: globalDense } = useDensity();
  const isDense = dense ?? globalDense;

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const exportCSV = () => {
    const key = (c: ColumnDef<TData, any>) =>
      'accessorKey' in c && typeof c.accessorKey === 'string' ? c.accessorKey : 'id' in c ? String(c.id) : '';

    // Se entrecomilla y se escapan las comillas: los nombres de equipo llevan
    // comas («Deportivo Alavés, S.A.D.») y sin esto rompen el CSV.
    const cell = (v: unknown) => {
      if (v === null || v === undefined) return '';
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const header = columns.map((c) => cell(key(c))).join(',');
    const rows = data.map((row) => columns.map((c) => cell((row as any)[key(c)])).join(','));
    // BOM para que Excel abra los acentos correctamente.
    const csv = `﻿${header}\n${rows.join('\n')}`;

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;
  const rows = table.getRowModel().rows;

  if (data.length === 0) {
    return <EmptyState compact title="Sin resultados" description={emptyMessage} className={className} />;
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn('text-content-tertiary', isDense ? 'text-xs' : 'text-sm')}>
          <span className="numeral text-content-secondary">{rows.length}</span> de{' '}
          <span className="numeral text-content-secondary">{data.length}</span> registros
        </p>
        <Button variant="outline" size={isDense ? 'xs' : 'sm'} onClick={exportCSV}>
          <Download />
          Exportar CSV
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/[0.09]">
        <div className="scrollbar-thin overflow-x-auto">
          <table className={cn('w-full', isDense ? 'text-[13px]' : 'text-sm')}>
            {caption && <caption className="sr-only">{caption}</caption>}

            <thead className="bg-surface-raised">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-white/[0.09]">
                  {headerGroup.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    const canSort = header.column.getCanSort();
                    const SortIcon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ChevronsUpDown;

                    return (
                      <th
                        key={header.id}
                        scope="col"
                        aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : canSort ? 'none' : undefined}
                        className={cn(
                          'whitespace-nowrap text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-content-tertiary',
                          isDense ? 'px-3 py-2' : 'px-4 py-2.5',
                          (header.column.columnDef.meta as any)?.headerClassName,
                        )}
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="flex items-center gap-1.5 rounded-xs transition-colors duration-fast hover:text-content"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <SortIcon
                              className={cn('h-3.5 w-3.5', sorted ? 'text-accent' : 'text-content-disabled')}
                              aria-hidden="true"
                            />
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    'border-b border-white/[0.05] transition-colors duration-fast last:border-b-0',
                    onRowClick && 'cursor-pointer hover:bg-white/[0.05]',
                  )}
                >
                  {row.getVisibleCells().map((cellItem) => (
                    <td
                      key={cellItem.id}
                      className={cn(
                        'align-middle',
                        isDense ? 'px-3 py-1.5' : 'px-4 py-3',
                        (cellItem.column.columnDef.meta as any)?.cellClassName,
                      )}
                    >
                      {flexRender(cellItem.column.columnDef.cell, cellItem.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Paginación de la tabla"
          className="flex flex-col items-center justify-between gap-3 sm:flex-row"
        >
          <p className={cn('text-content-tertiary', isDense ? 'text-xs' : 'text-sm')}>
            Página <span className="numeral text-content-secondary">{currentPage}</span> de{' '}
            <span className="numeral text-content-secondary">{totalPages}</span>
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="Primera página"
            >
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Página anterior"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Página siguiente"
            >
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.setPageIndex(totalPages - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Última página"
            >
              <ChevronsRight />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}

export function DataTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-busy="true">
      <span className="sr-only">Cargando tabla…</span>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" variant="text" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="overflow-hidden rounded-lg border border-white/[0.09]">
        <Skeleton className="h-10 w-full rounded-none" />
        <div className="space-y-px p-px">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-none" />
          ))}
        </div>
      </div>
    </div>
  );
}
