import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { buildBrSubmitData, type BrExtraFields } from '@/lib/reports/br-data'
import { parseReportNote } from '@/lib/reports/report-note'
import { isBrSubmittable, type BrFormTypeCode } from '@/constants/br-form-types'

// POST /api/reports/:id/force-resubmit — 강제 재제출 (BR)
// query param: ?track=br (default: br)
export const POST = withAuth(async (req, { params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID required' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('id, status, user_violation_type, br_form_type, draft_body, draft_title, draft_subject, draft_evidence, listing_id, resubmit_count, br_submit_data, note')
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
    // extraFields 복원: 1순위 br_submit_data, 2순위 note(Extension 데이터)
    const prev = report.br_submit_data as Record<string, unknown> | null
    const extraFields: Record<string, unknown> = {}
    if (prev?.review_urls) extraFields.review_urls = prev.review_urls
    if (prev?.asins) extraFields.asins = prev.asins
    if (prev?.order_id) extraFields.order_id = prev.order_id
    if (prev?.seller_storefront_url) extraFields.seller_storefront_url = prev.seller_storefront_url
    if (prev?.policy_url) extraFields.policy_url = prev.policy_url
    if (prev?.product_urls) extraFields.product_urls = prev.product_urls

    // note fallback: br_submit_data에 review_urls가 없거나 상품 URL만 있으면 note에서 보충
    if (!extraFields.review_urls && report.note) {
      const noteData = parseReportNote(report.note).data
      if (noteData) {
        if (typeof noteData.review_urls === 'string') {
          extraFields.review_urls = noteData.review_urls.split('\n').map((u: string) => u.trim()).filter(Boolean)
        } else if (Array.isArray(noteData.review_urls)) {
          extraFields.review_urls = noteData.review_urls.map((u) => String(u).trim()).filter(Boolean)
        }
        if (!extraFields.asins && typeof noteData.asins === 'string') {
          extraFields.asins = noteData.asins.split(/[,;\n]/).map((a: string) => a.trim()).filter(Boolean)
        } else if (!extraFields.asins && Array.isArray(noteData.asins)) {
          extraFields.asins = noteData.asins.map((asin) => String(asin).trim()).filter(Boolean)
        }
        if (!extraFields.order_id && noteData.order_id) extraFields.order_id = noteData.order_id
      }
    }

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
          extraFields: Object.keys(extraFields).length > 0 ? extraFields as BrExtraFields : undefined,
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
