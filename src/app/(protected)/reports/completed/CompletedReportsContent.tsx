'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/context'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { TableFilters } from '@/components/ui/TableFilters'
import { useSortableTable } from '@/hooks/useSortableTable'
import { useResizableColumns } from '@/hooks/useResizableColumns'
import { useFilterableTable } from '@/hooks/useFilterableTable'
import type { ReportStatus } from '@/types/reports'
import { OwnerToggle } from '@/components/ui/OwnerToggle'
import { ScrollTabs } from '@/components/ui/ScrollTabs'
import { Button } from '@/components/ui/Button'
import type { Role } from '@/types/users'
import type { TableFilters as TableFiltersType } from '@/types/table'
import { ReportPreviewPanel } from '@/components/features/ReportPreviewPanel'
import { MARKETPLACES } from '@/constants/marketplaces'

const DOMAIN_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.values(MARKETPLACES).map((m) => [m.domain, m.code])
)

const getChannelCode = (marketplace: string | undefined): string => {
  if (!marketplace) return '—'
  return DOMAIN_TO_CODE[marketplace] ?? marketplace.replace('amazon.', '').toUpperCase().slice(0, 2)
}

type ReportRow = {
  id: string
  report_number: number
  br_form_type: string
  violation_type: string
  violation_category: string | null
  status: string
  created_at: string
  pd_case_id?: string | null
  listings: { asin: string; title: string; marketplace: string; seller_name: string | null } | null
}

type CompletedReportsContentProps = {
  reports: ReportRow[] | null
  statusFilter: string
  userRole: Role
  ownerFilter: 'my' | 'all'
  page: number
  totalPages: number
  totalCount: number
  pageSize: number
  searchQuery: string
}

export const CompletedReportsContent = ({ reports, statusFilter, userRole, ownerFilter, page, totalPages, totalCount, pageSize, searchQuery }: CompletedReportsContentProps) => {
  const { t } = useI18n()
  const router = useRouter()
  const [filters, setFilters] = useState<TableFiltersType>({ search: searchQuery, violationType: '', marketplace: '' })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSearching = searchQuery.length > 0

  const handleFiltersChange = useCallback((newFilters: TableFiltersType) => {
    setFilters(newFilters)

    if (newFilters.search !== filters.search) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const term = newFilters.search.trim()
        if (term) {
          router.push(`/reports/completed?search=${encodeURIComponent(term)}`)
        } else {
          router.push('/reports/completed')
        }
      }, 300)
    }
  }, [filters.search, router])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState<string | null>(null)
  const [previewReportId, setPreviewReportId] = useState<string | null>(null)

  const canBulk = userRole === 'owner' || userRole === 'admin'

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      if (ids.every((id) => prev.has(id))) return new Set()
      return new Set(ids)
    })
  }, [])

  const handleBulkBrResubmit = useCallback(async () => {
    if (selectedIds.size === 0) return
    setBulkLoading('brResubmit')
    try {
      await fetch('/api/reports/bulk-br-resubmit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_ids: [...selectedIds] }),
      })
      setSelectedIds(new Set())
      router.refresh()
    } finally {
      setBulkLoading(null)
    }
  }, [selectedIds, router])

  const handleBulkArchive = useCallback(async () => {
    if (selectedIds.size === 0) return
    setBulkLoading('archive')
    try {
      await fetch('/api/reports/bulk-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_ids: [...selectedIds] }),
      })
      setSelectedIds(new Set())
      router.refresh()
    } finally {
      setBulkLoading(null)
    }
  }, [selectedIds, router])

  const getSearchableText = useCallback(
    (item: ReportRow) =>
      [item.report_number != null ? String(item.report_number).padStart(5, '0') : null, item.listings?.asin, item.listings?.title, item.listings?.seller_name, item.pd_case_id].filter(Boolean).join(' '),
    [],
  )
  const getViolationType = useCallback((item: ReportRow) => item.violation_type, [])
  const getMarketplace = useCallback((item: ReportRow) => item.listings?.marketplace ?? '', [])

  const filteredData = useFilterableTable(reports ?? [], filters, getSearchableText, getViolationType, getMarketplace)

  const getSortValue = useCallback((item: ReportRow, field: string): string | number | null => {
    const row = item as ReportRow & Record<string, unknown>
    switch (field) {
      case 'status': return item.status
      case 'channel': return item.listings?.marketplace ?? null
      case 'violation': return item.violation_type
      case 'asin': return item.listings?.asin ?? null
      case 'seller': return item.listings?.seller_name ?? null
      case 'requester': return row.users ? (row.users as { name: string })?.name : null
      case 'date': return new Date(item.created_at).getTime()
      case 'updated': return row.updated_at ? new Date(row.updated_at as string).getTime() : null
      case 'resolved': return row.resolved_at ? new Date(row.resolved_at as string).getTime() : null
      default: return null
    }
  }, [])

  const { sortedData, sort, toggleSort } = useSortableTable(filteredData, { field: 'date', direction: 'desc' }, getSortValue)

  const defaultColWidths = useMemo(
    () => canBulk ? [40, 56, 110, 65, 140, 150, 220, 110, 95, 95, 115] : [56, 110, 65, 140, 150, 220, 110, 95, 95, 115],
    [canBulk],
  )
  const { containerRef, tableStyle, getColStyle, getResizeHandleProps } = useResizableColumns({
    storageKey: canBulk ? 'reports-completed-v3' : 'reports-completed-v3-v',
    defaultWidths: defaultColWidths,
  })

  const STATUS_TABS = [
    { value: '', label: t('common.all') },
    { value: 'resolved', label: t('reports.tabs.resolved') },
    { value: 'unresolved', label: t('reports.tabs.unresolved') },
  ]

  return (
    <div className="flex flex-col gap-4 md:h-full md:gap-6">
      <div className="shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-th-text md:text-2xl">
            {t('reports.completedTitle')}
            {totalCount > 0 && (
              <span className="ml-2 text-base font-normal text-th-text-muted">({totalCount.toLocaleString()})</span>
            )}
          </h1>
          <OwnerToggle
            value={ownerFilter}
            onChange={(v) => {
              const url = new URL(window.location.href)
              url.searchParams.set('owner', v)
              router.push(url.pathname + url.search)
            }}
          />
        </div>
      </div>

      <ScrollTabs>
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/reports/completed${tab.value ? `?status=${tab.value}` : ''}`}
            className={`snap-start whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              !isSearching && statusFilter === tab.value
                ? 'bg-surface-card text-th-text shadow-sm'
                : 'text-th-text-muted hover:text-th-text-secondary'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </ScrollTabs>

      <TableFilters filters={filters} onFiltersChange={handleFiltersChange} />

      {/* Bulk Actions Bar */}
      {canBulk && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-th-border bg-surface-card px-4 py-2">
          <span className="text-sm font-medium text-th-text">{selectedIds.size}건 선택</span>
          <Button
            size="sm"
            variant="outline"
            loading={bulkLoading === 'brResubmit'}
            onClick={handleBulkBrResubmit}
          >
            BR 재신고
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-st-danger-text/30 text-st-danger-text hover:bg-st-danger-text/10"
            loading={bulkLoading === 'archive'}
            onClick={handleBulkArchive}
          >
            Archive
          </Button>
        </div>
      )}

      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {sortedData.length === 0 ? (
          <div className="rounded-xl border border-th-border bg-surface-card p-8 text-center text-th-text-muted">
            {filters.search || filters.violationType || filters.marketplace
              ? t('table.noResults' as Parameters<typeof t>[0])
              : t('reports.noCompleted')}
          </div>
        ) : (
          sortedData.map((report) => (
            <Link key={report.id} href={`/reports/${report.id}`}>
              <div className="rounded-xl border border-th-border bg-surface-card p-4 transition-colors active:bg-th-bg-hover">
                <div className="flex items-start justify-between">
                  <ViolationBadge code={report.br_form_type ?? report.violation_type} showLabel={false} />
                  <StatusBadge status={report.status as ReportStatus} type="report" />
                </div>
                <p className="mt-2 font-mono text-sm text-th-text">{report.listings?.asin ?? '—'}</p>
                <p className="mt-1 truncate text-sm text-th-text-secondary">{report.listings?.title ?? '—'}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-th-text-muted">
                  <span>{report.pd_case_id ? `PD: ${report.pd_case_id}` : '—'}</span>
                  <span>{new Date(report.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Desktop: table — single table with sticky header */}
      <div className="hidden min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-th-border md:flex">
        <div ref={containerRef} className="min-h-0 flex-1 overflow-auto">
          <table className="table-fixed text-left text-sm" style={tableStyle}>
          <colgroup>
            {defaultColWidths.map((_, i) => (
              <col key={i} style={getColStyle(i)} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-th-border bg-th-bg-tertiary">
              {canBulk && (
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={sortedData.length > 0 && sortedData.every((r) => selectedIds.has(r.id))}
                    onChange={() => toggleAll(sortedData.map((r) => r.id))}
                  />
                </th>
              )}
              {(() => { const o = canBulk ? 1 : 0; return (<>
              <th className="relative px-4 py-3 text-xs font-semibold text-th-text-tertiary">No.<div {...getResizeHandleProps(o)} /></th>
              <SortableHeader label={t('common.status')} field="status" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(o + 1)} /></SortableHeader>
              <SortableHeader label="Channel" field="channel" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(o + 2)} /></SortableHeader>
              <SortableHeader label={t('reports.violation')} field="violation" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(o + 3)} /></SortableHeader>
              <SortableHeader label={t('reports.asin')} field="asin" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(o + 4)} /></SortableHeader>
              <SortableHeader label={t('reports.seller')} field="seller" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(o + 5)} /></SortableHeader>
              <SortableHeader label={t('reports.createdBy')} field="requester" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(o + 6)} /></SortableHeader>
              <SortableHeader label={t('common.date')} field="date" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(o + 7)} /></SortableHeader>
              <SortableHeader label="Last Updated" field="updated" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(o + 8)} /></SortableHeader>
              <SortableHeader label="Resolved" field="resolved" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(o + 9)} /></SortableHeader>
              </>)})()}
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={canBulk ? 12 : 11} className="px-4 py-10 text-center text-sm text-th-text-muted">
                  {filters.search || filters.violationType || filters.marketplace
                    ? t('table.noResults' as Parameters<typeof t>[0])
                    : t('reports.noCompleted')}
                </td>
              </tr>
            ) : (
              sortedData.map((report, idx) => {
                const row = report as ReportRow & Record<string, unknown>
                return (
                <tr
                  key={report.id}
                  className="cursor-pointer bg-surface-card transition-colors hover:bg-th-bg-hover"
                  onClick={() => setPreviewReportId(report.id)}
                >
                  {canBulk && (
                    <td className="w-10 px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={selectedIds.has(report.id)}
                        onChange={() => toggleSelect(report.id)}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3.5 text-xs text-th-text-muted">{String(report.report_number).padStart(5, '0')}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={report.status as ReportStatus} type="report" />
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-th-text">{getChannelCode(report.listings?.marketplace)}</td>
                  <td className="px-4 py-3.5">
                    <ViolationBadge code={report.br_form_type ?? report.violation_type} showLabel={false} />
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-th-text">
                      {report.listings?.asin ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-th-text-secondary">{report.listings?.seller_name ?? '—'}</td>
                  <td className="px-4 py-3.5 text-th-text-secondary">{row.users ? (row.users as { name: string }).name : '—'}</td>
                  <td className="px-4 py-3.5 text-th-text-muted">{new Date(report.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3.5 text-th-text-muted">{row.updated_at ? new Date(row.updated_at as string).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3.5 text-th-text-muted">{row.resolved_at ? new Date(row.resolved_at as string).toLocaleDateString() : '—'}</td>
                </tr>
                )
              })
            )}
          </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <PaginationLink
            page={page - 1}
            disabled={page <= 1}
            statusFilter={statusFilter}
            ownerFilter={ownerFilter}
            label="<"
          />
          {getPaginationRange(page, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`dot-${i}`} className="px-1 text-sm text-th-text-muted">...</span>
            ) : (
              <PaginationLink
                key={p}
                page={p as number}
                statusFilter={statusFilter}
                ownerFilter={ownerFilter}
                label={String(p)}
                active={p === page}
              />
            ),
          )}
          <PaginationLink
            page={page + 1}
            disabled={page >= totalPages}
            statusFilter={statusFilter}
            ownerFilter={ownerFilter}
            label=">"
          />
        </div>
      )}

      <ReportPreviewPanel reportId={previewReportId} onClose={() => setPreviewReportId(null)} userRole={userRole} />
    </div>
  )
}

const PaginationLink = ({ page, disabled, statusFilter, ownerFilter, label, active }: {
  page: number
  disabled?: boolean
  statusFilter: string
  ownerFilter: string
  label: string
  active?: boolean
}) => {
  const params = new URLSearchParams()
  if (page > 1) params.set('page', String(page))
  if (statusFilter) params.set('status', statusFilter)
  if (ownerFilter) params.set('owner', ownerFilter)
  const qs = params.toString()
  const href = `/reports/completed${qs ? `?${qs}` : ''}`

  if (disabled) {
    return (
      <span className="rounded-md px-3 py-1.5 text-sm text-th-text-muted/40">{label}</span>
    )
  }

  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
        active
          ? 'bg-th-accent text-white'
          : 'text-th-text-secondary hover:bg-th-bg-hover'
      }`}
    >
      {label}
    </Link>
  )
}

const getPaginationRange = (current: number, total: number): (number | '...')[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = [1]

  if (current > 3) pages.push('...')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('...')

  pages.push(total)
  return pages
}
