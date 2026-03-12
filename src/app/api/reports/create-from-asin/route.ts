import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// POST /api/reports/create-from-asin — ASIN으로 리포트 생성 시작
export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json() as { asin?: string; marketplace?: string }
  const asin = body.asin?.trim().toUpperCase()
  const marketplace = body.marketplace || 'US'

  if (!asin || asin.length < 5) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ASIN is required (min 5 chars).' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  // 1. 중복 체크 — 같은 ASIN+marketplace에 활성 리포트 존재?
  const { data: existing } = await supabase
    .from('reports')
    .select('id, status, listing_snapshot')
    .eq('listing_snapshot->>asin', asin)
    .eq('listing_snapshot->>marketplace', marketplace)
    .not('status', 'in', '("cancelled","resolved","archived")')
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json(
      {
        error: {
          code: 'DUPLICATE_REPORT',
          message: '이미 활성 신고가 있습니다.',
          details: { existing_report_id: existing[0].id },
        },
      },
      { status: 409 },
    )
  }

  // 2. extension_fetch_queue에 삽입
  const { data: queueItem, error: queueError } = await supabase
    .from('extension_fetch_queue')
    .insert({
      asin,
      marketplace,
      status: 'pending',
      metadata: { purpose: 'new_report' },
    })
    .select('id')
    .single()

  if (queueError || !queueItem) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: queueError?.message ?? 'Failed to create queue item' } },
      { status: 500 },
    )
  }

  return NextResponse.json({ queue_id: queueItem.id, asin, marketplace }, { status: 201 })
}, ['owner', 'admin', 'editor'])
