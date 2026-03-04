import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// POST /api/reports/:id/start-monitoring
// submitted → monitoring 전환 + 초기 스냅샷 생성
export const POST = withAuth(async (req, { user }) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 2]

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('id, status, listing_id')
    .eq('id', id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '신고를 찾을 수 없습니다.' } },
      { status: 404 },
    )
  }

  if (report.status !== 'submitted') {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'submitted 상태의 신고만 모니터링 시작 가능합니다.' } },
      { status: 400 },
    )
  }

  const now = new Date().toISOString()

  // 1. report → monitoring 전환
  const { data, error } = await supabase
    .from('reports')
    .update({
      status: 'monitoring',
      monitoring_started_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .select('id, status, monitoring_started_at')
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  // 2. 초기 스냅샷 생성
  const { data: listing } = await supabase
    .from('listings')
    .select('title, description, price_amount, price_currency, seller_name, rating, review_count')
    .eq('id', report.listing_id)
    .single()

  void supabase
    .from('report_snapshots')
    .insert({
      report_id: id,
      snapshot_type: 'initial',
      listing_data: listing ?? {},
      change_detected: false,
      crawled_at: now,
    })

  // 3. 감사 로그
  void supabase
    .from('audit_logs')
    .insert({
      user_id: user.id,
      action: 'monitoring_started',
      resource_type: 'report',
      resource_id: id,
      details: null,
    })

  return NextResponse.json(data)
}, ['owner', 'admin', 'editor'])
