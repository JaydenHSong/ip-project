import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { buildBrSubmitData } from '@/lib/reports/br-data'
import { isBrSubmittable, type BrFormTypeCode } from '@/constants/br-form-types'

type BulkApproveRequest = {
  report_ids: string[]
}

// POST /api/reports/bulk-approve — 일괄 승인 → BR 대상이면 br_submitting, 아니면 monitoring
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
    .select('id, status, user_violation_type, br_form_type, draft_body, draft_evidence, listing_id')
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

  // Listing 정보 일괄 조회 (null listing_id 제외)
  const listingIds = [...new Set(validReports.map((r) => r.listing_id).filter(Boolean))] as string[]
  const { data: listings } = await supabase
    .from('listings')
    .select('id, asin, marketplace, title')
    .in('id', listingIds)

  const listingMap = new Map((listings ?? []).map((l) => [l.id, l]))

  let successCount = 0
  let failCount = 0

  for (const report of validReports) {
    const listing = listingMap.get(report.listing_id)
    const brFormType = (report.br_form_type ?? 'other_policy') as BrFormTypeCode
    const brReportable = isBrSubmittable(brFormType)

    const brSubmitData = listing && brReportable
      ? buildBrSubmitData({
          report: {
            id: report.id,
            br_form_type: brFormType,
            draft_body: report.draft_body,
            draft_title: null,
          },
          listing: { asin: listing.asin, url: null, marketplace: listing.marketplace, seller_storefront_url: null },
        })
      : null

    const { error } = await supabase
      .from('reports')
      .update({
        status: brReportable ? 'br_submitting' : 'monitoring',
        approved_by: authUser!.id,
        approved_at: now,
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
