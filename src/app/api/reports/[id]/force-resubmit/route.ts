import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { buildPdSubmitData } from '@/lib/reports/pd-data'
import { buildBrSubmitData, isBrReportable } from '@/lib/reports/br-data'

// POST /api/reports/:id/force-resubmit — 강제 재제출 (SC + BR)
// query param: ?track=sc|br|both (default: both)
export const POST = withAuth(async (req) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 2]
  const track = req.nextUrl.searchParams.get('track') ?? 'both'

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID required' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('id, status, user_violation_type, draft_body, draft_title, draft_evidence, listing_id, resubmit_count')
    .eq('id', id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Report not found' } },
      { status: 404 },
    )
  }

  // unresolved 외에 monitoring, done 상태에서도 BR 재신고 허용
  const allowedStatuses = ['unresolved', 'monitoring', 'done']
  if (!allowedStatuses.includes(report.status)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: `Cannot resubmit from status: ${report.status}` } },
      { status: 400 },
    )
  }

  const { data: listing } = await supabase
    .from('listings')
    .select('asin, marketplace, title, url, seller_storefront_url')
    .eq('id', report.listing_id)
    .single()

  const updateData: Record<string, unknown> = {
    resubmit_count: (report.resubmit_count ?? 0) + 1,
    last_resubmit_at: new Date().toISOString(),
  }

  // PD track
  if (track === 'pd' || track === 'both') {
    const pdSubmitData = listing
      ? buildPdSubmitData({
          report: {
            id,
            user_violation_type: report.user_violation_type,
            draft_body: report.draft_body,
            draft_evidence: report.draft_evidence as { type: string; url: string; description: string }[] | undefined,
          },
          listing,
        })
      : null

    updateData.status = 'pd_submitting'
    updateData.pd_submit_data = pdSubmitData
    updateData.pd_submit_attempts = 0
    updateData.pd_submission_error = null
  }

  // BR track (BR-only resubmit or both)
  if ((track === 'br' || track === 'both') && isBrReportable(report.user_violation_type)) {
    const brSubmitData = listing
      ? buildBrSubmitData({
          report: {
            id,
            user_violation_type: report.user_violation_type,
            draft_body: report.draft_body,
            draft_title: report.draft_title,
          },
          listing: {
            asin: listing.asin,
            url: listing.url,
            marketplace: listing.marketplace,
            seller_storefront_url: listing.seller_storefront_url,
          },
        })
      : null

    updateData.br_submit_data = brSubmitData
    updateData.br_submit_attempts = 0
    updateData.br_submission_error = null

    // BR-only resubmit: 바로 br_submitting으로
    if (track === 'br') {
      updateData.status = 'br_submitting'
    }
  }

  const { error } = await supabase
    .from('reports')
    .update(updateData)
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ status: updateData.status, track })
}, ['owner', 'admin'])
