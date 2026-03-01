import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_REPORTS } from '@/lib/demo/data'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import type { ViolationCode } from '@/constants/violations'
import type { ReportStatus } from '@/types/reports'

type ReportData = {
  id: string
  listing_id: string
  status: string
  user_violation_type: string
  ai_violation_type: string | null
  ai_confidence_score: number | null
  confirmed_violation_type: string | null
  disagreement_flag: boolean
  draft_title: string | null
  draft_body: string | null
  rejection_reason: string | null
  sc_case_id: string | null
  created_at: string
  approved_at: string | null
  rejected_at: string | null
}

type ListingInfo = {
  asin: string
  title: string
  marketplace: string
  seller_name: string | null
}

const ReportDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params

  let report: ReportData | null = null
  let listing: ListingInfo | null = null
  let creator: { name: string; email: string } | null = null

  if (isDemoMode()) {
    const found = DEMO_REPORTS.find((r) => r.id === id)
    if (!found) notFound()
    report = found as unknown as ReportData
    listing = found.listings as ListingInfo
    creator = found.users
  } else {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('reports')
      .select(
        '*, listings!reports_listing_id_fkey(asin, title, marketplace, seller_name), users!reports_created_by_fkey(name, email)',
      )
      .eq('id', id)
      .single()

    if (error || !data) notFound()
    report = data as unknown as ReportData
    listing = data.listings as unknown as ListingInfo | null
    creator = data.users as unknown as { name: string; email: string } | null
  }

  if (!report) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/reports" className="text-th-text-muted hover:text-th-text-secondary">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-th-text">Report Detail</h1>
        <StatusBadge status={report.status as ReportStatus} type="report" />
      </div>

      {/* Violation Info */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-th-text">Violation Information</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-th-text-tertiary">User Violation Type</p>
              <div className="mt-1">
                <ViolationBadge code={report.user_violation_type as ViolationCode} />
              </div>
            </div>
            {report.ai_violation_type && (
              <div>
                <p className="text-sm text-th-text-tertiary">AI Violation Type</p>
                <div className="mt-1 flex items-center gap-2">
                  <ViolationBadge code={report.ai_violation_type as ViolationCode} />
                  {report.ai_confidence_score !== null && (
                    <span className="text-sm text-th-text-muted">{report.ai_confidence_score}%</span>
                  )}
                </div>
              </div>
            )}
          </div>
          {report.disagreement_flag && (
            <div className="rounded-lg border border-st-warning-text/30 bg-st-warning-bg px-4 py-3">
              <p className="text-sm font-medium text-st-warning-text">
                AI와 사용자 의견이 불일치합니다. Editor/Admin이 최종 판정을 확정해 주세요.
              </p>
            </div>
          )}
          {report.confirmed_violation_type && (
            <div>
              <p className="text-sm text-th-text-tertiary">Confirmed Violation Type</p>
              <div className="mt-1">
                <ViolationBadge code={report.confirmed_violation_type as ViolationCode} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Listing Info */}
      {listing && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-th-text">Listing</h2>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-th-text-tertiary">ASIN</dt>
                <dd className="mt-1 text-sm font-medium text-th-text">{listing.asin}</dd>
              </div>
              <div>
                <dt className="text-sm text-th-text-tertiary">Marketplace</dt>
                <dd className="mt-1 text-sm font-medium text-th-text">{listing.marketplace}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm text-th-text-tertiary">Title</dt>
                <dd className="mt-1 text-sm font-medium text-th-text">{listing.title}</dd>
              </div>
              {listing.seller_name && (
                <div>
                  <dt className="text-sm text-th-text-tertiary">Seller</dt>
                  <dd className="mt-1 text-sm font-medium text-th-text">{listing.seller_name}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Draft */}
      {report.draft_title && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-th-text">Report Draft</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-th-text-tertiary">Title</p>
              <p className="mt-1 text-sm font-medium text-th-text">{report.draft_title}</p>
            </div>
            {report.draft_body && (
              <div>
                <p className="text-sm text-th-text-tertiary">Body</p>
                <div className="mt-1 rounded-lg bg-th-bg-tertiary p-4 text-sm text-th-text-secondary whitespace-pre-wrap">
                  {report.draft_body}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Meta */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-th-text">Report History</h2>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-th-text-tertiary">Created By</dt>
              <dd className="mt-1 text-sm font-medium text-th-text">{creator?.name ?? 'Unknown'}</dd>
            </div>
            <div>
              <dt className="text-sm text-th-text-tertiary">Created At</dt>
              <dd className="mt-1 text-sm font-medium text-th-text">
                {new Date(report.created_at).toLocaleString('ko-KR')}
              </dd>
            </div>
            {report.approved_at && (
              <div>
                <dt className="text-sm text-th-text-tertiary">Approved At</dt>
                <dd className="mt-1 text-sm font-medium text-th-text">
                  {new Date(report.approved_at).toLocaleString('ko-KR')}
                </dd>
              </div>
            )}
            {report.rejected_at && (
              <>
                <div>
                  <dt className="text-sm text-th-text-tertiary">Rejected At</dt>
                  <dd className="mt-1 text-sm font-medium text-th-text">
                    {new Date(report.rejected_at).toLocaleString('ko-KR')}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-sm text-th-text-tertiary">Rejection Reason</dt>
                  <dd className="mt-1 text-sm text-st-danger-text">{report.rejection_reason}</dd>
                </div>
              </>
            )}
            {report.sc_case_id && (
              <div>
                <dt className="text-sm text-th-text-tertiary">SC Case ID</dt>
                <dd className="mt-1 text-sm font-medium text-th-text">{report.sc_case_id}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

export default ReportDetailPage
