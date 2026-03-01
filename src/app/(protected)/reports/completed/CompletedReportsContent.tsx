'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n/context'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import type { ReportStatus } from '@/types/reports'
import type { ViolationCode } from '@/constants/violations'

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
}

export const CompletedReportsContent = ({ reports, statusFilter }: CompletedReportsContentProps) => {
  const { t } = useI18n()

  const STATUS_TABS = [
    { value: '', label: t('common.all') },
    { value: 'submitted', label: t('reports.tabs.submitted') },
    { value: 'monitoring', label: t('reports.tabs.monitoring') },
    { value: 'resolved', label: t('reports.tabs.resolved') },
    { value: 'unresolved', label: t('reports.tabs.unresolved') },
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl font-bold text-th-text md:text-2xl">{t('reports.completedTitle')}</h1>

      <div className="flex gap-2 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/reports/completed${tab.value ? `?status=${tab.value}` : ''}`}
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

      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {(!reports || reports.length === 0) ? (
          <div className="rounded-lg border border-th-border bg-surface-card p-8 text-center text-th-text-muted">
            {t('reports.noCompleted')}
          </div>
        ) : (
          reports.map((report) => (
            <Link key={report.id} href={`/reports/${report.id}`}>
              <div className="rounded-lg border border-th-border bg-surface-card p-4 transition-colors active:bg-th-bg-hover">
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
      <div className="hidden overflow-hidden rounded-lg border border-th-border md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-th-border bg-th-bg-tertiary">
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">{t('reports.violation')}</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">{t('reports.asin')}</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">{t('reports.title')}</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">{t('reports.scCase')}</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">{t('common.status')}</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">{t('common.date')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {(!reports || reports.length === 0) ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-th-text-muted">
                  {t('reports.noCompleted')}
                </td>
              </tr>
            ) : (
              reports.map((report) => (
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
