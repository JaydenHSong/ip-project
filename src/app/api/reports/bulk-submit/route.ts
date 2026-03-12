import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

type BulkSubmitRequest = {
  report_ids: string[]
  action: 'submit_review'
}

// POST /api/reports/bulk-submit — 일괄 Submit (Review 전송)
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

  const { data: reports, error: fetchError } = await supabase
    .from('reports')
    .select('id, status')
    .in('id', body.report_ids)
    .eq('status', 'draft')

  if (fetchError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: fetchError.message } },
      { status: 500 },
    )
  }

  const validReports = reports ?? []
  const skippedCount = body.report_ids.length - validReports.length

  let submitted = 0
  const errors: { id: string; reason: string }[] = []

  for (const report of validReports) {
    const { error } = await supabase
      .from('reports')
      .update({ status: 'pending_review' })
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
