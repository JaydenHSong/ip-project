import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { buildScSubmitData } from '@/lib/reports/sc-data'
import { buildBrSubmitData, isBrReportable } from '@/lib/reports/br-data'

type BulkSubmitRequest = {
  report_ids: string[]
  action: 'submit_review' | 'submit_sc'
}

// POST /api/reports/bulk-submit — 일괄 Submit (Review 또는 SC)
export const POST = withAuth(async (req, { user }) => {
  const body = (await req.json()) as BulkSubmitRequest

  if (!body.report_ids?.length || !body.action) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'report_ids and action required' } },
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
  const now = new Date().toISOString()

  // action에 따라 대상 상태 결정
  const expectedStatus = body.action === 'submit_review' ? 'draft' : 'approved'
  const targetStatus = body.action === 'submit_review' ? 'pending_review' : 'sc_submitting'

  const { data: reports, error: fetchError } = await supabase
    .from('reports')
    .select('id, status, user_violation_type, draft_body, draft_evidence, listing_id')
    .in('id', body.report_ids)
    .eq('status', expectedStatus)

  if (fetchError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: fetchError.message } },
      { status: 500 },
    )
  }

  const validReports = reports ?? []
  const skippedCount = body.report_ids.length - validReports.length

  // SC submit인 경우 listing 정보 필요
  let listingMap = new Map<string, { id: string; asin: string; marketplace: string; title: string; url: string | null }>()
  if (body.action === 'submit_sc') {
    const listingIds = [...new Set(validReports.map((r) => r.listing_id))]
    const { data: listings } = await supabase
      .from('listings')
      .select('id, asin, marketplace, title, url')
      .in('id', listingIds)
    listingMap = new Map((listings ?? []).map((l) => [l.id, l]))
  }

  let submitted = 0
  const errors: { id: string; reason: string }[] = []

  for (const report of validReports) {
    const updates: Record<string, unknown> = { status: targetStatus }

    if (body.action === 'submit_sc') {
      const listing = listingMap.get(report.listing_id)
      updates.approved_by = user.id
      updates.approved_at = now
      if (listing) {
        updates.sc_submit_data = buildScSubmitData({
          report: {
            id: report.id,
            user_violation_type: report.user_violation_type,
            draft_body: report.draft_body,
            draft_evidence: report.draft_evidence as { type: string; url: string; description: string }[] | undefined,
          },
          listing,
        })
        if (isBrReportable(report.user_violation_type)) {
          updates.br_submit_data = buildBrSubmitData({
            report: {
              id: report.id,
              user_violation_type: report.user_violation_type,
              draft_body: report.draft_body,
              draft_title: null,
            },
            listing: { asin: listing.asin, url: listing.url ?? null, marketplace: listing.marketplace },
          })
        }
      }
    }

    const { error } = await supabase
      .from('reports')
      .update(updates)
      .eq('id', report.id)

    if (error) {
      errors.push({ id: report.id, reason: error.message })
    } else {
      submitted++
    }
  }

  return NextResponse.json({
    submitted,
    failed: errors.length,
    skipped: skippedCount,
    errors,
    total: body.report_ids.length,
  })
}, ['owner', 'admin', 'editor'])
