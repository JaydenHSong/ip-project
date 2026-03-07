'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n/context'
import { ScrollTabs } from '@/components/ui/ScrollTabs'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

type AuditLog = {
  id: string
  action: string
  resource_type: string
  resource_id: string | null
  details: unknown
  created_at: string
  users: { name: string; email: string } | null
}

const ACTION_VARIANTS = {
  create: 'success',
  update: 'info',
  delete: 'danger',
  approve: 'success',
  reject: 'warning',
  login: 'default',
  logout: 'default',
} as const

type AuditLogsContentProps = {
  logs: AuditLog[] | null
  totalPages: number
  page: number
  actionFilter: string
}

export const AuditLogsContent = ({ logs, totalPages, page, actionFilter }: AuditLogsContentProps) => {
  const { t } = useI18n()

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl font-bold text-th-text md:text-2xl">{t('auditLogs.title')}</h1>

      <ScrollTabs>
        <Link
          href="/audit-logs"
          className={`snap-start whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${!actionFilter ? 'bg-surface-card text-th-text shadow-sm' : 'text-th-text-muted hover:text-th-text-secondary'}`}
        >
          {t('common.all')}
        </Link>
        {['create', 'update', 'delete', 'approve', 'reject'].map((a) => (
          <Link
            key={a}
            href={`/audit-logs?action=${a}`}
            className={`snap-start whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${actionFilter === a ? 'bg-surface-card text-th-text shadow-sm' : 'text-th-text-muted hover:text-th-text-secondary'}`}
          >
            {a}
          </Link>
        ))}
      </ScrollTabs>

      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {(!logs || logs.length === 0) ? (
          <div className="rounded-xl border border-th-border bg-surface-card p-8 text-center text-th-text-muted">
            {t('auditLogs.noLogs')}
          </div>
        ) : (
          logs.map((log) => {
            const variant = ACTION_VARIANTS[log.action as keyof typeof ACTION_VARIANTS] ?? 'default'
            return (
              <div key={log.id} className="rounded-xl border border-th-border bg-surface-card p-4">
                <div className="flex items-center justify-between">
                  <Badge variant={variant as 'default' | 'success' | 'warning' | 'danger' | 'info'}>
                    {log.action}
                  </Badge>
                  <span className="text-xs text-th-text-muted">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 text-sm text-th-text">
                  {log.users?.name ?? t('auditLogs.system')}
                </p>
                <p className="mt-1 text-xs text-th-text-secondary">
                  {log.resource_type}
                  {log.resource_id && (
                    <span className="ml-1 text-th-text-muted">{log.resource_id.substring(0, 8)}...</span>
                  )}
                </p>
              </div>
            )
          })
        )}
      </div>

      {/* Desktop: table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-th-border bg-th-bg-tertiary">
                <th className="px-4 py-3.5 text-xs font-semibold text-th-text-tertiary">{t('auditLogs.time')}</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-th-text-tertiary">{t('auditLogs.user')}</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-th-text-tertiary">{t('auditLogs.action')}</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-th-text-tertiary">{t('auditLogs.entity')}</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-th-text-tertiary">{t('common.details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-th-border">
              {(!logs || logs.length === 0) ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-th-text-muted">
                    {t('auditLogs.noLogs')}
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const variant = ACTION_VARIANTS[log.action as keyof typeof ACTION_VARIANTS] ?? 'default'

                  return (
                    <tr key={log.id} className="bg-surface-card transition-colors hover:bg-th-bg-hover">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-th-text-muted">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-th-text">
                        {log.users?.name ?? t('auditLogs.system')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={variant as 'default' | 'success' | 'warning' | 'danger' | 'info'}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-th-text">
                        {log.resource_type}
                        {log.resource_id && (
                          <span className="ml-1 text-xs text-th-text-muted">
                            {log.resource_id.substring(0, 8)}...
                          </span>
                        )}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-xs text-th-text-muted">
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/audit-logs?page=${p}${actionFilter ? `&action=${actionFilter}` : ''}`}
              className={`rounded-md px-3 py-1.5 text-sm ${p === page ? 'bg-th-accent text-white' : 'text-th-text-secondary hover:bg-th-bg-hover'}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
