import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// POST /api/reports/:id/clone — 기존 케이스 복사 → 새 draft 생성
export const POST = withAuth(async (req, { params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json(
      { error: { code: 'AUTH_ERROR', message: 'Unauthorized' } },
      { status: 401 },
    )
  }

  // 원본 리포트 조회
  const { data: source, error: fetchError } = await supabase
    .from('reports')
    .select('listing_id, user_violation_type, violation_category, confirmed_violation_type, draft_title, draft_subject, draft_body, note')
    .eq('id', id)
    .single()

  if (fetchError || !source) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '원본 신고를 찾을 수 없습니다.' } },
      { status: 404 },
    )
  }

  // 이미 이 원본에서 만들어진 draft clone이 있으면 중복 생성 방지
  const { data: existingClone } = await supabase
    .from('reports')
    .select('id')
    .eq('parent_report_id', id)
    .eq('status', 'draft')
    .limit(1)
    .maybeSingle()

  if (existingClone) {
    return NextResponse.json({ data: { id: existingClone.id, existing: true } })
  }

  // 새 draft 생성 (parent_report_id로 원본 연결)
  const { data: newReport, error: insertError } = await supabase
    .from('reports')
    .insert({
      listing_id: source.listing_id,
      user_violation_type: source.user_violation_type,
      violation_category: source.violation_category,
      confirmed_violation_type: source.confirmed_violation_type,
      draft_title: source.draft_title,
      draft_subject: source.draft_subject,
      draft_body: source.draft_body,
      note: source.note ? `[Cloned] ${source.note}` : `[Cloned from ${id.slice(0, 8)}]`,
      parent_report_id: id,
      status: 'draft',
      created_by: authUser.id,
    })
    .select('id')
    .single()

  if (insertError || !newReport) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: insertError?.message ?? 'Insert failed' } },
      { status: 500 },
    )
  }

  return NextResponse.json({ data: { id: newReport.id } })
}, ['owner', 'admin', 'editor'])
