import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// POST /api/reports/bulk-archive — 일괄 아카이브
export const POST = withAuth(async (req) => {
  const { report_ids, reason } = (await req.json()) as { report_ids: string[]; reason?: string }

  if (!report_ids?.length) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'report_ids required' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const { data: reports, error: fetchError } = await supabase
    .from('reports')
    .select('id, status')
    .in('id', report_ids)
    .in('status', ['resolved', 'unresolved', 'monitoring', 'done'])

  if (fetchError || !reports) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: fetchError?.message ?? 'Fetch failed' } },
      { status: 500 },
    )
  }

  const validIds = reports.map((r) => r.id)

  if (validIds.length === 0) {
    return NextResponse.json({ archived: 0, skipped: report_ids.length })
  }

  const { error: updateError } = await supabase
    .from('reports')
    .update({
      status: 'archived',
      archive_reason: reason ?? 'bulk_archive',
      archived_at: new Date().toISOString(),
    })
    .in('id', validIds)

  if (updateError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: updateError.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({
    archived: validIds.length,
    skipped: report_ids.length - validIds.length,
  })
}, ['owner', 'admin'])
