import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// GET /api/ext/fetch-status?id=xxx — 큐 상태 확인 (폴링용)
export const GET = withAuth(async (req: NextRequest) => {
  const queueId = req.nextUrl.searchParams.get('id')

  if (!queueId) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Queue ID is required.' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('extension_fetch_queue')
    .select('id, status, result, error, asin, marketplace')
    .eq('id', queueId)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Queue item not found.' } },
      { status: 404 },
    )
  }

  return NextResponse.json({
    status: data.status,
    result: data.result,
    error: data.error,
    asin: data.asin,
    marketplace: data.marketplace,
  })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])
