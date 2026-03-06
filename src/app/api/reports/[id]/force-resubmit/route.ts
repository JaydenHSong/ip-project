import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { buildScSubmitData } from '@/lib/reports/sc-data'

// POST /api/reports/:id/force-resubmit — 강제 재제출
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
    .select('id, status, user_violation_type, draft_body, draft_evidence, listing_id, resubmit_count')
    .eq('id', id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Report not found' } },
      { status: 404 },
    )
  }

  if (report.status !== 'unresolved') {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Only unresolved reports can be force-resubmitted' } },
      { status: 400 },
    )
  }

  const { data: listing } = await supabase
    .from('listings')
    .select('asin, marketplace, title')
    .eq('id', report.listing_id)
    .single()

  const scSubmitData = listing
    ? buildScSubmitData({
        report: {
          id,
          user_violation_type: report.user_violation_type,
          draft_body: report.draft_body,
          draft_evidence: report.draft_evidence as { type: string; url: string; description: string }[] | undefined,
        },
        listing,
      })
    : null

  const { error } = await supabase
    .from('reports')
    .update({
      status: 'sc_submitting',
      sc_submit_data: scSubmitData,
      sc_submit_attempts: 0,
      sc_submission_error: null,
      resubmit_count: (report.resubmit_count ?? 0) + 1,
      last_resubmit_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ status: 'sc_submitting' })
}, ['owner', 'admin'])
