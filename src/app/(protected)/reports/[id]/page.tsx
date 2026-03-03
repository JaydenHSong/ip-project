import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, hasRole } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_REPORTS, buildDemoTimeline } from '@/lib/demo/data'
import { DEMO_SNAPSHOTS, DEMO_MONITORING_REPORTS } from '@/lib/demo/monitoring'
import { buildTimelineEvents } from '@/lib/timeline'
import { ReportDetailContent } from './ReportDetailContent'
import type { TimelineEvent } from '@/types/reports'
import type { ReportSnapshot } from '@/types/monitoring'

type ReportData = {
  id: string
  listing_id: string
  status: string
  user_violation_type: string
  ai_violation_type: string | null
  ai_confidence_score: number | null
  ai_severity: string | null
  ai_analysis: {
    violation_detected: boolean
    confidence: number
    reasons: string[]
    evidence: { type: string; location: string; description: string }[]
  } | null
  policy_references: string[]
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
  // Monitoring fields
  monitoring_started_at: string | null
  resolved_at: string | null
  resolution_type: string | null
}

type ListingInfo = {
  asin: string
  title: string
  marketplace: string
  seller_name: string | null
  brand: string | null
  rating: number | null
  review_count: number | null
  price_amount: number | null
  price_currency: string
}

const ReportDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params

  let report: ReportData | null = null
  let listing: ListingInfo | null = null
  let creator: { name: string; email: string } | null = null
  let timeline: TimelineEvent[] = []
  let snapshots: ReportSnapshot[] = []

  if (isDemoMode()) {
    // Check monitoring reports first, then regular reports
    const monitoringFound = DEMO_MONITORING_REPORTS.find((r) => r.id === id)
    const found = monitoringFound ?? DEMO_REPORTS.find((r) => r.id === id)
    if (!found) notFound()
    report = found as unknown as ReportData
    listing = found.listings as ListingInfo
    creator = found.users
    timeline = buildDemoTimeline(found as unknown as (typeof DEMO_REPORTS)[number])
    snapshots = DEMO_SNAPSHOTS[id] ?? []
  } else {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('reports')
      .select(
        '*, listings!reports_listing_id_fkey(asin, title, marketplace, seller_name, brand, rating, review_count, price_amount, price_currency), users!reports_created_by_fkey(name, email)',
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
        monitoring_started_at: report.monitoring_started_at,
        resolved_at: report.resolved_at,
        resolution_type: report.resolution_type,
      },
      {
        creator: creator?.name ?? null,
        approver: null,
        rejector: null,
        canceller: null,
        editor: null,
      },
    )

    // Fetch snapshots for monitoring reports
    if (['monitoring', 'resolved', 'unresolved'].includes(report.status)) {
      const { data: snapshotData } = await supabase
        .from('report_snapshots')
        .select('*')
        .eq('report_id', id)
        .order('crawled_at', { ascending: true })

      snapshots = (snapshotData ?? []) as unknown as ReportSnapshot[]
    }
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
      snapshots={snapshots}
      monitoringStartedAt={report.monitoring_started_at}
    />
  )
}

export default ReportDetailPage
