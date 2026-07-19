'use client'

import type { Key, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DataState } from './DataState'
import { EmptyState } from './EmptyState'
import { Skeleton } from './Skeleton'

export type DataTableColumn<TData> = {
  id: string
  header: ReactNode
  cell: (row: TData, index: number) => ReactNode
  align?: 'left' | 'center' | 'right'
  className?: string
  headerClassName?: string
  hideBelow?: 'sm' | 'md' | 'lg'
  width?: string
}

export type DataTableProps<TData> = {
  rows: TData[]
  columns: DataTableColumn<TData>[]
  rowKey: keyof TData | ((row: TData, index: number) => Key)
  caption?: string
  isLoading?: boolean
  error?: ReactNode
  empty?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
  skeletonRows?: number
  className?: string
  tableClassName?: string
  rowClassName?: string | ((row: TData, index: number) => string)
}

const alignClasses: Record<NonNullable<DataTableColumn<unknown>['align']>, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

const hiddenClasses: Record<NonNullable<DataTableColumn<unknown>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
}

export function DataTable<TData>({
  rows,
  columns,
  rowKey,
  caption,
  isLoading = false,
  error,
  empty,
  emptyTitle = 'Tidak ada data',
  emptyDescription = 'Ubah filter atau tambahkan data baru untuk mulai mengisi tabel ini.',
  skeletonRows = 5,
  className,
  tableClassName,
  rowClassName,
}: DataTableProps<TData>) {
  const isEmpty = !isLoading && rows.length === 0

  return (
    <DataState
      isLoading={isLoading}
      error={error}
      isEmpty={isEmpty}
      loading={<DataTableSkeleton columns={columns} rows={skeletonRows} />}
      empty={empty || <EmptyState title={emptyTitle} description={emptyDescription} />}
    >
      <div className={cn('overflow-hidden rounded-lg border border-neutral-200 bg-white', className)}>
        <div className="overflow-x-auto">
          <table className={cn('min-w-full divide-y divide-neutral-200', tableClassName)}>
            {caption && <caption className="sr-only">{caption}</caption>}
            <thead className="bg-brand-cream">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.id}
                    scope="col"
                    style={column.width ? { width: column.width } : undefined}
                    className={cn(
                      'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500',
                      alignClasses[column.align || 'left'],
                      column.hideBelow && hiddenClasses[column.hideBelow],
                      column.headerClassName
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((row, index) => (
                <tr
                  key={getRowKey(row, index, rowKey)}
                  className={cn(
                    'transition-colors hover:bg-brand-cream/50',
                    typeof rowClassName === 'function' ? rowClassName(row, index) : rowClassName
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cn(
                        'px-4 py-3 text-sm text-neutral-600',
                        alignClasses[column.align || 'left'],
                        column.hideBelow && hiddenClasses[column.hideBelow],
                        column.className
                      )}
                    >
                      {column.cell(row, index)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DataState>
  )
}

function DataTableSkeleton<TData>({
  columns,
  rows,
}: {
  columns: DataTableColumn<TData>[]
  rows: number
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white" aria-hidden="true">
      <div className="border-b border-neutral-200 bg-brand-cream px-4 py-3">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
          {columns.map((column) => (
            <Skeleton key={column.id} className="h-4" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-neutral-100">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid gap-4 px-4 py-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
            {columns.map((column) => (
              <Skeleton key={column.id} className="h-4" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function getRowKey<TData>(
  row: TData,
  index: number,
  rowKey: keyof TData | ((row: TData, index: number) => Key)
) {
  if (typeof rowKey === 'function') return rowKey(row, index)
  return String(row[rowKey])
}
