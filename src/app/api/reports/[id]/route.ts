import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// GET /api/reports/:id — 신고 상세
export const GET = withAuth(async (req) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 1]

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reports')
    .select(
      '*, listing_snapshot, listings!reports_listing_id_fkey(*), users!reports_created_by_fkey(name, email)',
    )
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '신고를 찾을 수 없습니다.' } },
      { status: 404 },
    )
  }

  // listing_id가 NULL이면 listing_snapshot 사용
  if (!data.listings && data.listing_snapshot) {
    (data as Record<string, unknown>).listings = data.listing_snapshot
  }

  return NextResponse.json(data)
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])

// PATCH /api/reports/:id — 신고 수정 (드래프트 편집)
export const PATCH = withAuth(async (req) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 1]

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const body = await req.json()
  const supabase = await createClient()

  // 수정 가능한 필드만 허용
  const allowedFields = [
    'draft_title', 'draft_body', 'user_violation_type',
    'violation_category', 'confirmed_violation_type',
    'resubmit_interval_days',
    'pd_followup_interval_days',
  ]

  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '수정할 필드가 없습니다.' } },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('reports')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json(data)
}, ['owner', 'admin', 'editor'])

// DELETE /api/reports/:id — 신고 삭제
export const DELETE = withAuth(async (req, { user }) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 1]

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  // 리포트 조회
  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('id, status, created_by')
    .eq('id', id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '신고를 찾을 수 없습니다.' } },
      { status: 404 },
    )
  }

  // 권한 체크: Admin/Owner는 모든 상태 삭제 가능, Editor는 본인 draft/pending_review만
  const isAdmin = user.role === 'owner' || user.role === 'admin'
  if (!isAdmin) {
    const editableStatuses = ['draft', 'pending_review']
    if (!editableStatuses.includes(report.status)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '이 상태의 신고는 삭제할 수 없습니다.' } },
        { status: 403 },
      )
    }
    if (report.created_by !== user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '본인이 생성한 신고만 삭제할 수 있습니다.' } },
        { status: 403 },
      )
    }
  }

  const { error: deleteError } = await supabase
    .from('reports')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: deleteError.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
}, ['owner', 'admin', 'editor'])
