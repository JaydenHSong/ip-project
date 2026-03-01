import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { notifySubmittedToSC } from '@/lib/notifications/google-chat'

// POST /api/reports/:id/submit-sc — approved → submitted
export const POST = withAuth(async (req) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 2]

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  // 현재 상태 확인
  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('status, listing_id')
    .eq('id', id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '신고를 찾을 수 없습니다.' } },
      { status: 404 },
    )
  }

  if (report.status !== 'approved') {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'SC 접수는 승인된 신고만 가능합니다.' } },
      { status: 400 },
    )
  }

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('reports')
    .update({
      status: 'submitted',
      sc_submitted_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .select('id, status, sc_submitted_at')
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  // 알림 (fire-and-forget)
  const { data: listing } = await supabase
    .from('listings')
    .select('asin')
    .eq('id', report.listing_id)
    .single()

  notifySubmittedToSC(id, listing?.asin ?? 'N/A').catch(() => {})

  return NextResponse.json(data)
}, ['admin'])
