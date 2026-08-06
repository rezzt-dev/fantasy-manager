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
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, ArrowUpDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { useDensity } from '../../hooks/useDensity';
import { cn } from '../../lib/utils';

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  emptyMessage?: string;
  pageSize?: number;
  className?: string;
  /** Si no se indica, sigue el modo compacto global (useDensity). */
  dense?: boolean;
}

export default function DataTable<TData>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No hay datos que coincidan con los filtros.',
  pageSize = 10,
  className,
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
    const headers = columns
      .map((c) => {
        if ('accessorKey' in c && typeof c.accessorKey === 'string') return c.accessorKey;
        if ('id' in c) return c.id;
        return 'col';
      })
      .join(',');

    const rows = data
      .map((row) =>
        columns
          .map((c) => {
            let value: unknown;
            if ('accessorKey' in c && typeof c.accessorKey === 'string') {
              value = (row as any)[c.accessorKey];
            } else if ('id' in c && typeof c.id === 'string') {
              value = (row as any)[c.id];
            }
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value).replace(/,/g, ';');
          })
          .join(','),
      )
      .join('\n');

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'datos.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;

  return (
    <div className={cn('space-y-4', isDense && 'space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className={cn('text-sm text-muted-foreground', isDense && 'text-xs')}>
          Mostrando {table.getRowModel().rows.length} de {data.length} registros
        </div>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-8 gap-2', isDense && 'h-7 text-xs')}
          onClick={exportCSV}
        >
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/[0.08]">
        <div className="overflow-x-auto">
          <table className={cn('w-full text-sm', isDense && 'text-[13px]')}>
            <thead className="sticky top-0 z-10 bg-surface-2/95 backdrop-blur-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-white/[0.06]">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={cn(
                        'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                        isDense && 'px-3 py-2 text-[11px]',
                        (header.column.columnDef.meta as any)?.headerClassName,
                      )}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            'flex items-center gap-1.5',
                            header.column.getCanSort() && 'cursor-pointer select-none hover:text-foreground',
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <ArrowUpDown
                              className={cn(
                                'h-3.5 w-3.5 transition-transform',
                                header.column.getIsSorted() === 'desc' && 'rotate-180 text-foreground',
                                header.column.getIsSorted() === 'asc' && 'text-foreground',
                              )}
                            />
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className={cn('p-8 text-center text-sm text-muted-foreground', isDense && 'p-5 text-xs')}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                    className={cn(
                      'border-b border-white/[0.04] transition-colors hover:bg-white/[0.035]',
                      onRowClick && 'cursor-pointer',
                      isDense ? '[&>td]:py-1.5' : '[&>td]:py-3',
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn(
                          'px-4 align-middle',
                          isDense && 'px-3',
                          (cell.column.columnDef.meta as any)?.cellClassName,
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className={cn('text-sm text-muted-foreground', isDense && 'text-xs')}>
            Página {currentPage} de {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="Primera página"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Badge variant="secondary" className="h-8 min-w-[2rem] items-center justify-center">
              {currentPage}
            </Badge>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Última página"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DataTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
