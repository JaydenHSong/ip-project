// Monday.com 특허 동기화 API
// GET /api/patents/sync — 동기화 상태 조회
// POST /api/patents/sync — 동기화 실행

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { runMondaySync } from '@/lib/patents/monday-sync'
import { createClient } from '@/lib/supabase/server'

export const GET = withAuth(async () => {
  const supabase = await createClient()

  // 가장 최근 동기화 시간 조회
  const { data: latestPatent } = await supabase
    .from('patents')
    .select('synced_at')
    .order('synced_at', { ascending: false })
    .limit(1)
    .single()

  const { count } = await supabase
    .from('patents')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({
    lastSyncedAt: latestPatent?.synced_at ?? null,
    totalPatents: count ?? 0,
    mondayConfigured: !!(process.env.MONDAY_API_KEY && process.env.MONDAY_BOARD_ID),
  })
}, ['admin'])

export const POST = withAuth(async () => {
  const apiKey = process.env.MONDAY_API_KEY
  const boardId = process.env.MONDAY_BOARD_ID

  if (!apiKey || !boardId) {
    return NextResponse.json(
      { error: { code: 'CONFIG_ERROR', message: 'MONDAY_API_KEY and MONDAY_BOARD_ID are required' } },
      { status: 500 },
    )
  }

  const result = await runMondaySync()

  return NextResponse.json(result)
}, ['admin'])
