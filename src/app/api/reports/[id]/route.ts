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
      '*, listings!reports_listing_id_fkey(*), users!reports_created_by_fkey(name, email)',
    )
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '신고를 찾을 수 없습니다.' } },
      { status: 404 },
    )
  }

  return NextResponse.json(data)
}, ['admin', 'editor', 'viewer'])

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
}, ['admin', 'editor'])
