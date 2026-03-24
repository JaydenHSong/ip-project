import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/settings/module-access — 모듈별 접근 설정 조회
export const GET = withAuth(async () => {
  const db = createAdminClient()

  const { data, error } = await db
    .from('module_access_configs')
    .select('*')
    .order('module_key')

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json(data)
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])

// PATCH /api/settings/module-access — 모듈 접근 레벨 변경
export const PATCH = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json() as {
    module_key: string
    access_level: string
  }

  if (!body.module_key || !body.access_level) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'module_key와 access_level은 필수입니다.' } },
      { status: 400 },
    )
  }

  const validLevels = ['company', 'division', 'business_unit', 'department', 'team', 'unit']
  if (!validLevels.includes(body.access_level)) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: `access_level은 ${validLevels.join(', ')} 중 하나여야 합니다.` } },
      { status: 400 },
    )
  }

  const db = createAdminClient()

  const { data, error } = await db
    .from('module_access_configs')
    .update({
      access_level: body.access_level,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('module_key', body.module_key)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json(data)
}, ['owner'])
