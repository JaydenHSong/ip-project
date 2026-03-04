// Monday.com IP 자산 동기화 API
// GET /api/patents/sync — 동기화 상태 조회
// POST /api/patents/sync — 동기화 실행 (Admin 전용)

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { isDemoMode } from '@/lib/demo'
import { createAdminClient } from '@/lib/supabase/admin'
import { runMondaySync } from '@/lib/patents/monday-sync'
import { notifyAdmins } from '@/lib/notifications'

export const GET = withAuth(async () => {
  if (isDemoMode()) {
    return NextResponse.json({
      lastSyncedAt: null,
      totalAssets: 30,
      mondayConfigured: false,
    })
  }

  const supabase = createAdminClient()

  const { data: latest } = await supabase
    .from('ip_assets')
    .select('synced_at')
    .not('synced_at', 'is', null)
    .order('synced_at', { ascending: false })
    .limit(1)
    .single()

  const { count } = await supabase
    .from('ip_assets')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({
    lastSyncedAt: latest?.synced_at ?? null,
    totalAssets: count ?? 0,
    mondayConfigured: !!(process.env.MONDAY_API_KEY),
  })
}, ['owner', 'admin'])

export const POST = withAuth(async () => {
  if (isDemoMode()) {
    return NextResponse.json(
      { error: { code: 'DEMO_MODE', message: 'Cannot sync in demo mode' } },
      { status: 400 },
    )
  }

  const apiKey = process.env.MONDAY_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: { code: 'CONFIG_ERROR', message: 'MONDAY_API_KEY is not configured. Add it to environment variables.' } },
      { status: 400 },
    )
  }

  const result = await runMondaySync()

  // 감사 로그 기록
  try {
    const supabase = createAdminClient()
    await supabase.from('audit_logs').insert({
      action: 'patent_sync',
      details: {
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
    title: 'IP Sync Complete',
    message: `Monday.com sync — ${result.total} items (+${result.created}, ~${result.updated}, ${result.errors.length} err)`,
    metadata: { total: result.total, created: result.created, updated: result.updated, errors: result.errors.length },
  })

  return NextResponse.json({
    synced: result.created + result.updated,
    total: result.total,
    created: result.created,
    updated: result.updated,
    unchanged: result.unchanged,
    errors: result.errors.length,
    errorDetails: result.errors.slice(0, 10),
    syncedAt: result.syncedAt,
  })
}, ['owner', 'admin'])
