// Vercel Cron: 주간 Monday.com → ip_assets 동기화
// Schedule: 매주 월요일 03:00 UTC (vercel.json)
// Auth: CRON_SECRET 토큰 검증

import { NextRequest, NextResponse } from 'next/server'
import { runMondaySync } from '@/lib/patents/monday-sync'
import { notifyAdmins } from '@/lib/notifications'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5분 (6,400+ 아이템 동기화)

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  // Vercel Cron 인증 검증
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid CRON_SECRET' } },
      { status: 401 },
    )
  }

  try {
    const result = await runMondaySync()

    // 감사 로그
    try {
      const supabase = createAdminClient()
      await supabase.from('audit_logs').insert({
        action: 'patent_sync',
        details: {
          trigger: 'cron_weekly',
          total: result.total,
          created: result.created,
          updated: result.updated,
          errors: result.errors.length,
        },
      })
    } catch {
      // audit log 실패가 동기화 결과에 영향을 주지 않도록
    }

    // Admin 알림
    await notifyAdmins({
      type: 'patent_sync_completed',
      title: 'Weekly IP Sync Complete',
      message: `Monday.com weekly sync — ${result.total} items (+${result.created}, ~${result.updated}, ${result.errors.length} err)`,
      metadata: {
        trigger: 'cron_weekly',
        total: result.total,
        created: result.created,
        updated: result.updated,
        errors: result.errors.length,
      },
    })

    return NextResponse.json({
      ok: true,
      synced: result.created + result.updated,
      total: result.total,
      created: result.created,
      updated: result.updated,
      errors: result.errors.length,
      syncedAt: result.syncedAt,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    await notifyAdmins({
      type: 'system_error',
      title: 'Weekly IP Sync Failed',
      message: `Monday.com cron sync failed: ${message}`,
    })

    return NextResponse.json(
      { error: { code: 'SYNC_FAILED', message } },
      { status: 500 },
    )
  }
}
