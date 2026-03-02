import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, hasRole } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_REPORTS, buildDemoTimeline } from '@/lib/demo/data'
import { buildTimelineEvents } from '@/lib/timeline'
import { ReportDetailContent } from './ReportDetailContent'
import type { TimelineEvent } from '@/types/reports'

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
  // Timeline fields
  edited_at: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancellation_reason: string | null
  sc_submitted_at: string | null
  rejected_by: string | null
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
  let timeline: TimelineEvent[] = []

  if (isDemoMode()) {
    const found = DEMO_REPORTS.find((r) => r.id === id)
    if (!found) notFound()
    report = found as unknown as ReportData
    listing = found.listings as ListingInfo
    creator = found.users
    timeline = buildDemoTimeline(found)
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

    timeline = buildTimelineEvents(
      {
        created_at: report.created_at,
        ai_violation_type: report.ai_violation_type,
        ai_confidence_score: report.ai_confidence_score,
        disagreement_flag: report.disagreement_flag,
        user_violation_type: report.user_violation_type,
        status: report.status,
        edited_at: report.edited_at,
        approved_at: report.approved_at,
        rejected_at: report.rejected_at,
        rejected_by: report.rejected_by,
        rejection_reason: report.rejection_reason,
        cancelled_at: report.cancelled_at,
        cancelled_by: report.cancelled_by,
        cancellation_reason: report.cancellation_reason,
        sc_case_id: report.sc_case_id,
        sc_submitted_at: report.sc_submitted_at,
      },
      {
        creator: creator?.name ?? null,
        approver: null,
        rejector: null,
        canceller: null,
        editor: null,
      },
    )
  }

  if (!report) notFound()

  const canEdit = hasRole(user, 'editor')

  return (
    <ReportDetailContent
      report={report}
      listing={listing}
      creatorName={creator?.name ?? null}
      canEdit={canEdit}
      userRole={user.role}
      timeline={timeline}
    />
  )
}

export default ReportDetailPage
