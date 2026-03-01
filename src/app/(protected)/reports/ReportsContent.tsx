'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n/context'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import { Badge } from '@/components/ui/Badge'
import type { ReportStatus } from '@/types/reports'
import type { ViolationCode } from '@/constants/violations'

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
  disagreementFilter: boolean
}

export const ReportsContent = ({
  reports,
  totalPages,
  page,
  statusFilter,
  disagreementFilter,
}: ReportsContentProps) => {
  const { t } = useI18n()

  const STATUS_TABS = [
    { value: '', label: t('common.all') },
    { value: 'draft', label: t('reports.tabs.draft') },
    { value: 'pending_review', label: t('reports.tabs.pending') },
    { value: 'approved', label: t('reports.tabs.approved') },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-th-text">{t('reports.queueTitle')}</h1>
        <Link
          href={`/reports?${disagreementFilter ? '' : 'disagreement=true'}`}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
            disagreementFilter
              ? 'border-st-warning-text/30 bg-st-warning-bg text-st-warning-text'
              : 'border-th-border text-th-text-tertiary hover:bg-th-bg-hover'
          }`}
        >
          {t('reports.disagreementOnly')}
        </Link>
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

      <div className="overflow-hidden rounded-lg border border-th-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-th-border bg-th-bg-tertiary">
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">{t('reports.violation')}</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">{t('reports.asin')}</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">{t('reports.title')}</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">{t('reports.seller')}</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">{t('reports.ai')}</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">{t('common.status')}</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">{t('common.date')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {(!reports || reports.length === 0) ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-th-text-muted">
                  {t('reports.noReports')}
                </td>
              </tr>
            ) : (
              reports.map((report) => (
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
                  <td className="px-4 py-3 text-th-text-muted">
                    {new Date(report.created_at).toLocaleDateString()}
                  </td>
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
