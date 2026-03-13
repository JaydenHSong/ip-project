'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { SlaBadge } from '@/components/ui/SlaBadge'
import { useSortableTable } from '@/hooks/useSortableTable'
import { useResizableColumns } from '@/hooks/useResizableColumns'
import { useFilterableTable } from '@/hooks/useFilterableTable'
import { getBrFormTypeLabel } from '@/constants/br-form-types'
import { MARKETPLACES } from '@/constants/marketplaces'
import type { ReportStatus } from '@/types/reports'
import { OwnerToggle } from '@/components/ui/OwnerToggle'
import type { Role } from '@/types/users'
import type { TableFilters as TableFiltersType } from '@/types/table'
import { useToast } from '@/hooks/useToast'
import { ReportPreviewPanel } from '@/components/features/ReportPreviewPanel'
import { getAmazonUrl } from '@/lib/utils/amazon-url'
import { formatDate } from '@/lib/utils/date'

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
  br_sla_deadline_at?: string | null
  report_number: number
}

type ReportsContentProps = {
  reports: ReportRow[] | null
  totalPages: number
  totalCount: number
  page: number
  statusFilter: string
  brFormTypeFilter: string
  userRole: Role
  ownerFilter: 'my' | 'all'
  searchQuery: string
  dateFrom: string
  dateTo: string
}

export const ReportsContent = ({
  reports,
  totalPages,
  totalCount,
  page,
  statusFilter,
  brFormTypeFilter,
  userRole,
  ownerFilter,
  searchQuery,
  dateFrom,
  dateTo,
}: ReportsContentProps) => {
  const { t } = useI18n()
  const router = useRouter()
  const { addToast } = useToast()
  const [filters, setFilters] = useState<TableFiltersType>({ search: searchQuery, violationType: '', marketplace: '', dateFrom, dateTo })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSearching = searchQuery.length > 0

  const buildFilterUrl = useCallback((f: TableFiltersType) => {
    const p = new URLSearchParams()
    if (f.search.trim()) p.set('search', f.search.trim())
    if (f.dateFrom) p.set('date_from', f.dateFrom)
    if (f.dateTo) p.set('date_to', f.dateTo)
    const qs = p.toString()
    return qs ? `/reports?${qs}` : '/reports'
  }, [])

  const handleFiltersChange = useCallback((newFilters: TableFiltersType) => {
    setFilters(newFilters)

    const searchChanged = newFilters.search !== filters.search
    const dateChanged = newFilters.dateFrom !== filters.dateFrom || newFilters.dateTo !== filters.dateTo

    if (searchChanged || dateChanged) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        router.push(buildFilterUrl(newFilters))
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

  // Auto-open modal from URL params (e.g. /reports?new=1&asin=B0XXX)
  useEffect(() => {
    if (searchParamsHook.get('new') === '1') {
      setPrefillAsin(searchParamsHook.get('asin') ?? '')
      setPrefillMarketplace(searchParamsHook.get('marketplace') ?? '')
      setShowNewReport(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState<string | null>(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [previewReportId, setPreviewReportId] = useState<string | null>(null)

  const getSearchableText = useCallback(
    (item: ReportRow) =>
      [item.report_number != null ? String(item.report_number).padStart(5, '0') : null, item.listings?.asin, item.listings?.title, item.listings?.seller_name, item.users?.name].filter(Boolean).join(' '),
    [],
  )
  const getViolationType = useCallback((item: ReportRow) => item.violation_category ?? item.user_violation_type ?? item.br_form_type ?? item.violation_type, [])
  const getMarketplace = useCallback((item: ReportRow) => item.listings?.marketplace ?? '', [])

  const filteredData = useFilterableTable(reports ?? [], filters, getSearchableText, getViolationType, getMarketplace)

  const getSortValue = useCallback((item: ReportRow, field: string): string | number | null => {
    switch (field) {
      case 'status': return item.status
      case 'channel': return item.listings?.marketplace ?? null
      case 'violation': return item.br_form_type ?? item.violation_type
      case 'asin': return item.listings?.asin ?? null
      case 'seller': return item.listings?.seller_name ?? null
      case 'requester': return (item as Record<string, unknown>).users ? ((item as Record<string, unknown>).users as { name: string })?.name : null
      case 'date': return new Date(item.created_at).getTime()
      case 'updated': return (item as Record<string, unknown>).updated_at ? new Date((item as Record<string, unknown>).updated_at as string).getTime() : null
      case 'resolved': return (item as Record<string, unknown>).resolved_at ? new Date((item as Record<string, unknown>).resolved_at as string).getTime() : null
      default: return null
    }
  }, [])

  const { sortedData, sort, toggleSort } = useSortableTable(filteredData, { field: 'date', direction: 'desc' }, getSortValue)

  const defaultColWidths = useMemo(() => [40, 56, 110, 65, 140, 150, 220, 110, 95, 95, 115], [])
  const { containerRef, tableStyle, getColStyle, getResizeHandleProps } = useResizableColumns({
    storageKey: 'reports-queue-v3',
    defaultWidths: defaultColWidths,
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
    const allIds = sortedData.map((r) => r.id)
    setSelectedIds((prev) => {
      if (allIds.length > 0 && allIds.every((id) => prev.has(id))) return new Set()
      return new Set(allIds)
    })
  }, [sortedData])

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

  const handleBulkApprove = useCallback(async () => {
    if (selectedIds.size === 0) return
    setBulkLoading('approve')
    try {
      const res = await fetch('/api/reports/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_ids: [...selectedIds] }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Bulk approve failed')
      }
      const result = await res.json() as { approved: number; failed: number; skipped: number }
      setSelectedIds(new Set())
      addToast({ type: result.failed > 0 ? 'warning' : 'success', title: result.failed > 0 ? 'Partially approved' : 'Approved', message: `Approved: ${result.approved}, Failed: ${result.failed}, Skipped: ${result.skipped}` })
      router.refresh()
    } catch (e) {
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setBulkLoading(null)
    }
  }, [selectedIds, router])

  const handleBulkSubmit = useCallback(async (action: 'submit_review' | 'submit_sc') => {
    if (selectedIds.size === 0) return
    setBulkLoading(action)
    try {
      const res = await fetch('/api/reports/bulk-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_ids: [...selectedIds], action }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Bulk submit failed')
      }
      const result = await res.json() as { submitted: number; failed: number; skipped: number }
      setSelectedIds(new Set())
      addToast({ type: result.failed > 0 ? 'warning' : 'success', title: result.failed > 0 ? 'Partially submitted' : 'Submitted', message: `Submitted: ${result.submitted}, Failed: ${result.failed}, Skipped: ${result.skipped}` })
      router.refresh()
    } catch (e) {
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setBulkLoading(null)
    }
  }, [selectedIds, router])

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    setBulkLoading('delete')
    try {
      const res = await fetch('/api/reports/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_ids: [...selectedIds] }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Bulk delete failed')
      }
      const result = await res.json() as { deleted: number; failed: number }
      setSelectedIds(new Set())
      setShowBulkDeleteConfirm(false)
      addToast({ type: result.failed > 0 ? 'warning' : 'success', title: result.failed > 0 ? 'Partially deleted' : 'Deleted', message: `Deleted: ${result.deleted}${result.failed > 0 ? `, Failed: ${result.failed}` : ''}` })
      router.refresh()
    } catch (e) {
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setBulkLoading(null)
    }
  }, [selectedIds, router])

  const STATUS_TABS = [
    { value: '', label: t('common.all') },
    { value: 'draft', label: t('reports.tabs.draft') },
    { value: 'br_submitting', label: 'BR Submitting' },
    { value: 'monitoring', label: t('reports.tabs.monitoring') },
  ]

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="truncate text-2xl font-bold text-th-text md:text-3xl">{t('reports.queueTitle')}</h1>
            <OwnerToggle
              value={ownerFilter}
              onChange={(v) => {
                const url = new URL(window.location.href)
                url.searchParams.set('owner', v)
                router.push(url.pathname + url.search)
              }}
            />
          </div>
          <Button size="sm" onClick={() => setShowNewReport(true)}>
            {t('reports.new.title')}
          </Button>
        </div>
        {brFormTypeFilter && (
          <div className="flex items-center gap-2">
            <Link
              href="/reports"
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
            href={`/reports${tab.value ? `?status=${tab.value}` : ''}`}
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

      <TableFilters filters={filters} onFiltersChange={handleFiltersChange} />

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-th-accent/30 bg-th-accent/5 px-4 py-2.5">
          <span className="text-sm font-medium text-th-text">{selectedIds.size}건 선택</span>
          <div className="h-4 w-px bg-th-border" />
          {(selectedStatuses['draft'] ?? 0) > 0 && canEdit && (
            <Button
              size="sm"
              variant="outline"
              loading={bulkLoading === 'submit_review'}
              onClick={() => handleBulkSubmit('submit_review')}
            >
              Submit Review ({selectedStatuses['draft']})
            </Button>
          )}
          {(selectedStatuses['pending_review'] ?? 0) > 0 && canEdit && (
            <Button
              size="sm"
              loading={bulkLoading === 'approve'}
              onClick={handleBulkApprove}
            >
              Approve ({selectedStatuses['pending_review']})
            </Button>
          )}
          {(selectedStatuses['approved'] ?? 0) > 0 && canEdit && (
            <Button
              size="sm"
              variant="outline"
              loading={bulkLoading === 'submit_sc'}
              onClick={() => handleBulkSubmit('submit_sc')}
            >
              Submit SC ({selectedStatuses['approved']})
            </Button>
          )}
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              className="border-st-danger-text/30 text-st-danger-text hover:bg-st-danger-text/10"
              onClick={() => setShowBulkDeleteConfirm(true)}
            >
              Delete ({selectedIds.size})
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            선택 해제
          </Button>
        </div>
      )}

      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {sortedData.length === 0 ? (
          <div className="rounded-lg border border-th-border bg-surface-card p-8 text-center text-th-text-muted">
            {filters.search || filters.violationType || filters.marketplace
              ? t('table.noResults' as Parameters<typeof t>[0])
              : t('reports.noReports')}
          </div>
        ) : (
          sortedData.map((report) => (
            <button
              key={report.id}
              type="button"
              onClick={() => router.push(`/reports/${report.id}`)}
              className="w-full text-left"
            >
              <div className="rounded-lg border border-th-border bg-surface-card p-4 transition-colors active:bg-th-bg-hover">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <ViolationBadge code={report.user_violation_type ?? report.br_form_type ?? report.violation_type} violationCategory={report.violation_category} showLabel={false} size="md" />
                    {report.disagreement_flag && <Badge variant="warning" size="md">!</Badge>}
                  </div>
                  <StatusBadge status={report.status as ReportStatus} type="report" size="md" />
                </div>
                <p className="mt-2 font-mono text-sm text-th-text">
                  {report.listings?.asin ? (
                    <a href={getAmazonUrl(report.listings.asin, report.listings.marketplace)} target="_blank" rel="noopener noreferrer" className="text-th-accent hover:underline">{report.listings.asin}</a>
                  ) : '—'}
                  {(report.related_asins?.length ?? 0) > 0 && (
                    <span className="ml-1.5 inline-flex items-center rounded bg-th-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-th-accent-text">
                      +{report.related_asins!.length}
                    </span>
                  )}
                </p>
                <p className="mt-1 truncate text-sm text-th-text-secondary">{report.listings?.title ?? '—'}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-th-text-muted">
                  <span>{report.listings?.seller_name ?? '—'}</span>
                  <div className="flex items-center gap-2">
                    {report.br_sla_deadline_at && (
                      <SlaBadge
                        deadline={report.br_sla_deadline_at}
                        paused={['open', 'work_in_progress', 'answered'].includes(report.br_case_status ?? '')}
                      />
                    )}
                    {report.br_case_id && report.br_case_id !== 'submitted' && (
                      <a
                        href={`https://brandregistry.amazon.com/cu/case-dashboard/view-case?caseID=${report.br_case_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[10px] text-th-accent"
                        onClick={(e) => e.stopPropagation()}
                      >
                        BR#{report.br_case_id}
                      </a>
                    )}
                    {report.br_case_status && (
                      <StatusBadge status={report.br_case_status as Parameters<typeof StatusBadge>[0]['status']} type="br_case" size="sm" />
                    )}
                    {report.ai_confidence_score !== null && <span>AI: {report.ai_confidence_score}%</span>}
                    <span>{formatDate(report.created_at)}</span>
                  </div>
                </div>
              </div>
            </button>
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
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  className="accent-th-accent"
                  checked={sortedData.length > 0 && sortedData.every((r) => selectedIds.has(r.id))}
                  onChange={handleToggleSelectAll}
                />
              </th>
              <th className="relative px-4 py-3 text-sm font-semibold text-th-text-tertiary">No.<div {...getResizeHandleProps(1)} /></th>
              <SortableHeader label={t('common.status')} field="status" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(2)} /></SortableHeader>
              <SortableHeader label="CH" field="channel" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(3)} /></SortableHeader>
              <SortableHeader label={t('reports.asin')} field="asin" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(4)} /></SortableHeader>
              <SortableHeader label={t('reports.violation')} field="violation" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(5)} /></SortableHeader>
              <SortableHeader label={t('reports.seller')} field="seller" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(6)} /></SortableHeader>
              <SortableHeader label={t('reports.createdBy')} field="requester" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(7)} /></SortableHeader>
              <SortableHeader label={t('common.date')} field="date" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(8)} /></SortableHeader>
              <SortableHeader label="Updated" field="updated" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(9)} /></SortableHeader>
              <SortableHeader label="Resolved" field="resolved" currentSort={sort} onSort={toggleSort}><div {...getResizeHandleProps(10)} /></SortableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center text-sm text-th-text-muted">
                  {filters.search || filters.violationType || filters.marketplace
                    ? t('table.noResults' as Parameters<typeof t>[0])
                    : t('reports.noReports')}
                </td>
              </tr>
            ) : (
              sortedData.map((report, idx) => {
                const row = report as ReportRow & Record<string, unknown>
                return (
                <tr
                  key={report.id}
                  className={`cursor-pointer transition-colors hover:bg-th-bg-hover ${previewReportId === report.id ? 'bg-th-accent/10' : 'bg-surface-card'}`}
                  onClick={() => setPreviewReportId(report.id)}
                >
                  <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="accent-th-accent"
                      checked={selectedIds.has(report.id)}
                      onChange={() => handleToggleSelect(report.id)}
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col">
                      <span className="text-xs text-th-text-muted">{String(report.report_number).padStart(5, '0')}</span>
                      {report.br_case_id && report.br_case_id !== 'submitted' && (
                        <a
                          href={`https://brandregistry.amazon.com/cu/case-dashboard/view-case?caseID=${report.br_case_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[10px] text-th-accent hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          BR#{report.br_case_id}
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={report.status as ReportStatus} type="report" />
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-th-text">{getChannelCode(report.listings?.marketplace)}</td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-th-text">
                      {report.listings?.asin ? (
                        <a href={getAmazonUrl(report.listings.asin, report.listings.marketplace)} target="_blank" rel="noopener noreferrer" className="text-th-accent hover:underline" onClick={(e) => e.stopPropagation()}>{report.listings.asin}</a>
                      ) : '—'}
                      {(report.related_asins?.length ?? 0) > 0 && (
                        <span className="ml-1.5 inline-flex items-center rounded bg-th-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-th-accent-text">
                          +{report.related_asins!.length}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <ViolationBadge code={report.user_violation_type ?? report.br_form_type ?? report.violation_type} violationCategory={report.violation_category} showLabel={false} />
                      {report.disagreement_flag && <Badge variant="warning">!</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-th-text-secondary truncate">{report.listings?.seller_name ?? '—'}</td>
                  <td className="px-4 py-3.5 text-th-text-secondary truncate">{report.users?.name ?? '—'}</td>
                  <td className="px-4 py-3.5 text-th-text-muted">{formatDate(report.created_at)}</td>
                  <td className="px-4 py-3.5 text-th-text-muted">{formatDate(row.updated_at as string)}</td>
                  <td className="px-4 py-3.5 text-th-text-muted">{formatDate(row.resolved_at as string)}</td>
                </tr>
                )
              })
            )}
          </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/reports?page=${p}${statusFilter ? `&status=${statusFilter}` : ''}${brFormTypeFilter ? `&br_form_type=${brFormTypeFilter}` : ''}`}
              className={`rounded-md px-3 py-1.5 text-sm ${
                p === page ? 'bg-th-accent text-white' : 'text-th-text-secondary hover:bg-th-bg-hover'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}

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
        title="Delete Reports"
      >
        <p className="text-sm text-th-text-secondary">
          선택한 {selectedIds.size}건을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowBulkDeleteConfirm(false)}>
            취소
          </Button>
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

      {/* Report Preview Panel */}
      <ReportPreviewPanel
        reportId={previewReportId}
        onClose={() => { setPreviewReportId(null); router.refresh() }}
        userRole={userRole}
      />
    </div>
  )
}
