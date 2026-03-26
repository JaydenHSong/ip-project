import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/settings/brand-markets — 브랜드에 마켓 추가
export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json() as { brand_id: string; marketplace: string; account_name?: string }

  if (!body.brand_id || !body.marketplace) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'brand_id와 marketplace는 필수입니다.' } },
      { status: 400 },
    )
  }

  const db = createAdminClient()
  const { data, error } = await db
    .from('brand_markets')
    .insert({
      brand_id: body.brand_id,
      marketplace: body.marketplace.toUpperCase(),
      account_name: body.account_name ?? null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: { code: 'DUPLICATE', message: '이미 등록된 마켓입니다.' } },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}, ['owner', 'admin'])

// DELETE /api/settings/brand-markets — 마켓 삭제 (soft delete)
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
    .from('brand_markets')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}, ['owner', 'admin'])
