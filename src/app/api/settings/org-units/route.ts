import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/settings/org-units — 조직 트리 전체 조회
export const GET = withAuth(async () => {
  const db = createAdminClient()

  const { data, error } = await db
    .from('org_units')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .order('name')

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json(data)
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])

// POST /api/settings/org-units — 조직 노드 추가
export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json() as {
    name: string
    level: string
    parent_id: string | null
    sort_order?: number
  }

  if (!body.name || !body.level) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'name과 level은 필수입니다.' } },
      { status: 400 },
    )
  }

  const db = createAdminClient()

  const { data, error } = await db
    .from('org_units')
    .insert({
      name: body.name,
      level: body.level,
      parent_id: body.parent_id || null,
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}, ['owner', 'admin'])

// PATCH /api/settings/org-units — 조직 노드 수정
export const PATCH = withAuth(async (req: NextRequest) => {
  const body = await req.json() as {
    id: string
    name?: string
    level?: string
    parent_id?: string | null
    sort_order?: number
    is_active?: boolean
  }

  if (!body.id) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'id는 필수입니다.' } },
      { status: 400 },
    )
  }

  const db = createAdminClient()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name !== undefined) updates.name = body.name
  if (body.level !== undefined) updates.level = body.level
  if (body.parent_id !== undefined) updates.parent_id = body.parent_id
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order
  if (body.is_active !== undefined) updates.is_active = body.is_active

  const { data, error } = await db
    .from('org_units')
    .update(updates)
    .eq('id', body.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json(data)
}, ['owner', 'admin'])

// DELETE /api/settings/org-units — 조직 노드 삭제 (soft delete)
export const DELETE = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'id는 필수입니다.' } },
      { status: 400 },
    )
  }

  const db = createAdminClient()

  // soft delete — is_active = false
  const { error } = await db
    .from('org_units')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}, ['owner', 'admin'])
