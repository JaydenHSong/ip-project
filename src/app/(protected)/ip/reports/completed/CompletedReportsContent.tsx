'use client'

import { useState, useCallback, useMemo, useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useI18n } from '@/lib/i18n/context'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { TableFilters } from '@/components/ui/TableFilters'
import { useResizableColumns } from '@/hooks/useResizableColumns'
import { useColumnVisibility } from '@/hooks/useColumnVisibility'
import { useFilterableTable } from '@/hooks/useFilterableTable'
import { COMPLETED_COLUMNS, getVisibleColumns, getVisibleColumnWidths, columnsHash } from '@/constants/table-columns'
import { ColumnVisibilityToggle } from '@/components/ui/ColumnVisibilityToggle'
import type { ReportStatus } from '@/types/reports'
import { OwnerToggle } from '@/components/ui/OwnerToggle'
import { ScrollTabs } from '@/components/ui/ScrollTabs'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { Role } from '@/types/users'
import type { TableFilters as TableFiltersType } from '@/types/table'
import { ReportPreviewPanel } from '@/components/features/ReportPreviewPanel'
import { MARKETPLACES } from '@/constants/marketplaces'
import { useToast } from '@/hooks/useToast'
import { getAmazonUrl } from '@/lib/utils/amazon-url'
import { formatDate } from '@/lib/utils/date'
import { buildTableUrl } from '@/lib/utils/table-url'

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
  user_violation_type: string | null
  violation_category: string | null
  status: string
  created_at: string
  pd_case_id?: string | null
  br_case_id?: string | null
  archived_at?: string | null
  archive_reason?: string | null
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
  sortField: string
  sortDir: 'asc' | 'desc'
}

export const CompletedReportsContent = ({ reports, statusFilter, userRole, ownerFilter, page, totalPages, totalCount, pageSize, searchQuery, sortField, sortDir }: CompletedReportsContentProps) => {
  const { t } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const { addToast } = useToast()
  const [filters, setFilters] = useState<TableFiltersType>({ search: searchQuery, violationType: '', marketplace: '', dateFrom: '', dateTo: '' })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [, startTransition] = useTransition()
  const isSearching = filters.search.length > 0
  const isArchived = statusFilter === 'archived'
  const [unarchiving, setUnarchiving] = useState<string | null>(null)

  // Infinite scroll
  const infiniteFilterParams = useMemo(() => {
    const p: Record<string, string> = {}
    if (statusFilter) p.status = statusFilter
    if (ownerFilter) p.owner = ownerFilter
    if (searchQuery) p.search = searchQuery
    if (sortField) p.sort_field = sortField
    if (sortDir) p.sort_dir = sortDir
    return p
  }, [statusFilter, ownerFilter, searchQuery, sortField, sortDir])

  const { data: infiniteData, isLoading: isLoadingMore, hasMore, sentinelRef } = useInfiniteScroll<ReportRow>({
    initialData: reports ?? [],
    totalCount,
    pageSize,
    fetchUrl: '/api/reports/completed/list',
    filterParams: infiniteFilterParams,
  })

  const buildFilterUrl = useCallback((search: string) => {
    return buildTableUrl('/ip/reports/completed', {
      search: search.trim(),
      status: statusFilter,
      owner: ownerFilter,
      sort_field: sortField,
      sort_dir: sortDir,
    })
  }, [statusFilter, ownerFilter, sortField, sortDir])

  const handleFiltersChange = useCallback((newFilters: TableFiltersType) => {
    setFilters(newFilters)

    if (newFilters.search !== filters.search) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        startTransition(() => {
          router.replace(buildFilterUrl(newFilters.search))
        })
      }, 300)
    }
  }, [filters.search, router, buildFilterUrl])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState<string | null>(null)
  const [previewReportId, setPreviewReportId] = useState<string | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const handleSelectReport = useCallback((id: string) => {
    setPreviewReportId(id)
    setHighlightedId(id)
  }, [])

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

  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    setBulkLoading('delete')
    try {
      await fetch('/api/reports/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_ids: [...selectedIds] }),
      })
      setSelectedIds(new Set())
      setShowBulkDeleteConfirm(false)
      router.refresh()
    } finally {
      setBulkLoading(null)
    }
  }, [selectedIds, router])

  const handleUnarchive = useCallback(async (reportId: string) => {
    setUnarchiving(reportId)
    try {
      const res = await fetch(`/api/reports/${reportId}/unarchive`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Unarchive failed')
      }
      router.refresh()
    } catch (e) {
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setUnarchiving(null)
    }
  }, [router, addToast])

  const getSearchableText = useCallback(
    (item: ReportRow) =>
      [item.report_number != null ? String(item.report_number).padStart(5, '0') : null, item.listings?.asin, item.listings?.title, item.listings?.seller_name, item.pd_case_id, (item as ReportRow & Record<string, unknown>).users ? ((item as ReportRow & Record<string, unknown>).users as { name: string })?.name : null].filter(Boolean).join(' '),
    [],
  )
  const getViolationType = useCallback((item: ReportRow) => item.violation_category ?? item.user_violation_type ?? item.br_form_type ?? item.violation_type, [])
  const getMarketplace = useCallback((item: ReportRow) => item.listings?.marketplace ?? '', [])

  // Server already filters by search — only apply client-side violationType/marketplace
  const clientFilters = useMemo<TableFiltersType>(() => ({
    ...filters,
    search: searchQuery ? '' : filters.search,
  }), [filters, searchQuery])
  const filteredData = useFilterableTable(infiniteData, clientFilters, getSearchableText, getViolationType, getMarketplace)

  // Server-side sorting
  const sort = useMemo(() => ({ field: sortField, direction: sortDir }), [sortField, sortDir])
  const toggleSort = useCallback((field: string) => {
    const url = new URL(window.location.href)
    if (sortField === field) {
      url.searchParams.set('sort_dir', sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      url.searchParams.set('sort_field', field)
      url.searchParams.set('sort_dir', 'desc')
    }
    url.searchParams.delete('page')
    router.push(url.pathname + url.search)
  }, [sortField, sortDir, router])
  const sortedData = filteredData

  const canAct = userRole === 'owner' || userRole === 'admin' || userRole === 'editor'

  // Column visibility (non-archived only)
  const completedCols = useMemo(() => canBulk ? COMPLETED_COLUMNS : COMPLETED_COLUMNS.filter((c) => c.id !== 'checkbox'), [canBulk])
  const { hiddenIds, toggleColumn, resetToDefault } = useColumnVisibility({
    columns: completedCols,
    preferenceKey: 'table_columns_reports_completed',
  })
  const visibleColumns = useMemo(() => isArchived ? [] : getVisibleColumns(completedCols, hiddenIds), [completedCols, hiddenIds, isArchived])

  const defaultColWidths = useMemo(() => {
    if (isArchived) return canAct ? [160, 160, 350, 180, 140, 90] : [160, 160, 350, 180, 140]
    return getVisibleColumnWidths(completedCols, hiddenIds).defaultWidths
  }, [canAct, isArchived, completedCols, hiddenIds])
  const minColWidths = useMemo(() => {
    if (isArchived) return canAct ? [100, 100, 200, 120, 100, 70] : [100, 100, 200, 120, 100]
    return getVisibleColumnWidths(completedCols, hiddenIds).minWidths
  }, [canAct, isArchived, completedCols, hiddenIds])
  const { containerRef, tableStyle, getColStyle, getResizeHandleProps } = useResizableColumns({
    storageKey: isArchived
      ? 'reports-archived-v2'
      : `reports-completed-v4-${columnsHash(visibleColumns.map((c) => c.id))}`,
    defaultWidths: defaultColWidths,
    minWidths: minColWidths,
  })

  const STATUS_TABS = [
    { value: '', label: t('common.all') },
    { value: 'resolved', label: t('reports.tabs.resolved') },
    { value: 'unresolved', label: t('reports.tabs.unresolved') },
    { value: 'archived', label: t('reports.archivedTitle' as Parameters<typeof t>[0]) },
  ]

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-th-text md:text-3xl">
            {t('reports.completedTitle')}
            {totalCount > 0 && (
              <span className="ml-2 text-base font-normal text-th-text-muted">({totalCount.toLocaleString()})</span>
            )}
          </h1>
          {userRole !== 'viewer' && (
            <OwnerToggle
              value={ownerFilter}
              onChange={(v) => {
                const url = new URL(window.location.href)
                url.searchParams.set('owner', v)
                router.push(url.pathname + url.search)
              }}
            />
          )}
        </div>
      </div>

      <ScrollTabs>
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={(() => {
              const p = new URLSearchParams()
              if (tab.value) p.set('status', tab.value)
              if (ownerFilter !== 'all') p.set('owner', ownerFilter)
              const qs = p.toString()
              return qs ? `/ip/reports/completed?${qs}` : '/ip/reports/completed'
            })()}
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

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <TableFilters filters={filters} onFiltersChange={handleFiltersChange} showMarketplace={false} />
        </div>
        {!isArchived && (
          <div className="hidden sm:block">
            <ColumnVisibilityToggle columns={completedCols} hiddenIds={hiddenIds} onToggle={toggleColumn} onReset={resetToDefault} />
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {!isArchived && canBulk && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-th-border bg-surface-card px-4 py-2">
          <span className="text-sm font-medium text-th-text">{t('reports.bulk.selected' as Parameters<typeof t>[0]).replace('{count}', String(selectedIds.size))}</span>
          {statusFilter !== 'resolved' && (
            <Button
              size="sm"
              variant="outline"
              loading={bulkLoading === 'brResubmit'}
              onClick={handleBulkBrResubmit}
            >
              {t('reports.bulk.brResubmit' as Parameters<typeof t>[0])} ({selectedIds.size})
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="border-st-danger-text/30 text-st-danger-text hover:bg-st-danger-text/10"
            loading={bulkLoading === 'archive'}
            onClick={handleBulkArchive}
          >
            {t('reports.bulk.archive' as Parameters<typeof t>[0])} ({selectedIds.size})
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-st-danger-text/30 text-st-danger-text hover:bg-st-danger-text/10"
            onClick={() => setShowBulkDeleteConfirm(true)}
          >
            Delete ({selectedIds.size})
          </Button>
        </div>
      )}

      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {sortedData.length === 0 ? (
          <div className="rounded-xl border border-th-border bg-surface-card p-8 text-center text-th-text-muted">
            {filters.search || filters.violationType || filters.marketplace
              ? t('table.noResults' as Parameters<typeof t>[0])
              : isArchived
                ? t('reports.noArchived' as Parameters<typeof t>[0])
                : t('reports.noCompleted')}
          </div>
        ) : isArchived ? (
          sortedData.map((report) => (
            <div
              key={report.id}
              className="rounded-xl border border-th-border bg-surface-card p-4 transition-colors active:bg-th-bg-hover"
              onClick={() => handleSelectReport(report.id)}
            >
              <div className="flex items-start justify-between">
                <ViolationBadge code={report.user_violation_type ?? report.br_form_type ?? report.violation_type} violationCategory={report.violation_category} showLabel={false} />
                <StatusBadge status={report.status as ReportStatus} type="report" />
              </div>
              <p className="mt-2 font-mono text-sm">
                {report.listings?.asin ? (
                  <a href={getAmazonUrl(report.listings.asin, report.listings.marketplace)} target="_blank" rel="noopener noreferrer" className="text-th-accent hover:underline">{report.listings.asin}</a>
                ) : '—'}
              </p>
              <p className="mt-1 truncate text-sm text-th-text-secondary">{report.listings?.title ?? '—'}</p>
              {report.archive_reason && (
                <p className="mt-1 truncate text-xs text-th-text-muted">{report.archive_reason}</p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-th-text-muted">
                  {formatDate(report.archived_at)}
                </span>
                {canAct && (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={unarchiving === report.id}
                    onClick={(e) => { e.stopPropagation(); handleUnarchive(report.id) }}
                  >
                    {t('reports.detail.unarchive' as Parameters<typeof t>[0])}
                  </Button>
                )}
              </div>
            </div>
          ))
        ) : (
          sortedData.map((report) => (
            <Link key={report.id} href={`/ip/reports/${report.id}`}>
              <div className="rounded-xl border border-th-border bg-surface-card p-4 transition-colors active:bg-th-bg-hover">
                <div className="flex items-start justify-between">
                  <ViolationBadge code={report.user_violation_type ?? report.br_form_type ?? report.violation_type} violationCategory={report.violation_category} showLabel={false} />
                  <StatusBadge status={report.status as ReportStatus} type="report" />
                </div>
                <p className="mt-2 font-mono text-sm">
                  {report.listings?.asin ? (
                    <a href={getAmazonUrl(report.listings.asin, report.listings.marketplace)} target="_blank" rel="noopener noreferrer" className="text-th-accent hover:underline" onClick={(e) => e.stopPropagation()}>{report.listings.asin}</a>
                  ) : '—'}
                </p>
                <p className="mt-1 truncate text-sm text-th-text-secondary">{report.listings?.title ?? '—'}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-th-text-muted">
                  <span>{report.pd_case_id ? `PD: ${report.pd_case_id}` : '—'}</span>
                  <span>{formatDate(report.created_at)}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Desktop: table — single table with sticky header */}
      <div className="hidden flex-col overflow-hidden rounded-lg border border-th-border md:flex">
        <div ref={containerRef} className="overflow-auto">
          <table className="table-fixed text-left text-sm" style={tableStyle}>
          <colgroup>
            {defaultColWidths.map((_, i) => (
              <col key={i} style={getColStyle(i)} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-th-border bg-th-bg-tertiary">
              {isArchived ? (<>
                <SortableHeader label={t('reports.violation')} field="violation" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(0)} /></SortableHeader>
                <SortableHeader label={t('reports.asin')} field="asin" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(1)} /></SortableHeader>
                <SortableHeader label={t('reports.title')} field="title" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(2)} /></SortableHeader>
                <SortableHeader label={t('reports.detail.archiveReason' as Parameters<typeof t>[0])} field="reason" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(3)} /></SortableHeader>
                <SortableHeader label={t('reports.detail.archivedAt' as Parameters<typeof t>[0])} field="archived_at" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(4)} /></SortableHeader>
                {canAct && (
                  <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">{t('common.action')}</th>
                )}
              </>) : (<>
                {visibleColumns.map((col, i) => {
                  if (col.id === 'checkbox') return (
                    <th key={col.id} className="w-10 px-3 py-3">
                      <input type="checkbox" className="rounded" checked={sortedData.length > 0 && sortedData.every((r) => selectedIds.has(r.id))} onChange={() => toggleAll(sortedData.map((r) => r.id))} />
                    </th>
                  )
                  if (col.id === 'no') return (
                    <th key={col.id} className="relative px-4 py-3 text-sm font-semibold text-th-text-tertiary">No.<div {...getResizeHandleProps(i)} /></th>
                  )
                  const labelMap: Record<string, string> = {
                    status: t('common.status'), br_case_id: 'BR Case ID',
                    channel: t('reports.table.channel' as Parameters<typeof t>[0]),
                    asin: t('reports.asin'), violation: t('reports.violation'),
                    seller: t('reports.seller'), requester: t('reports.createdBy'),
                    date: t('common.date'), updated: t('reports.table.lastUpdated' as Parameters<typeof t>[0]),
                    resolved: t('reports.table.resolved' as Parameters<typeof t>[0]),
                  }
                  return col.sortField ? (
                    <SortableHeader key={col.id} label={labelMap[col.id] ?? col.id} field={col.sortField} currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(i)} /></SortableHeader>
                  ) : (
                    <th key={col.id} className="relative px-4 py-3 text-sm font-semibold text-th-text-tertiary">{labelMap[col.id] ?? col.id}<div {...getResizeHandleProps(i)} /></th>
                  )
                })}
              </>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={isArchived ? (canAct ? 6 : 5) : visibleColumns.length} className="px-4 py-10 text-center text-sm text-th-text-muted">
                  {filters.search || filters.violationType || filters.marketplace
                    ? t('table.noResults' as Parameters<typeof t>[0])
                    : isArchived
                      ? t('reports.noArchived' as Parameters<typeof t>[0])
                      : t('reports.noCompleted')}
                </td>
              </tr>
            ) : isArchived ? (
              sortedData.map((report) => (
                <tr key={report.id} className={`cursor-pointer transition-colors hover:bg-th-bg-hover ${highlightedId === report.id ? 'bg-th-accent/10' : 'bg-surface-card'}`} onClick={() => handleSelectReport(report.id)}>
                  <td className="px-4 py-3.5">
                    <ViolationBadge code={report.user_violation_type ?? report.br_form_type ?? report.violation_type} violationCategory={report.violation_category} showLabel={false} />
                  </td>
                  <td className="px-4 py-3.5">
                    {report.listings?.asin ? (
                      <a href={getAmazonUrl(report.listings.asin, report.listings.marketplace)} target="_blank" rel="noopener noreferrer" className="font-mono text-th-accent hover:underline" onClick={(e) => e.stopPropagation()}>{report.listings.asin}</a>
                    ) : <span className="font-mono text-th-text">—</span>}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-th-text-secondary">{report.listings?.title ?? '—'}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-th-text-muted">{report.archive_reason ?? '—'}</td>
                  <td className="px-4 py-3.5 text-th-text-muted">
                    {formatDate(report.archived_at)}
                  </td>
                  {canAct && (
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        loading={unarchiving === report.id}
                        onClick={() => handleUnarchive(report.id)}
                      >
                        {t('reports.detail.unarchive' as Parameters<typeof t>[0])}
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              sortedData.map((report) => {
                const row = report as ReportRow & Record<string, unknown>
                const cellMap: Record<string, React.ReactNode> = {
                  checkbox: <td key="checkbox" className="w-10 px-3 py-3.5" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded" checked={selectedIds.has(report.id)} onChange={() => toggleSelect(report.id)} /></td>,
                  no: <td key="no" className="px-4 py-3.5 text-xs text-th-text-muted">{String(report.report_number).padStart(5, '0')}</td>,
                  status: <td key="status" className="px-4 py-3.5"><StatusBadge status={report.status as ReportStatus} type="report" /></td>,
                  br_case_id: (
                    <td key="br_case_id" className="px-4 py-3.5">
                      {report.br_case_id && report.br_case_id !== 'submitted' ? (
                        <a href={`https://brandregistry.amazon.com/cu/case-dashboard/view-case?caseID=${report.br_case_id}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-th-accent hover:underline" onClick={(e) => e.stopPropagation()}>BR#{report.br_case_id}</a>
                      ) : <span className="text-th-text-muted">—</span>}
                    </td>
                  ),
                  channel: <td key="channel" className="px-4 py-3.5 text-xs font-medium text-th-text">{getChannelCode(report.listings?.marketplace)}</td>,
                  asin: <td key="asin" className="px-4 py-3.5">{report.listings?.asin ? <a href={getAmazonUrl(report.listings.asin, report.listings.marketplace)} target="_blank" rel="noopener noreferrer" className="font-mono text-th-accent hover:underline" onClick={(e) => e.stopPropagation()}>{report.listings.asin}</a> : <span className="font-mono text-th-text">—</span>}</td>,
                  violation: <td key="violation" className="px-4 py-3.5"><ViolationBadge code={report.user_violation_type ?? report.br_form_type ?? report.violation_type} violationCategory={report.violation_category} showLabel={false} /></td>,
                  seller: <td key="seller" className="px-4 py-3.5 text-th-text-secondary">{report.listings?.seller_name ?? '—'}</td>,
                  requester: <td key="requester" className="px-4 py-3.5 text-th-text-secondary">{row.users ? (row.users as { name: string }).name : '—'}</td>,
                  date: <td key="date" className="px-4 py-3.5 text-th-text-muted">{formatDate(report.created_at)}</td>,
                  updated: <td key="updated" className="px-4 py-3.5 text-th-text-muted">{formatDate(row.updated_at as string)}</td>,
                  resolved: <td key="resolved" className="px-4 py-3.5 text-th-text-muted">{formatDate(row.resolved_at as string)}</td>,
                }
                return (
                  <tr key={report.id} className={`cursor-pointer transition-colors hover:bg-th-bg-hover ${highlightedId === report.id ? 'bg-th-accent/10' : 'bg-surface-card'}`} onClick={() => handleSelectReport(report.id)}>
                    {visibleColumns.map((col) => cellMap[col.id])}
                  </tr>
                )
              })
            )}
          </tbody>
          </table>
        </div>
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="flex justify-center py-4">
        {isLoadingMore && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-th-accent border-t-transparent" />
        )}
        {!hasMore && infiniteData.length > 0 && (
          <span className="text-xs text-th-text-muted">{infiniteData.length} / {totalCount}</span>
        )}
      </div>

      <ReportPreviewPanel reportId={previewReportId} onClose={() => { setPreviewReportId(null); router.refresh() }} userRole={userRole} />

      {/* Bulk Delete Confirmation */}
      <Modal open={showBulkDeleteConfirm} onClose={() => setShowBulkDeleteConfirm(false)} title="Delete Reports">
        <p className="text-sm text-th-text-secondary">
          {selectedIds.size}건의 리포트를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowBulkDeleteConfirm(false)}>Cancel</Button>
          <Button
            size="sm"
            className="bg-st-danger-text hover:bg-st-danger-text/90"
            loading={bulkLoading === 'delete'}
            onClick={handleBulkDelete}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
