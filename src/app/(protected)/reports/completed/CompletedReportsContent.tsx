'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/context'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { TableFilters } from '@/components/ui/TableFilters'
import { useSortableTable } from '@/hooks/useSortableTable'
import { useFilterableTable } from '@/hooks/useFilterableTable'
import type { ReportStatus } from '@/types/reports'
import type { ViolationCode } from '@/constants/violations'
import { OwnerToggle } from '@/components/ui/OwnerToggle'
import type { Role } from '@/types/users'
import type { TableFilters as TableFiltersType } from '@/types/table'

type ReportRow = {
  id: string
  violation_type: string
  status: string
  created_at: string
  sc_case_id?: string | null
  listings: { asin: string; title: string; marketplace: string; seller_name: string | null } | null
}

type CompletedReportsContentProps = {
  reports: ReportRow[] | null
  statusFilter: string
  userRole: Role
  ownerFilter: 'my' | 'all'
}

export const CompletedReportsContent = ({ reports, statusFilter, userRole, ownerFilter }: CompletedReportsContentProps) => {
  const { t } = useI18n()
  const router = useRouter()
  const [filters, setFilters] = useState<TableFiltersType>({ search: '', violationType: '', marketplace: '' })

  const getSearchableText = useCallback(
    (item: ReportRow) =>
      [item.listings?.asin, item.listings?.title, item.listings?.seller_name, item.sc_case_id].filter(Boolean).join(' '),
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
      case 'scCase': return item.sc_case_id ?? null
      case 'status': return item.status
      case 'date': return new Date(item.created_at).getTime()
      default: return null
    }
  }, [])

  const { sortedData, sort, toggleSort } = useSortableTable(filteredData, { field: 'date', direction: 'desc' }, getSortValue)

  const STATUS_TABS = [
    { value: '', label: t('common.all') },
    { value: 'resolved', label: t('reports.tabs.resolved') },
    { value: 'unresolved', label: t('reports.tabs.unresolved') },
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-th-text md:text-2xl">{t('reports.completedTitle')}</h1>
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

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-th-border bg-th-bg-secondary p-1">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/reports/completed${tab.value ? `?status=${tab.value}` : ''}`}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-surface-card text-th-text shadow-sm'
                : 'text-th-text-muted hover:text-th-text-secondary'
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
                  <ViolationBadge code={report.violation_type as ViolationCode} showLabel={false} />
                  <StatusBadge status={report.status as ReportStatus} type="report" />
                </div>
                <p className="mt-2 font-mono text-sm text-th-text">{report.listings?.asin ?? '—'}</p>
                <p className="mt-1 truncate text-sm text-th-text-secondary">{report.listings?.title ?? '—'}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-th-text-muted">
                  <span>{report.sc_case_id ? `SC: ${report.sc_case_id}` : '—'}</span>
                  <span>{new Date(report.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-xl border border-th-border shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-th-border bg-th-bg-tertiary">
              <SortableHeader label={t('reports.violation')} field="violation" currentSort={sort} onSort={toggleSort} />
              <SortableHeader label={t('reports.asin')} field="asin" currentSort={sort} onSort={toggleSort} />
              <SortableHeader label={t('reports.title')} field="title" currentSort={sort} onSort={toggleSort} />
              <SortableHeader label={t('reports.scCase')} field="scCase" currentSort={sort} onSort={toggleSort} />
              <SortableHeader label={t('common.status')} field="status" currentSort={sort} onSort={toggleSort} />
              <SortableHeader label={t('common.date')} field="date" currentSort={sort} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-th-text-muted">
                  {filters.search || filters.violationType || filters.marketplace
                    ? t('table.noResults' as Parameters<typeof t>[0])
                    : t('reports.noCompleted')}
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
                  <td className="max-w-xs truncate px-4 py-3 text-th-text-secondary">{report.listings?.title ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-th-text-muted">{report.sc_case_id ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={report.status as ReportStatus} type="report" />
                  </td>
                  <td className="px-4 py-3 text-th-text-muted">
                    {new Date(report.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
