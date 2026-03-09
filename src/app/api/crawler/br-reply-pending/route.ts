import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/crawler/br-reply-pending — Crawler가 폴링: 발송 대기 답장 목록
export const GET = async (req: Request) => {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const serviceToken = process.env.CRAWLER_SERVICE_TOKEN

  if (!serviceToken || token !== serviceToken) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid service token' } },
      { status: 401 },
    )
  }

  const supabase = createAdminClient()

  const { data: reports, error } = await supabase
    .from('reports')
    .select('id, br_case_id, br_reply_pending_text, br_reply_pending_attachments')
    .not('br_reply_pending_text', 'is', null)
    .not('br_case_id', 'is', null)
    .order('updated_at', { ascending: true })
    .limit(10)

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  const mapped = (reports ?? []).map((r) => ({
    report_id: r.id,
    br_case_id: r.br_case_id,
    text: r.br_reply_pending_text,
    attachments: r.br_reply_pending_attachments ?? [],
  }))

  return NextResponse.json({ replies: mapped })
}
