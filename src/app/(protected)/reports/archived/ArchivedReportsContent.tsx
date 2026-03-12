'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/context'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import { Button } from '@/components/ui/Button'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { TableFilters } from '@/components/ui/TableFilters'
import { SlidePanel } from '@/components/ui/SlidePanel'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { useSortableTable } from '@/hooks/useSortableTable'
import { useResizableColumns } from '@/hooks/useResizableColumns'
import { useFilterableTable } from '@/hooks/useFilterableTable'
import { useToast } from '@/hooks/useToast'
import type { ReportStatus } from '@/types/reports'
import type { TableFilters as TableFiltersType } from '@/types/table'

type ReportRow = {
  id: string
  br_form_type: string
  violation_type: string
  violation_category: string | null
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
  const { addToast } = useToast()
  const [filters, setFilters] = useState<TableFiltersType>({ search: '', violationType: '', marketplace: '', dateFrom: '', dateTo: '' })
  const [unarchiving, setUnarchiving] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)

  const previewReport = previewId ? (reports ?? []).find((r) => r.id === previewId) ?? null : null
  const handleClosePreview = useCallback(() => setPreviewId(null), [])

  const canAct = userRole === 'owner' || userRole === 'admin' || userRole === 'editor'

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

  // violation(130) + asin(140) + title(200) + reason(150) + archivedAt(120) + action(80)
  const defaultArchiveColWidths = useMemo(() => [160, 160, 350, 180, 140, 90], [])
  const { containerRef: archiveContainerRef, tableStyle: archiveTableStyle, getColStyle: getArchiveColStyle, getResizeHandleProps: getArchiveResizeProps } = useResizableColumns({
    storageKey: 'reports-archived',
    defaultWidths: defaultArchiveColWidths,
  })

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
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setUnarchiving(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 md:h-full md:gap-6">
      <div className="shrink-0 flex items-center justify-between">
        <h1 className="text-xl font-bold text-th-text md:text-2xl">
          {t('reports.archivedTitle' as Parameters<typeof t>[0])}
        </h1>
      </div>

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
            <div
              key={report.id}
              className="cursor-pointer rounded-lg border border-th-border bg-surface-card p-4 transition-colors active:bg-th-bg-hover"
              onClick={() => setPreviewId(report.id)}
            >
              <div className="flex items-start justify-between">
                <ViolationBadge code={report.br_form_type ?? report.violation_type} showLabel={false} />
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
                  {report.archived_at ? new Date(report.archived_at).toLocaleDateString('en-CA') : '—'}
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

      {/* Desktop: table — pocket scroll */}
      <div ref={archiveContainerRef} className="hidden min-h-0 flex-1 flex-col overflow-x-auto overflow-y-hidden rounded-lg border border-th-border md:flex">
        <table className="shrink-0 table-fixed text-left text-sm" style={archiveTableStyle}>
          <colgroup>
            {(canAct ? defaultArchiveColWidths : defaultArchiveColWidths.slice(0, -1)).map((_, i) => (
              <col key={i} style={getArchiveColStyle(i)} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-th-border bg-th-bg-tertiary">
              <SortableHeader label={t('reports.violation')} field="violation" currentSort={sort} onSort={toggleSort}><div {...getArchiveResizeProps(0)} /></SortableHeader>
              <SortableHeader label={t('reports.asin')} field="asin" currentSort={sort} onSort={toggleSort}><div {...getArchiveResizeProps(1)} /></SortableHeader>
              <SortableHeader label={t('reports.title')} field="title" currentSort={sort} onSort={toggleSort}><div {...getArchiveResizeProps(2)} /></SortableHeader>
              <SortableHeader
                label={t('reports.detail.archiveReason' as Parameters<typeof t>[0])}
                field="reason"
                currentSort={sort}
                onSort={toggleSort}
              ><div {...getArchiveResizeProps(3)} /></SortableHeader>
              <SortableHeader
                label={t('reports.detail.archivedAt' as Parameters<typeof t>[0])}
                field="archived_at"
                currentSort={sort}
                onSort={toggleSort}
              ><div {...getArchiveResizeProps(4)} /></SortableHeader>
              {canAct && (
                <th className="px-4 py-3 text-xs font-semibold text-th-text-tertiary">
                  {t('common.action')}
                </th>
              )}
            </tr>
          </thead>
        </table>
        <div className="min-h-0 flex-1 overflow-y-auto shadow-[inset_0_6px_8px_-4px_rgba(0,0,0,0.15)]">
          <table className="table-fixed text-left text-sm" style={archiveTableStyle}>
          <colgroup>
            {(canAct ? defaultArchiveColWidths : defaultArchiveColWidths.slice(0, -1)).map((_, i) => (
              <col key={i} style={getArchiveColStyle(i)} />
            ))}
          </colgroup>
          <tbody className="divide-y divide-th-border">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={canAct ? 6 : 5} className="px-4 py-10 text-center text-sm text-th-text-muted">
                  {filters.search || filters.violationType || filters.marketplace
                    ? t('table.noResults' as Parameters<typeof t>[0])
                    : t('reports.noArchived' as Parameters<typeof t>[0])}
                </td>
              </tr>
            ) : (
              sortedData.map((report) => (
                <tr key={report.id} className="cursor-pointer bg-surface-card transition-colors hover:bg-th-bg-hover" onClick={() => setPreviewId(report.id)}>
                  <td className="px-4 py-3.5">
                    <ViolationBadge code={report.br_form_type ?? report.violation_type} showLabel={false} />
                  </td>
                  <td className="px-4 py-3.5">
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
                  <td className="px-4 py-3.5 text-th-text-muted">
                    {report.archived_at ? new Date(report.archived_at).toLocaleDateString('en-CA') : '—'}
                  </td>
                  {canAct && (
                    <td className="px-4 py-3.5">
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
      {/* Archived Report Quick View */}
      <SlidePanel
        open={!!previewId}
        onClose={handleClosePreview}
        title={t('reports.detail.title')}
        size="xl"
        status={previewReport ? <StatusBadge status={previewReport.status as ReportStatus} type="report" /> : undefined}
      >
        {previewReport && (
          <div className="space-y-6 p-6">
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-th-text">{t('reports.detail.violationInfo')}</h3>
              </CardHeader>
              <CardContent>
                <ViolationBadge code={previewReport.br_form_type ?? previewReport.violation_type} />
              </CardContent>
            </Card>

            {previewReport.listings && (
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-semibold text-th-text">{t('reports.detail.listing')}</h3>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-th-text-tertiary">ASIN</dt>
                      <dd className="mt-0.5 font-mono font-medium text-th-text">{previewReport.listings.asin}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-th-text-tertiary">{t('reports.detail.marketplace')}</dt>
                      <dd className="mt-0.5 font-medium text-th-text">{previewReport.listings.marketplace}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-th-text-tertiary">{t('reports.seller')}</dt>
                      <dd className="mt-0.5 font-medium text-th-text">{previewReport.listings.seller_name ?? '—'}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-th-text-tertiary">{t('reports.title')}</dt>
                      <dd className="mt-0.5 font-medium text-th-text">{previewReport.listings.title}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            )}

            {previewReport.archive_reason && (
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-semibold text-th-text">{t('reports.detail.archiveReason' as Parameters<typeof t>[0])}</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-th-text-secondary">{previewReport.archive_reason}</p>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between text-xs text-th-text-muted">
              <span>
                {previewReport.archived_at
                  ? `${t('reports.detail.archivedAt' as Parameters<typeof t>[0])}: ${new Date(previewReport.archived_at).toLocaleString()}`
                  : ''}
              </span>
              <Link
                href={`/reports/${previewReport.id}`}
                className="text-th-accent-text hover:underline"
              >
                {t('common.details')} →
              </Link>
            </div>

            {canAct && (
              <Button
                variant="outline"
                className="w-full"
                loading={unarchiving === previewReport.id}
                onClick={() => handleUnarchive(previewReport.id)}
              >
                {t('reports.detail.unarchive' as Parameters<typeof t>[0])}
              </Button>
            )}
          </div>
        )}
      </SlidePanel>
    </div>
  )
}
