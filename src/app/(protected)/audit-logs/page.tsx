import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_AUDIT_LOGS } from '@/lib/demo/data'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'

const ACTION_VARIANTS = {
  create: 'success',
  update: 'info',
  delete: 'danger',
  approve: 'success',
  reject: 'warning',
  login: 'default',
  logout: 'default',
} as const

const AuditLogsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; entity_type?: string }>
}) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin') redirect('/dashboard')

  const params = await searchParams
  const page = Number(params.page) || 1
  const limit = 50

  let logs: typeof DEMO_AUDIT_LOGS | null = null
  let totalPages = 1

  if (isDemoMode()) {
    let filtered = [...DEMO_AUDIT_LOGS]
    if (params.action) filtered = filtered.filter((l) => l.action === params.action)
    if (params.entity_type) filtered = filtered.filter((l) => l.entity_type === params.entity_type)
    logs = filtered
    totalPages = 1
  } else {
    const offset = (page - 1) * limit
    const supabase = await createClient()

    let query = supabase
      .from('audit_logs')
      .select('*, users!audit_logs_user_id_fkey(name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (params.action) {
      query = query.eq('action', params.action)
    }
    if (params.entity_type) {
      query = query.eq('entity_type', params.entity_type)
    }

    const { data, count } = await query
    logs = data as typeof DEMO_AUDIT_LOGS | null
    totalPages = Math.ceil((count ?? 0) / limit)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-th-text">Audit Logs</h1>

      <div className="flex gap-2">
        <Link
          href="/audit-logs"
          className={`rounded-lg px-3 py-1.5 text-sm ${!params.action ? 'bg-th-accent-soft text-th-accent-text' : 'text-th-text-tertiary hover:bg-th-bg-hover'}`}
        >
          All
        </Link>
        {['create', 'update', 'delete', 'approve', 'reject'].map((a) => (
          <Link
            key={a}
            href={`/audit-logs?action=${a}`}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize ${params.action === a ? 'bg-th-accent-soft text-th-accent-text' : 'text-th-text-tertiary hover:bg-th-bg-hover'}`}
          >
            {a}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-th-border bg-th-bg-tertiary">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">Time</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">User</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">Action</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">Entity</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-th-border">
              {(!logs || logs.length === 0) ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-th-text-muted">
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const logUser = log.users as { name: string; email: string } | null
                  const variant = ACTION_VARIANTS[log.action as keyof typeof ACTION_VARIANTS] ?? 'default'

                  return (
                    <tr key={log.id} className="bg-surface-card transition-colors hover:bg-th-bg-hover">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-th-text-muted">
                        {new Date(log.created_at).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-th-text">
                        {logUser?.name ?? 'System'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={variant as 'default' | 'success' | 'warning' | 'danger' | 'info'}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-th-text">
                        {log.entity_type}
                        {log.entity_id && (
                          <span className="ml-1 text-xs text-th-text-muted">
                            {(log.entity_id as string).substring(0, 8)}...
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
              href={`/audit-logs?page=${p}${params.action ? `&action=${params.action}` : ''}`}
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

export default AuditLogsPage
