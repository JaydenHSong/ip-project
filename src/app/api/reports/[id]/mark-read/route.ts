import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'
import { shouldMarkReportAsRead } from '@/lib/reports/report-read'

export const POST = withAuth(async (_req, { user, params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const { data: report, error } = await supabase
    .from('reports')
    .select('id, status, br_last_amazon_reply_at')
    .eq('id', id)
    .single()

  if (error || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '신고를 찾을 수 없습니다.' } },
      { status: 404 },
    )
  }

  if (!shouldMarkReportAsRead(report)) {
    return NextResponse.json({ marked: false })
  }

  const { error: upsertError } = await supabase
    .from('report_read_status')
    .upsert(
      { report_id: id, user_id: user.id, read_at: new Date().toISOString() },
      { onConflict: 'report_id,user_id' },
    )

  if (upsertError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: upsertError.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ marked: true })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])
