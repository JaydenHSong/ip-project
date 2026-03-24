import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/settings/user-org-units?user_id=xxx — 특정 사용자의 소속 조회
// GET /api/settings/user-org-units — 전체 사용자 소속 조회 (admin용)
export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')

  const db = createAdminClient()

  let query = db
    .from('user_org_units')
    .select('*, org_units(id, name, level)')

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json(data)
}, ['owner', 'admin'])

// POST /api/settings/user-org-units — 사용자 소속 지정
export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json() as {
    user_id: string
    org_unit_id: string
    is_primary?: boolean
  }

  if (!body.user_id || !body.org_unit_id) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'user_id와 org_unit_id는 필수입니다.' } },
      { status: 400 },
    )
  }

  const db = createAdminClient()

  // is_primary=true면 기존 primary를 해제
  if (body.is_primary !== false) {
    await db
      .from('user_org_units')
      .update({ is_primary: false })
      .eq('user_id', body.user_id)
      .eq('is_primary', true)
  }

  const { data, error } = await db
    .from('user_org_units')
    .upsert(
      {
        user_id: body.user_id,
        org_unit_id: body.org_unit_id,
        is_primary: body.is_primary ?? true,
      },
      { onConflict: 'user_id,org_unit_id' },
    )
    .select('*, org_units(id, name, level)')
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}, ['owner', 'admin'])

// DELETE /api/settings/user-org-units — 사용자 소속 해제
export const DELETE = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  const orgUnitId = searchParams.get('org_unit_id')

  if (!userId || !orgUnitId) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'user_id와 org_unit_id는 필수입니다.' } },
      { status: 400 },
    )
  }

  const db = createAdminClient()

  const { error } = await db
    .from('user_org_units')
    .delete()
    .eq('user_id', userId)
    .eq('org_unit_id', orgUnitId)

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}, ['owner', 'admin'])
