import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/settings/brand-market-permissions — 전체 권한 매핑 조회
export const GET = withAuth(async () => {
  const db = createAdminClient()

  const { data, error } = await db
    .from('brand_market_permissions')
    .select('*, org_units!brand_market_permissions_org_unit_id_fkey(id, name, level), brand_markets!brand_market_permissions_brand_market_id_fkey(id, marketplace, brand_id, brands(name))')
    .order('created_at')

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json(data)
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])

// POST /api/settings/brand-market-permissions — 권한 추가
export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json() as { org_unit_id: string; brand_market_id: string; permission: string }

  if (!body.org_unit_id || !body.brand_market_id) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'org_unit_id와 brand_market_id는 필수입니다.' } },
      { status: 400 },
    )
  }

  const permission = body.permission === 'edit' ? 'edit' : 'view'

  const db = createAdminClient()
  const { data, error } = await db
    .from('brand_market_permissions')
    .upsert(
      { org_unit_id: body.org_unit_id, brand_market_id: body.brand_market_id, permission },
      { onConflict: 'org_unit_id,brand_market_id' },
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}, ['owner', 'admin'])

// DELETE /api/settings/brand-market-permissions — 권한 삭제
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
  const { error } = await db
    .from('brand_market_permissions')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}, ['owner', 'admin'])
