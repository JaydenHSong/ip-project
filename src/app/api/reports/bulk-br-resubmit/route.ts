import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildBrSubmitData, isBrReportable } from '@/lib/reports/br-data'

// POST /api/reports/bulk-br-resubmit — BR 일괄 재신고
export const POST = withAuth(async (req, { user }) => {
  const { report_ids } = (await req.json()) as { report_ids: string[] }

  if (!report_ids?.length) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'report_ids required' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const { data: reports, error: fetchError } = await supabase
    .from('reports')
    .select('id, status, user_violation_type, draft_body, draft_title, listing_id, resubmit_count')
    .in('id', report_ids)
    .in('status', ['monitoring', 'resolved', 'unresolved'])

  if (fetchError || !reports) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: fetchError?.message ?? 'Fetch failed' } },
      { status: 500 },
    )
  }

  let submitted = 0
  let skipped = 0

  for (const report of reports) {
    if (!isBrReportable(report.user_violation_type)) {
      skipped++
      continue
    }

    const { data: listing } = await supabase
      .from('listings')
      .select('asin, url, marketplace, seller_storefront_url')
      .eq('id', report.listing_id)
      .single()

    const brSubmitData = listing
      ? buildBrSubmitData({
          report: {
            id: report.id,
            user_violation_type: report.user_violation_type,
            draft_body: report.draft_body,
            draft_title: report.draft_title,
          },
          listing,
        })
      : null

    if (!brSubmitData) {
      skipped++
      continue
    }

    await supabase
      .from('reports')
      .update({
        status: 'br_submitting',
        br_submit_data: brSubmitData,
        br_submit_attempts: 0,
        br_submission_error: null,
        resubmit_count: (report.resubmit_count ?? 0) + 1,
        last_resubmit_at: new Date().toISOString(),
      })
      .eq('id', report.id)

    submitted++
  }

  // audit log
  const adminDb = createAdminClient()
  void adminDb.from('audit_logs').insert({
    user_id: user.id,
    action: 'bulk_br_resubmit',
    resource_type: 'report',
    details: { submitted, skipped, total: report_ids.length, report_ids },
  })

  return NextResponse.json({ submitted, skipped, total: report_ids.length })
}, ['owner', 'admin'])
