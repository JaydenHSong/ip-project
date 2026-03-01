import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_REPORTS } from '@/lib/demo/data'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import { Badge } from '@/components/ui/Badge'
import type { ReportStatus } from '@/types/reports'
import type { ViolationCode } from '@/constants/violations'

const ReportsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    status?: string
    violation_type?: string
    disagreement?: string
  }>
}) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const page = Number(params.page) || 1
  const limit = 20

  let reports: typeof DEMO_REPORTS | null = null
  let totalPages = 1

  if (isDemoMode()) {
    let filtered = [...DEMO_REPORTS]
    if (params.status) filtered = filtered.filter((r) => r.status === params.status)
    if (params.violation_type) filtered = filtered.filter((r) => r.violation_type === params.violation_type)
    if (params.disagreement === 'true') filtered = filtered.filter((r) => r.disagreement_flag)
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
      .in('status', ['draft', 'pending_review', 'approved', 'rejected'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (params.status) {
      query = query.eq('status', params.status)
    }
    if (params.violation_type) {
      query = query.eq('violation_type', params.violation_type)
    }
    if (params.disagreement === 'true') {
      query = query.eq('disagreement_flag', true)
    }

    const { data, count } = await query
    reports = data as typeof DEMO_REPORTS | null
    totalPages = Math.ceil((count ?? 0) / limit)
  }

  const STATUS_TABS = [
    { value: '', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending_review', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-th-text">Report Queue</h1>
        <Link
          href={`/reports?${params.disagreement === 'true' ? '' : 'disagreement=true'}`}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
            params.disagreement === 'true'
              ? 'border-st-warning-text/30 bg-st-warning-bg text-st-warning-text'
              : 'border-th-border text-th-text-tertiary hover:bg-th-bg-hover'
          }`}
        >
          Disagreement Only
        </Link>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/reports${tab.value ? `?status=${tab.value}` : ''}`}
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
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">Seller</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">AI</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">Status</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {(!reports || reports.length === 0) ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-th-text-muted">
                  No reports found.
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
                      <div className="flex items-center gap-2">
                        <ViolationBadge code={report.violation_type as ViolationCode} showLabel={false} />
                        {report.disagreement_flag && (
                          <Badge variant="warning">!</Badge>
                        )}
                      </div>
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
                    <td className="px-4 py-3 text-th-text-secondary">
                      {listing?.seller_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-th-text-muted">
                      {report.ai_confidence_score !== null ? `${report.ai_confidence_score}%` : '—'}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/reports?page=${p}${params.status ? `&status=${params.status}` : ''}${params.disagreement ? '&disagreement=true' : ''}`}
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

export default ReportsPage
