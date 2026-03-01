'use client'

import { cn } from '@/lib/utils/cn'

type Column<T> = {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  className?: string
}

type DataTableProps<T> = {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  emptyMessage?: string
  className?: string
  selectedId?: string
}

export const DataTable = <T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  emptyMessage = '데이터가 없습니다.',
  className,
  selectedId,
}: DataTableProps<T>) => {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-th-border bg-th-bg-tertiary">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn('px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary', col.className)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-th-border">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-th-text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'bg-surface-card transition-colors hover:bg-th-bg-hover',
                  onRowClick && 'cursor-pointer',
                  selectedId && String(row.id) === selectedId && 'bg-th-bg-active',
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 text-th-text', col.className)}>
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
