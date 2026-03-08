import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { buildScSubmitData } from '@/lib/reports/sc-data'
import { buildBrSubmitData, isBrReportable } from '@/lib/reports/br-data'

type BulkApproveRequest = {
  report_ids: string[]
}

// POST /api/reports/bulk-approve — 일괄 승인 → sc_submitting
export const POST = withAuth(async (req) => {
  const body = (await req.json()) as BulkApproveRequest

  if (!body.report_ids?.length) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'report_ids required' } },
      { status: 400 },
    )
  }

  if (body.report_ids.length > 50) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Max 50 reports per batch' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const now = new Date().toISOString()

  // pending_review 상태인 리포트만 조회
  const { data: reports, error: fetchError } = await supabase
    .from('reports')
    .select('id, status, user_violation_type, draft_body, draft_evidence, listing_id')
    .in('id', body.report_ids)
    .eq('status', 'pending_review')

  if (fetchError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: fetchError.message } },
      { status: 500 },
    )
  }

  const validReports = reports ?? []
  const skippedCount = body.report_ids.length - validReports.length

  // Listing 정보 일괄 조회
  const listingIds = [...new Set(validReports.map((r) => r.listing_id))]
  const { data: listings } = await supabase
    .from('listings')
    .select('id, asin, marketplace, title, url')
    .in('id', listingIds)

  const listingMap = new Map((listings ?? []).map((l) => [l.id, l]))

  let successCount = 0
  let failCount = 0

  for (const report of validReports) {
    const listing = listingMap.get(report.listing_id)
    const scSubmitData = listing
      ? buildScSubmitData({
          report: {
            id: report.id,
            user_violation_type: report.user_violation_type,
            draft_body: report.draft_body,
            draft_evidence: report.draft_evidence as { type: string; url: string; description: string }[] | undefined,
          },
          listing,
        })
      : null

    const brSubmitData = listing && isBrReportable(report.user_violation_type)
      ? buildBrSubmitData({
          report: {
            id: report.id,
            user_violation_type: report.user_violation_type,
            draft_body: report.draft_body,
            draft_title: null,
          },
          listing: { asin: listing.asin, url: listing.url ?? null, marketplace: listing.marketplace },
        })
      : null

    const { error } = await supabase
      .from('reports')
      .update({
        status: 'sc_submitting',
        approved_by: authUser!.id,
        approved_at: now,
        sc_submit_data: scSubmitData,
        br_submit_data: brSubmitData,
      })
      .eq('id', report.id)

    if (error) {
      failCount++
    } else {
      successCount++
    }
  }

  return NextResponse.json({
    approved: successCount,
    failed: failCount,
    skipped: skippedCount,
    total: body.report_ids.length,
  })
}, ['owner', 'admin', 'editor'])
