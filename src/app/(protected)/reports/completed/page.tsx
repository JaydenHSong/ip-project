import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_REPORTS } from '@/lib/demo/data'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import type { ReportStatus } from '@/types/reports'
import type { ViolationCode } from '@/constants/violations'

const COMPLETED_STATUSES = ['submitted', 'monitoring', 'resolved', 'unresolved', 'resubmitted', 'escalated']

const CompletedReportsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const page = Number(params.page) || 1
  const limit = 20

  let reports: typeof DEMO_REPORTS | null = null
  let totalPages = 1

  if (isDemoMode()) {
    let filtered = DEMO_REPORTS.filter((r) => COMPLETED_STATUSES.includes(r.status))
    if (params.status) filtered = filtered.filter((r) => r.status === params.status)
    reports = filtered
    totalPages = 1
  } else {
    const offset = (page - 1) * limit
    const supabase = await createClient()

    let query = supabase
      .from('reports')
      .select(
        '*, listings!reports_listing_id_fkey(asin, title, marketplace, seller_name), users!reports_created_by_fkey(name)',
        { count: 'exact' },
      )
      .in('status', params.status ? [params.status] : COMPLETED_STATUSES)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, count } = await query
    reports = data as typeof DEMO_REPORTS | null
    totalPages = Math.ceil((count ?? 0) / limit)
  }

  const STATUS_TABS = [
    { value: '', label: 'All' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'monitoring', label: 'Monitoring' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'unresolved', label: 'Unresolved' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-th-text">Completed Reports</h1>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/reports/completed${tab.value ? `?status=${tab.value}` : ''}`}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
              (params.status ?? '') === tab.value
                ? 'bg-th-accent-soft text-th-accent-text'
                : 'text-th-text-tertiary hover:bg-th-bg-hover'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-th-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-th-border bg-th-bg-tertiary">
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">Violation</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">ASIN</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">Title</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">SC Case</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">Status</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {(!reports || reports.length === 0) ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-th-text-muted">
                  No completed reports yet.
                </td>
              </tr>
            ) : (
              reports.map((report) => {
                const listing = report.listings as {
                  asin: string; title: string; marketplace: string; seller_name: string | null
                } | null

                return (
                  <tr
                    key={report.id}
                    className="bg-surface-card transition-colors hover:bg-th-bg-hover"
                  >
                    <td className="px-4 py-3">
                      <ViolationBadge code={report.violation_type as ViolationCode} showLabel={false} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/reports/${report.id}`}
                        className="font-mono text-th-text hover:text-th-accent-text"
                      >
                        {listing?.asin ?? '—'}
                      </Link>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-th-text-secondary">
                      {listing?.title ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-th-text-muted">
                      {(report as unknown as { sc_case_id: string | null }).sc_case_id ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={report.status as ReportStatus} type="report" />
                    </td>
                    <td className="px-4 py-3 text-th-text-muted">
                      {new Date(report.created_at).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CompletedReportsPage
