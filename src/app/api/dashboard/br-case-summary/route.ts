import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// GET /api/dashboard/br-case-summary — BR 케이스 큐 카운트
export const GET = withAuth(async () => {
  const supabase = await createClient()

  // 모니터링 중인 리포트만 대상
  const { data: reports } = await supabase
    .from('reports')
    .select('id, br_case_status, br_last_amazon_reply_at, br_last_our_reply_at, br_last_scraped_at, br_reply_read_at')
    .eq('status', 'monitoring')
    .not('br_case_id', 'is', null)

  const rows = reports ?? []
  const now = Date.now()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

  let actionRequired = 0
  let newReply = 0
  let stale = 0

  for (const r of rows) {
    if (r.br_case_status === 'needs_attention') actionRequired++

    if (r.br_last_amazon_reply_at) {
      const amazonReply = new Date(r.br_last_amazon_reply_at).getTime()
      const ourReply = r.br_last_our_reply_at ? new Date(r.br_last_our_reply_at).getTime() : 0
      const readAt = r.br_reply_read_at ? new Date(r.br_reply_read_at).getTime() : 0
      if (amazonReply > ourReply && amazonReply > readAt) newReply++
    }

    const lastActivity = r.br_last_scraped_at ?? r.br_last_amazon_reply_at
    if (lastActivity) {
      if (now - new Date(lastActivity).getTime() > sevenDaysMs) stale++
    }
  }

  return NextResponse.json({
    action_required: actionRequired,
    new_reply: newReply,
    stale,
    total: rows.length,
  })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])
