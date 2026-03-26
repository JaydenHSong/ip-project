import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/settings/brands — 브랜드 + 하위 마켓 목록
export const GET = withAuth(async () => {
  const db = createAdminClient()

  const { data: brands, error: bErr } = await db
    .from('brands')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (bErr) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: bErr.message } }, { status: 500 })
  }

  const { data: markets, error: mErr } = await db
    .from('brand_markets')
    .select('*')
    .eq('is_active', true)
    .order('marketplace')

  if (mErr) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: mErr.message } }, { status: 500 })
  }

  // 브랜드별로 마켓 그룹핑
  const result = (brands ?? []).map(b => ({
    ...b,
    markets: (markets ?? []).filter(m => m.brand_id === b.id),
  }))

  return NextResponse.json(result)
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])

// POST /api/settings/brands — 브랜드 추가
export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json() as { name: string; code: string; description?: string }

  if (!body.name || !body.code) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'name과 code는 필수입니다.' } },
      { status: 400 },
    )
  }

  const db = createAdminClient()
  const { data, error } = await db
    .from('brands')
    .insert({ name: body.name, code: body.code.toLowerCase(), description: body.description ?? null })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}, ['owner', 'admin'])

// PATCH /api/settings/brands — 브랜드 수정
export const PATCH = withAuth(async (req: NextRequest) => {
  const body = await req.json() as { id: string; name?: string; description?: string; is_active?: boolean }

  if (!body.id) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'id는 필수입니다.' } },
      { status: 400 },
    )
  }

  const db = createAdminClient()
  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.description !== undefined) updates.description = body.description
  if (body.is_active !== undefined) updates.is_active = body.is_active

  const { data, error } = await db
    .from('brands')
    .update(updates)
    .eq('id', body.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json(data)
}, ['owner', 'admin'])
