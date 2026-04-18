'use client'

import type { CampaignTablePagination } from './types'

const PAGE_SIZES = [20, 50, 100] as const

type TablePaginationFooterProps = {
  pagination: CampaignTablePagination
  filteredRowCount: number
  loadedRowCount: number
  isLoading?: boolean
  onPaginationChange: (updater: (prev: CampaignTablePagination) => CampaignTablePagination) => void
}

const range = (from: number, to: number) =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i)

const pageButtonModel = (current: number, totalPages: number): (number | 'ellipsis')[] => {
  if (totalPages <= 1) return [1]
  if (totalPages <= 9) return range(1, totalPages)
  if (current <= 4) return [...range(1, 5), 'ellipsis', totalPages]
  if (current >= totalPages - 3) return [1, 'ellipsis', ...range(totalPages - 4, totalPages)]
  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', totalPages]
}

const TablePaginationFooter = ({
  pagination,
  filteredRowCount,
  loadedRowCount,
  isLoading,
  onPaginationChange,
}: TablePaginationFooterProps) => {
  const { page, limit, total } = pagination
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1)
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = total === 0 ? 0 : Math.min(page * limit, total)

  const filterHint =
    filteredRowCount < loadedRowCount ? ` · ${filteredRowCount} visible with tab/filters` : ''

  return (
    <div className="flex flex-col gap-2 border-t border-th-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-th-text-muted">
        <span>
          Showing {isLoading ? '—' : `${start}–${end}`} of {total} campaigns{filterHint}
        </span>
        <label className="flex items-center gap-1.5">
          <span className="uppercase tracking-wide">Per page</span>
          <select
            value={limit}
            disabled={isLoading}
            onChange={(e) => {
              const next = Number(e.target.value)
              const limit =
                next === 20 || next === 50 || next === 100 ? next : 20
              onPaginationChange((prev) => ({
                ...prev,
                limit,
                page: 1,
              }))
            }}
            className="rounded border border-th-border bg-surface-card px-2 py-1 text-[11px] text-th-text-secondary focus:border-orange-500 focus:outline-none disabled:opacity-50"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1">
        <button
          type="button"
          disabled={isLoading || page <= 1}
          onClick={() => onPaginationChange((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
          className="rounded border border-th-border px-2 py-1 text-[11px] text-th-text-secondary hover:bg-th-bg-hover disabled:opacity-40"
        >
          Prev
        </button>
        {pageButtonModel(page, totalPages).map((item, idx) =>
          item === 'ellipsis' ? (
            <span key={`e-${idx}`} className="px-1 text-[11px] text-th-text-muted">
              …
            </span>
          ) : (
            <button
              type="button"
              key={item}
              disabled={isLoading}
              onClick={() => onPaginationChange((prev) => ({ ...prev, page: item }))}
              className={`min-w-[1.75rem] rounded border px-2 py-1 text-[11px] ${
                item === page
                  ? 'border-orange-500 bg-orange-500/10 font-medium text-orange-700 dark:text-orange-300'
                  : 'border-th-border text-th-text-secondary hover:bg-th-bg-hover'
              }`}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={isLoading || page >= totalPages}
          onClick={() => onPaginationChange((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
          className="rounded border border-th-border px-2 py-1 text-[11px] text-th-text-secondary hover:bg-th-bg-hover disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export { TablePaginationFooter }
