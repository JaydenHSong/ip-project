'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/context'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import { Button } from '@/components/ui/Button'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { TableFilters } from '@/components/ui/TableFilters'
import { useSortableTable } from '@/hooks/useSortableTable'
import { useFilterableTable } from '@/hooks/useFilterableTable'
import type { ReportStatus } from '@/types/reports'
import type { ViolationCode } from '@/constants/violations'
import type { TableFilters as TableFiltersType } from '@/types/table'

type ReportRow = {
  id: string
  violation_type: string
  status: string
  created_at: string
  archived_at: string | null
  archive_reason: string | null
  listings: { asin: string; title: string; marketplace: string; seller_name: string | null } | null
}

type ArchivedReportsContentProps = {
  reports: ReportRow[] | null
  userRole: string
}

export const ArchivedReportsContent = ({ reports, userRole }: ArchivedReportsContentProps) => {
  const { t } = useI18n()
  const router = useRouter()
  const [filters, setFilters] = useState<TableFiltersType>({ search: '', violationType: '', marketplace: '' })
  const [unarchiving, setUnarchiving] = useState<string | null>(null)

  const canAct = userRole === 'admin' || userRole === 'editor'

  const getSearchableText = useCallback(
    (item: ReportRow) =>
      [item.listings?.asin, item.listings?.title, item.listings?.seller_name, item.archive_reason]
        .filter(Boolean)
        .join(' '),
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
      case 'reason': return item.archive_reason ?? null
      case 'archived_at': return item.archived_at ? new Date(item.archived_at).getTime() : null
      default: return null
    }
  }, [])

  const { sortedData, sort, toggleSort } = useSortableTable(filteredData, { field: 'archived_at', direction: 'desc' }, getSortValue)

  const handleUnarchive = async (reportId: string) => {
    setUnarchiving(reportId)
    try {
      const res = await fetch(`/api/reports/${reportId}/unarchive`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Unarchive failed')
      }
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed')
    } finally {
      setUnarchiving(null)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl font-bold text-th-text md:text-2xl">
        {t('reports.archivedTitle' as Parameters<typeof t>[0])}
      </h1>

      <TableFilters filters={filters} onFiltersChange={setFilters} />

      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {sortedData.length === 0 ? (
          <div className="rounded-lg border border-th-border bg-surface-card p-8 text-center text-th-text-muted">
            {filters.search || filters.violationType || filters.marketplace
              ? t('table.noResults' as Parameters<typeof t>[0])
              : t('reports.noArchived' as Parameters<typeof t>[0])}
          </div>
        ) : (
          sortedData.map((report) => (
            <div key={report.id} className="rounded-lg border border-th-border bg-surface-card p-4">
              <div className="flex items-start justify-between">
                <ViolationBadge code={report.violation_type as ViolationCode} showLabel={false} />
                <StatusBadge status={report.status as ReportStatus} type="report" />
              </div>
              <Link href={`/reports/${report.id}`}>
                <p className="mt-2 font-mono text-sm text-th-text hover:text-th-accent-text">
                  {report.listings?.asin ?? '—'}
                </p>
              </Link>
              <p className="mt-1 truncate text-sm text-th-text-secondary">{report.listings?.title ?? '—'}</p>
              {report.archive_reason && (
                <p className="mt-1 truncate text-xs text-th-text-muted">{report.archive_reason}</p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-th-text-muted">
                  {report.archived_at ? new Date(report.archived_at).toLocaleDateString() : '—'}
                </span>
                {canAct && (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={unarchiving === report.id}
                    onClick={() => handleUnarchive(report.id)}
                  >
                    {t('reports.detail.unarchive' as Parameters<typeof t>[0])}
                  </Button>
                )}
              </div>
            </div>
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
              <SortableHeader
                label={t('reports.detail.archiveReason' as Parameters<typeof t>[0])}
                field="reason"
                currentSort={sort}
                onSort={toggleSort}
              />
              <SortableHeader
                label={t('reports.detail.archivedAt' as Parameters<typeof t>[0])}
                field="archived_at"
                currentSort={sort}
                onSort={toggleSort}
              />
              {canAct && (
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">
                  {t('common.action')}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={canAct ? 6 : 5} className="px-4 py-12 text-center text-th-text-muted">
                  {filters.search || filters.violationType || filters.marketplace
                    ? t('table.noResults' as Parameters<typeof t>[0])
                    : t('reports.noArchived' as Parameters<typeof t>[0])}
                </td>
              </tr>
            ) : (
              sortedData.map((report) => (
                <tr key={report.id} className="bg-surface-card transition-colors hover:bg-th-bg-hover">
                  <td className="px-4 py-3">
                    <ViolationBadge code={report.violation_type as ViolationCode} showLabel={false} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/reports/${report.id}`} className="font-mono text-th-text hover:text-th-accent-text">
                      {report.listings?.asin ?? '—'}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-th-text-secondary">
                    {report.listings?.title ?? '—'}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-th-text-muted">
                    {report.archive_reason ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-th-text-muted">
                    {report.archived_at ? new Date(report.archived_at).toLocaleDateString() : '—'}
                  </td>
                  {canAct && (
                    <td className="px-4 py-3">
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
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
