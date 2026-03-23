import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// GET /api/dashboard/br-case-summary — BR 케이스 큐 카운트 (개인별 New Reply)
export const GET = withAuth(async (_req, { user }) => {
  const supabase = await createClient()

  // Clone threshold 설정값 조회
  const { data: configRow } = await supabase
    .from('system_configs')
    .select('value')
    .eq('key', 'monitoring')
    .maybeSingle()
  const cloneThresholdDays = (configRow?.value as { clone_threshold_days?: number } | null)?.clone_threshold_days ?? 14

  // 모니터링 중인 리포트만 대상
  const { data: reports } = await supabase
    .from('reports')
    .select('id, br_case_status, br_last_amazon_reply_at, br_last_our_reply_at, created_at')
    .eq('status', 'monitoring')
    .not('br_case_id', 'is', null)

  // 현재 유저의 읽음 상태 조회
  const reportIds = (reports ?? []).map(r => r.id)
  let readStatusMap: Record<string, string> = {}
  if (reportIds.length > 0) {
    const { data: readRows } = await supabase
      .from('report_read_status')
      .select('report_id, read_at')
      .eq('user_id', user.id)
      .in('report_id', reportIds)
    if (readRows) {
      readStatusMap = Object.fromEntries(readRows.map(r => [r.report_id, r.read_at]))
    }
  }

  const rows = reports ?? []
  const now = Date.now()
  const cloneThresholdMs = cloneThresholdDays * 24 * 60 * 60 * 1000

  let actionRequired = 0
  let newReply = 0
  let cloneSuggested = 0

  for (const r of rows) {
    if (r.br_case_status === 'needs_attention') actionRequired++

    if (r.br_last_amazon_reply_at) {
      const amazonReply = new Date(r.br_last_amazon_reply_at).getTime()
      const ourReply = r.br_last_our_reply_at ? new Date(r.br_last_our_reply_at).getTime() : 0
      const myReadAt = readStatusMap[r.id] ? new Date(readStatusMap[r.id]).getTime() : 0
      if (amazonReply > ourReply && amazonReply > myReadAt) newReply++
    }

    if (r.created_at && now - new Date(r.created_at).getTime() > cloneThresholdMs) {
      cloneSuggested++
    }
  }

  return NextResponse.json({
    action_required: actionRequired,
    new_reply: newReply,
    clone_suggested: cloneSuggested,
    total: rows.length,
    clone_threshold_days: cloneThresholdDays,
  })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])
