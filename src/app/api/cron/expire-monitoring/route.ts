import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Vercel Cron: 매일 1회 실행
// br_max_monitoring_days 초과 (마지막 활동일 기준) monitoring 리포트를 자동으로 unresolved로 전환
export const GET = async (req: Request): Promise<Response> => {
  // Vercel Cron 인증
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env['CRON_SECRET']
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // br_max_monitoring_days 설정값 조회
  const { data: configRow } = await supabase
    .from('system_configs')
    .select('value')
    .eq('key', 'br_max_monitoring_days')
    .maybeSingle()
  const maxDays = configRow ? Number(configRow.value) : 90
  const maxMs = maxDays * 24 * 60 * 60 * 1000
  const now = Date.now()

  // monitoring 상태 리포트 전체 조회
  const { data: reports, error: fetchError } = await supabase
    .from('reports')
    .select('id, br_last_amazon_reply_at, br_last_our_reply_at, br_submitted_at, created_at')
    .in('status', ['monitoring', 'br_submitting'])

  if (fetchError || !reports || reports.length === 0) {
    return NextResponse.json({ expired: 0, maxDays })
  }

  // 마지막 활동일 기준으로 expired 필터
  const expiredIds = reports
    .filter(r => {
      const lastActivity = Math.max(
        r.br_last_amazon_reply_at ? new Date(r.br_last_amazon_reply_at).getTime() : 0,
        r.br_last_our_reply_at ? new Date(r.br_last_our_reply_at).getTime() : 0,
        r.br_submitted_at ? new Date(r.br_submitted_at).getTime() : 0,
        r.created_at ? new Date(r.created_at).getTime() : 0,
      )
      return lastActivity > 0 && (now - lastActivity) > maxMs
    })
    .map(r => r.id)

  if (expiredIds.length === 0) {
    return NextResponse.json({ expired: 0, maxDays })
  }

  // unresolved로 일괄 전환
  const { error: updateError } = await supabase
    .from('reports')
    .update({
      status: 'unresolved',
      resolved_at: new Date().toISOString(),
      note: `[Auto] Monitoring expired — no activity for ${maxDays} days`,
    })
    .in('id', expiredIds)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ expired: expiredIds.length, maxDays })
}
