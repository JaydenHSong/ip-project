'use client'

import { useState, useCallback, useMemo, useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { X } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import { Badge } from '@/components/ui/Badge'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { TableFilters } from '@/components/ui/TableFilters'
import { Button } from '@/components/ui/Button'
import { ScrollTabs } from '@/components/ui/ScrollTabs'
import { Modal } from '@/components/ui/Modal'
import { NewReportModal } from '@/components/features/NewReportModal'
import { BrCaseQueueBar } from '@/components/features/BrCaseQueueBar'
import { useResizableColumns } from '@/hooks/useResizableColumns'
import { useColumnVisibility } from '@/hooks/useColumnVisibility'
import { useFilterableTable } from '@/hooks/useFilterableTable'
import { getBrFormTypeLabel } from '@/constants/br-form-types'
import { REPORT_QUEUE_COLUMNS, getVisibleColumns, getVisibleColumnWidths, columnsHash } from '@/constants/table-columns'
import { ColumnVisibilityToggle } from '@/components/ui/ColumnVisibilityToggle'
import { MARKETPLACES } from '@/constants/marketplaces'
import type { ReportStatus } from '@/types/reports'
import { OwnerToggle } from '@/components/ui/OwnerToggle'
import type { Role } from '@/types/users'
import type { TableFilters as TableFiltersType } from '@/types/table'
import { useToast } from '@/hooks/useToast'
import { useBulkActions } from '@/hooks/useBulkActions'
import { BulkActionBar } from './BulkActionBar'
import { ReportMobileCard } from './ReportMobileCard'
import { ReportPreviewPanel } from '@/components/features/ReportPreviewPanel'
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
  br_form_type: string
  violation_type: string
  user_violation_type: string | null
  violation_category: string | null
  status: string
  ai_confidence_score: number | null
  disagreement_flag: boolean
  created_at: string
  related_asins?: { asin: string; marketplace?: string; url?: string }[]
  listings: { asin: string; title: string; marketplace: string; seller_name: string | null } | null
  users?: { name: string } | null
  br_case_status?: string | null
  br_case_id?: string | null
  report_number: number
}

type ReportsContentProps = {
  reports: ReportRow[] | null
  totalPages: number
  totalCount: number
  page: number
  statusFilter: string
  brFormTypeFilter: string
  smartQueue: string
  userRole: Role
  ownerFilter: 'my' | 'all'
  searchQuery: string
  dateFrom: string
  dateTo: string
  sortField: string
  sortDir: 'asc' | 'desc'
  cloneThresholdDays: number
  maxMonitoringDays: number
}

// totalPages와 page는 하위호환 위해 유지하되 무한스크롤에서는 미사용

export const ReportsContent = ({
  reports,
  totalPages,
  totalCount,
  page,
  statusFilter,
  brFormTypeFilter,
  smartQueue,
  userRole,
  ownerFilter,
  searchQuery,
  dateFrom,
  dateTo,
  sortField,
  sortDir,
  cloneThresholdDays,
  maxMonitoringDays,
}: ReportsContentProps) => {
  const { t } = useI18n()
  const router = useRouter()
  const { addToast } = useToast()
  const [filters, setFilters] = useState<TableFiltersType>({ search: searchQuery, violationType: '', marketplace: '', dateFrom, dateTo })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [, startTransition] = useTransition()
  const isSearching = filters.search.length > 0

  // 무한 스크롤
  const infiniteFilterParams = useMemo(() => {
    const p: Record<string, string> = {}
    if (statusFilter) p.status = statusFilter
    if (brFormTypeFilter) p.br_form_type = brFormTypeFilter
    if (smartQueue) p.smart_queue = smartQueue
    if (ownerFilter) p.owner = ownerFilter
    if (searchQuery) p.search = searchQuery
    if (dateFrom) p.date_from = dateFrom
    if (dateTo) p.date_to = dateTo
    if (sortField) p.sort_field = sortField
    if (sortDir) p.sort_dir = sortDir
    return p
  }, [statusFilter, brFormTypeFilter, smartQueue, ownerFilter, searchQuery, dateFrom, dateTo, sortField, sortDir])

  const { data: infiniteData, isLoading: isLoadingMore, hasMore, sentinelRef } = useInfiniteScroll<ReportRow>({
    initialData: reports ?? [],
    totalCount,
    pageSize: 20,
    fetchUrl: '/api/reports/list',
    filterParams: infiniteFilterParams,
  })

  const buildFilterUrl = useCallback((f: TableFiltersType) => {
    return buildTableUrl('/ip/reports', {
      search: f.search.trim(),
      status: statusFilter,
      br_form_type: brFormTypeFilter,
      owner: ownerFilter,
      date_from: f.dateFrom,
      date_to: f.dateTo,
      sort_field: sortField,
      sort_dir: sortDir,
    })
  }, [statusFilter, brFormTypeFilter, ownerFilter, sortField, sortDir])

  const handleFiltersChange = useCallback((newFilters: TableFiltersType) => {
    setFilters(newFilters)

    const searchChanged = newFilters.search !== filters.search
    const dateChanged = newFilters.dateFrom !== filters.dateFrom || newFilters.dateTo !== filters.dateTo

    if (searchChanged || dateChanged) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        startTransition(() => {
          router.replace(buildFilterUrl(newFilters))
        })
      }, searchChanged ? 300 : 0)
    }
  }, [filters.search, filters.dateFrom, filters.dateTo, router, buildFilterUrl])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])
  const [showNewReport, setShowNewReport] = useState(false)
  const [prefillAsin, setPrefillAsin] = useState('')
  const [prefillMarketplace, setPrefillMarketplace] = useState('')
  const searchParamsHook = useSearchParams()

  // Auto-open modal/panel from URL params
  useEffect(() => {
    if (searchParamsHook.get('new') === '1') {
      setPrefillAsin(searchParamsHook.get('asin') ?? '')
      setPrefillMarketplace(searchParamsHook.get('marketplace') ?? '')
      setShowNewReport(true)
    }
    const previewId = searchParamsHook.get('preview')
    if (previewId) {
      setPreviewReportId(previewId)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])
  const bulkActions = useBulkActions(selectedIds, clearSelection)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [highlightedId, setHighlightedId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return sessionStorage.getItem('sentinel-highlight-report')
    return null
  })
  const [previewReportId, setPreviewReportId] = useState<string | null>(null)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({})

  const handleSelectReport = useCallback((id: string) => {
    setPreviewReportId(id)
    setHighlightedId(id)
    sessionStorage.setItem('sentinel-highlight-report', id)
  }, [])

  const getSearchableText = useCallback(
    (item: ReportRow) =>
      [item.report_number != null ? String(item.report_number).padStart(5, '0') : null, item.listings?.asin, item.listings?.title, item.listings?.seller_name, item.users?.name].filter(Boolean).join(' '),
    [],
  )
  const getViolationType = useCallback((item: ReportRow) => item.violation_category ?? item.user_violation_type ?? item.br_form_type ?? item.violation_type, [])
  const getMarketplace = useCallback((item: ReportRow) => item.listings?.marketplace ?? '', [])

  // Server already filters by search — only apply client-side violationType/marketplace
  // When search is active (debounced to URL), skip client-side search filtering to avoid double-filtering
  const serverHasSearch = searchQuery.length > 0
  const clientFilters = useMemo<TableFiltersType>(() => ({
    ...filters,
    search: serverHasSearch ? '' : filters.search,
  }), [filters, serverHasSearch])
  const filteredData = useFilterableTable(infiniteData, clientFilters, getSearchableText, getViolationType, getMarketplace)

  // Server-side sorting — push sort params to URL
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
  const displaySortedData = useMemo(
    () => sortedData.filter((report) => {
      const nextStatus = statusOverrides[report.id]
      if (!nextStatus) return true
      if (statusFilter === 'monitoring' && nextStatus !== 'monitoring') return false
      return true
    }),
    [sortedData, statusOverrides, statusFilter],
  )

  const { hiddenIds, toggleColumn, resetToDefault } = useColumnVisibility({
    columns: REPORT_QUEUE_COLUMNS,
    preferenceKey: 'table_columns_reports_queue',
  })
  const visibleColumns = useMemo(() => getVisibleColumns(REPORT_QUEUE_COLUMNS, hiddenIds), [hiddenIds])
  const { defaultWidths: defaultColWidths, minWidths: minColWidths } = useMemo(
    () => getVisibleColumnWidths(REPORT_QUEUE_COLUMNS, hiddenIds), [hiddenIds],
  )
  const { containerRef, tableStyle, getColStyle, getResizeHandleProps } = useResizableColumns({
    storageKey: `reports-queue-v4-${columnsHash(visibleColumns.map((c) => c.id))}`,
    defaultWidths: defaultColWidths,
    minWidths: minColWidths,
  })

  const handleNewReportClose = useCallback(() => {
    setShowNewReport(false)
    router.refresh()
  }, [router])

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleToggleSelectAll = useCallback(() => {
    const allIds = displaySortedData.map((r) => r.id)
    setSelectedIds((prev) => {
      if (allIds.length > 0 && allIds.every((id) => prev.has(id))) return new Set()
      return new Set(allIds)
    })
  }, [displaySortedData])

  const handlePreviewStatusChange = useCallback((reportId: string, nextStatus: string) => {
    setStatusOverrides((prev) => ({ ...prev, [reportId]: nextStatus }))
    setSelectedIds((prev) => {
      if (!prev.has(reportId)) return prev
      const next = new Set(prev)
      next.delete(reportId)
      return next
    })
  }, [])

  // 선택된 리포트들의 상태별 카운트
  const selectedStatuses = (() => {
    const counts: Record<string, number> = {}
    for (const id of selectedIds) {
      const r = sortedData.find((r) => r.id === id)
      if (r) counts[r.status] = (counts[r.status] ?? 0) + 1
    }
    return counts
  })()

  const isAdmin = userRole === 'owner' || userRole === 'admin'
  const canEdit = isAdmin || userRole === 'editor'

  // Bulk actions are handled by useBulkActions hook

  const STATUS_TABS = [
    { value: '', label: t('common.all') },
    { value: 'draft', label: t('reports.tabs.draft') },
    { value: 'monitoring', label: t('reports.tabs.monitoring') },
    { value: 'answered', label: t('reports.tabs.answered' as Parameters<typeof t>[0]) },
  ]

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="truncate text-2xl font-bold text-th-text md:text-3xl">{t('reports.queueTitle')}</h1>
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
          <Button size="sm" onClick={() => setShowNewReport(true)}>
            {t('reports.new.title')}
          </Button>
        </div>
        {brFormTypeFilter && (
          <div className="flex items-center gap-2">
            <Link
              href="/ip/reports"
              className="flex items-center gap-1 rounded-xl border border-th-accent/30 bg-th-accent/10 px-3 py-1.5 text-xs font-medium text-th-accent-text"
            >
              {getBrFormTypeLabel(brFormTypeFilter)}
              <X className="h-3 w-3" />
            </Link>
          </div>
        )}
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
              return qs ? `/ip/reports?${qs}` : '/ip/reports'
            })()}
            className={`snap-start whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
              !isSearching && statusFilter === tab.value
                ? 'bg-surface-card text-th-text shadow-sm'
                : 'text-th-text-muted hover:text-th-text-secondary'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </ScrollTabs>

      <BrCaseQueueBar />

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <TableFilters filters={filters} onFiltersChange={handleFiltersChange} showMarketplace={false} />
        </div>
        <div className="hidden sm:block">
          <ColumnVisibilityToggle columns={REPORT_QUEUE_COLUMNS} hiddenIds={hiddenIds} onToggle={toggleColumn} onReset={resetToDefault} />
        </div>
      </div>

      <BulkActionBar
        selectedCount={selectedIds.size}
        selectedStatuses={selectedStatuses}
        canEdit={canEdit}
        bulkLoading={bulkActions.loading}
        onApprove={bulkActions.approve}
        onSubmit={bulkActions.submit}
        onDelete={() => setShowBulkDeleteConfirm(true)}
        onDeselect={() => setSelectedIds(new Set())}
      />

      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {sortedData.length === 0 ? (
          <div className="rounded-lg border border-th-border bg-surface-card p-8 text-center text-th-text-muted">
            {filters.search || filters.violationType || filters.marketplace
              ? t('table.noResults' as Parameters<typeof t>[0])
              : t('reports.noReports')}
          </div>
        ) : (
          displaySortedData.map((report) => (
            <ReportMobileCard
              key={report.id}
              report={report}
              onClick={() => router.push(`/ip/reports/${report.id}`)}
            />
          ))
        )}
      </div>

      {/* Desktop: table — single table with sticky header */}
      <div className="hidden flex-col overflow-hidden rounded-lg border border-th-border md:flex">
        <div ref={containerRef} className="overflow-auto">
          <table className="table-fixed text-left text-sm" style={tableStyle}>
          <colgroup>
            {visibleColumns.map((_, i) => (
              <col key={i} style={getColStyle(i)} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-th-border bg-th-bg-tertiary">
              {visibleColumns.map((col, i) => {
                if (col.id === 'checkbox') return (
                  <th key={col.id} className="px-3 py-3">
                    <input type="checkbox" className="accent-th-accent" checked={displaySortedData.length > 0 && displaySortedData.every((r) => selectedIds.has(r.id))} onChange={handleToggleSelectAll} />
                  </th>
                )
                if (col.id === 'no') return (
                  <th key={col.id} className="relative px-4 py-3 text-sm font-semibold text-th-text-tertiary">No.<div {...getResizeHandleProps(i)} /></th>
                )
                const labelMap: Record<string, string> = {
                  status: t('common.status'),
                  br_case_id: 'BR Case ID',
                  channel: t('reports.table.channel' as Parameters<typeof t>[0]),
                  asin: t('reports.asin'),
                  violation: t('reports.violation'),
                  seller: t('reports.seller'),
                  requester: t('reports.createdBy'),
                  date: t('common.date'),
                  updated: t('reports.table.updated' as Parameters<typeof t>[0]),
                  resolved: t('reports.table.resolved' as Parameters<typeof t>[0]),
                }
                return col.sortField ? (
                  <SortableHeader key={col.id} label={labelMap[col.id] ?? col.id} field={col.sortField} currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(i)} /></SortableHeader>
                ) : (
                  <th key={col.id} className="relative px-4 py-3 text-sm font-semibold text-th-text-tertiary">{labelMap[col.id] ?? col.id}<div {...getResizeHandleProps(i)} /></th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {displaySortedData.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} className="px-4 py-10 text-center text-sm text-th-text-muted">
                  {filters.search || filters.violationType || filters.marketplace
                    ? t('table.noResults' as Parameters<typeof t>[0])
                    : t('reports.noReports')}
                </td>
              </tr>
            ) : (
              displaySortedData.map((report) => {
                const row = report as ReportRow & Record<string, unknown>
                const effectiveStatus = statusOverrides[report.id] ?? report.status
                const cellMap: Record<string, React.ReactNode> = {
                  checkbox: (
                    <td key="checkbox" className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="accent-th-accent" checked={selectedIds.has(report.id)} onChange={() => handleToggleSelect(report.id)} />
                    </td>
                  ),
                  no: <td key="no" className="px-4 py-3.5"><span className="text-xs text-th-text-muted">{String(report.report_number).padStart(5, '0')}</span></td>,
                  status: (() => {
                    const lastActivity = effectiveStatus === 'monitoring' ? Math.max(
                      row.br_last_amazon_reply_at ? new Date(row.br_last_amazon_reply_at as string).getTime() : 0,
                      row.br_last_our_reply_at ? new Date(row.br_last_our_reply_at as string).getTime() : 0,
                      row.br_submitted_at ? new Date(row.br_submitted_at as string).getTime() : 0,
                      report.created_at ? new Date(report.created_at).getTime() : 0,
                    ) : 0
                    const idle = lastActivity > 0 ? Date.now() - lastActivity : 0
                    const isClone = idle > cloneThresholdDays * 86400000 && idle <= maxMonitoringDays * 86400000 && row.br_case_status !== 'closed'
                    return (
                      <td key="status" className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={effectiveStatus as ReportStatus} type="report" />
                          {isClone && <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">Clone</span>}
                        </div>
                      </td>
                    )
                  })(),
                  br_case_id: (
                    <td key="br_case_id" className="px-4 py-3.5">
                      {report.br_case_id && report.br_case_id !== 'submitted' ? (
                        <a href={`https://brandregistry.amazon.com/cu/case-dashboard/view-case?caseID=${report.br_case_id}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-th-accent hover:underline" onClick={(e) => e.stopPropagation()}>BR#{report.br_case_id}</a>
                      ) : <span className="text-th-text-muted">—</span>}
                    </td>
                  ),
                  channel: <td key="channel" className="px-4 py-3.5 text-xs font-medium text-th-text">{getChannelCode(report.listings?.marketplace)}</td>,
                  asin: (
                    <td key="asin" className="px-4 py-3.5">
                      <span className="font-mono text-th-text">
                        {report.listings?.asin ? (
                          <a href={getAmazonUrl(report.listings.asin, report.listings.marketplace)} target="_blank" rel="noopener noreferrer" className="text-th-accent hover:underline" onClick={(e) => e.stopPropagation()}>{report.listings.asin}</a>
                        ) : '—'}
                        {(report.related_asins?.length ?? 0) > 0 && (
                          <span className="ml-1.5 inline-flex items-center rounded bg-th-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-th-accent-text">+{report.related_asins!.length}</span>
                        )}
                      </span>
                    </td>
                  ),
                  violation: (
                    <td key="violation" className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <ViolationBadge code={report.user_violation_type ?? report.br_form_type ?? report.violation_type} violationCategory={report.violation_category} showLabel={false} />
                        {report.disagreement_flag && <Badge variant="warning">!</Badge>}
                      </div>
                    </td>
                  ),
                  seller: <td key="seller" className="px-4 py-3.5 text-th-text-secondary truncate">{report.listings?.seller_name ?? '—'}</td>,
                  requester: <td key="requester" className="px-4 py-3.5 text-th-text-secondary truncate">{report.users?.name ?? '—'}</td>,
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
        {!hasMore && infiniteData.length > 0 && !isLoadingMore && (
          <span className="text-xs text-th-text-muted">All loaded</span>
        )}
      </div>

      {/* New Report Modal */}
      <NewReportModal
        open={showNewReport}
        onClose={handleNewReportClose}
        prefillAsin={prefillAsin}
        prefillMarketplace={prefillMarketplace}
      />

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        open={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        title={t('reports.bulk.deleteTitle' as Parameters<typeof t>[0])}
      >
        <p className="text-sm text-th-text-secondary">
          {t('reports.bulk.deleteConfirm' as Parameters<typeof t>[0]).replace('{count}', String(selectedIds.size))}
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowBulkDeleteConfirm(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            className="bg-st-danger-text hover:bg-st-danger-text/90"
            loading={bulkActions.loading === 'bulk-delete'}
            onClick={() => bulkActions.deleteBulk(() => setShowBulkDeleteConfirm(false))}
          >
            {t('common.delete')}
          </Button>
        </div>
      </Modal>

      {/* Report Preview Panel */}
      <ReportPreviewPanel
        reportId={previewReportId}
        onClose={() => { setPreviewReportId(null); router.refresh() }}
        userRole={userRole}
        onReportStatusChange={handlePreviewStatusChange}
      />
    </div>
  )
}
