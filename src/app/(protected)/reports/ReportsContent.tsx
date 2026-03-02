'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import { Badge } from '@/components/ui/Badge'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { TableFilters } from '@/components/ui/TableFilters'
import { useSortableTable } from '@/hooks/useSortableTable'
import { useFilterableTable } from '@/hooks/useFilterableTable'
import { VIOLATION_CATEGORIES } from '@/constants/violations'
import type { ViolationCategory } from '@/constants/violations'
import type { ReportStatus } from '@/types/reports'
import type { ViolationCode } from '@/constants/violations'
import type { TableFilters as TableFiltersType } from '@/types/table'

type ReportRow = {
  id: string
  violation_type: string
  status: string
  ai_confidence_score: number | null
  disagreement_flag: boolean
  created_at: string
  listings: { asin: string; title: string; marketplace: string; seller_name: string | null } | null
}

type ReportsContentProps = {
  reports: ReportRow[] | null
  totalPages: number
  page: number
  statusFilter: string
  categoryFilter: ViolationCategory | ''
  disagreementFilter: boolean
}

export const ReportsContent = ({
  reports,
  totalPages,
  page,
  statusFilter,
  categoryFilter,
  disagreementFilter,
}: ReportsContentProps) => {
  const { t } = useI18n()
  const [filters, setFilters] = useState<TableFiltersType>({ search: '', violationType: '', marketplace: '' })

  const getSearchableText = useCallback(
    (item: ReportRow) =>
      [item.listings?.asin, item.listings?.title, item.listings?.seller_name].filter(Boolean).join(' '),
    [],
  )
  const getViolationType = useCallback((item: ReportRow) => item.violation_type, [])
  const getMarketplace = useCallback((item: ReportRow) => item.listings?.marketplace ?? '', [])

  const filteredData = useFilterableTable(reports ?? [], filters, getSearchableText, getViolationType, getMarketplace)

  const getSortValue = useCallback((item: ReportRow, field: string): string | number | null => {
    switch (field) {
      case 'violation': return item.violation_type
      case 'asin': return item.listings?.asin ?? null
      case 'title': return item.listings?.title ?? null
      case 'seller': return item.listings?.seller_name ?? null
      case 'ai': return item.ai_confidence_score
      case 'status': return item.status
      case 'date': return new Date(item.created_at).getTime()
      default: return null
    }
  }, [])

  const { sortedData, sort, toggleSort } = useSortableTable(filteredData, { field: 'date', direction: 'desc' }, getSortValue)

  const STATUS_TABS = [
    { value: '', label: t('common.all') },
    { value: 'draft', label: t('reports.tabs.draft') },
    { value: 'pending_review', label: t('reports.tabs.pending') },
    { value: 'approved', label: t('reports.tabs.approved') },
    { value: 'submitted', label: t('reports.tabs.submitted') },
    { value: 'monitoring', label: t('reports.tabs.monitoring') },
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-th-text md:text-2xl">{t('reports.queueTitle')}</h1>
        <div className="flex items-center gap-2">
          {categoryFilter && (
            <Link
              href="/reports"
              className="flex items-center gap-1 rounded-lg border border-th-accent/30 bg-th-accent/10 px-2 py-1 text-xs font-medium text-th-accent-text md:px-3 md:py-1.5 md:text-sm"
            >
              {VIOLATION_CATEGORIES[categoryFilter]}
              <X className="h-3 w-3" />
            </Link>
          )}
          <Link
            href={`/reports?${disagreementFilter ? '' : 'disagreement=true'}`}
            className={`rounded-lg border px-2 py-1 text-xs font-medium md:px-3 md:py-1.5 md:text-sm ${
              disagreementFilter
                ? 'border-st-warning-text/30 bg-st-warning-bg text-st-warning-text'
                : 'border-th-border text-th-text-tertiary hover:bg-th-bg-hover'
            }`}
          >
            {t('reports.disagreementOnly')}
          </Link>
          <Link
            href="/reports/new"
            className="rounded-lg bg-th-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 md:text-sm"
          >
            + {t('reports.new.title')}
          </Link>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/reports${tab.value ? `?status=${tab.value}` : ''}`}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
              statusFilter === tab.value
                ? 'bg-th-accent-soft text-th-accent-text'
                : 'text-th-text-tertiary hover:bg-th-bg-hover'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <TableFilters filters={filters} onFiltersChange={setFilters} />

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
            <Link key={report.id} href={`/reports/${report.id}`}>
              <div className="rounded-lg border border-th-border bg-surface-card p-4 transition-colors active:bg-th-bg-hover">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <ViolationBadge code={report.violation_type as ViolationCode} showLabel={false} />
                    {report.disagreement_flag && <Badge variant="warning">!</Badge>}
                  </div>
                  <StatusBadge status={report.status as ReportStatus} type="report" />
                </div>
                <p className="mt-2 font-mono text-sm text-th-text">{report.listings?.asin ?? '—'}</p>
                <p className="mt-1 truncate text-sm text-th-text-secondary">{report.listings?.title ?? '—'}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-th-text-muted">
                  <span>{report.listings?.seller_name ?? '—'}</span>
                  <div className="flex items-center gap-2">
                    {report.ai_confidence_score !== null && <span>AI: {report.ai_confidence_score}%</span>}
                    <span>{new Date(report.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-lg border border-th-border md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-th-border bg-th-bg-tertiary">
              <SortableHeader label={t('reports.violation')} field="violation" currentSort={sort} onSort={toggleSort} />
              <SortableHeader label={t('reports.asin')} field="asin" currentSort={sort} onSort={toggleSort} />
              <SortableHeader label={t('reports.title')} field="title" currentSort={sort} onSort={toggleSort} />
              <SortableHeader label={t('reports.seller')} field="seller" currentSort={sort} onSort={toggleSort} />
              <SortableHeader label={t('reports.ai')} field="ai" currentSort={sort} onSort={toggleSort} />
              <SortableHeader label={t('common.status')} field="status" currentSort={sort} onSort={toggleSort} />
              <SortableHeader label={t('common.date')} field="date" currentSort={sort} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-th-text-muted">
                  {filters.search || filters.violationType || filters.marketplace
                    ? t('table.noResults' as Parameters<typeof t>[0])
                    : t('reports.noReports')}
                </td>
              </tr>
            ) : (
              sortedData.map((report) => (
                <tr key={report.id} className="bg-surface-card transition-colors hover:bg-th-bg-hover">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ViolationBadge code={report.violation_type as ViolationCode} showLabel={false} />
                      {report.disagreement_flag && <Badge variant="warning">!</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/reports/${report.id}`} className="font-mono text-th-text hover:text-th-accent-text">
                      {report.listings?.asin ?? '—'}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-th-text-secondary">{report.listings?.title ?? '—'}</td>
                  <td className="px-4 py-3 text-th-text-secondary">{report.listings?.seller_name ?? '—'}</td>
                  <td className="px-4 py-3 text-th-text-muted">
                    {report.ai_confidence_score !== null ? `${report.ai_confidence_score}%` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={report.status as ReportStatus} type="report" />
                  </td>
                  <td className="px-4 py-3 text-th-text-muted">{new Date(report.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/reports?page=${p}${statusFilter ? `&status=${statusFilter}` : ''}${disagreementFilter ? '&disagreement=true' : ''}`}
              className={`rounded-md px-3 py-1.5 text-sm ${
                p === page ? 'bg-th-accent text-white' : 'text-th-text-secondary hover:bg-th-bg-hover'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
