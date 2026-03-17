import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { buildBrSubmitData } from '@/lib/reports/br-data'
import { isBrSubmittable, type BrFormTypeCode } from '@/constants/br-form-types'

// POST /api/reports/:id/force-resubmit — 강제 재제출 (BR)
// query param: ?track=br (default: br)
export const POST = withAuth(async (req) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 2]

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID required' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('id, status, user_violation_type, br_form_type, draft_body, draft_title, draft_subject, draft_evidence, listing_id, resubmit_count')
    .eq('id', id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Report not found' } },
      { status: 404 },
    )
  }

  // unresolved 외에 monitoring, done 상태에서도 BR 재신고 허용
  const allowedStatuses = ['approved', 'unresolved', 'monitoring', 'done']
  if (!allowedStatuses.includes(report.status)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: `Cannot resubmit from status: ${report.status}` } },
      { status: 400 },
    )
  }

  const { data: listing } = await supabase
    .from('listings')
    .select('asin, marketplace, title')
    .eq('id', report.listing_id)
    .single()

  const updateData: Record<string, unknown> = {
    resubmit_count: (report.resubmit_count ?? 0) + 1,
    last_resubmit_at: new Date().toISOString(),
  }

  // BR track
  const brFormType = (report.br_form_type ?? 'other_policy') as BrFormTypeCode
  if (isBrSubmittable(brFormType)) {
    const brSubmitData = listing
      ? buildBrSubmitData({
          report: {
            id,
            br_form_type: brFormType,
            draft_body: report.draft_body,
            draft_title: report.draft_title,
            draft_subject: report.draft_subject,
          },
          listing: {
            asin: listing.asin,
            url: null,
            marketplace: listing.marketplace,
            seller_storefront_url: null,
          },
        })
      : null

    updateData.status = 'br_submitting'
    updateData.br_submit_data = brSubmitData
    updateData.br_submit_attempts = 0
    updateData.br_submission_error = null
  } else {
    updateData.status = 'monitoring'
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

  return NextResponse.json({ status: updateData.status })
}, ['owner', 'admin'])
