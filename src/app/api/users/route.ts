import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDemoMode } from '@/lib/demo'
import { DEMO_USERS } from '@/lib/demo/data'

// GET /api/users — 사용자 목록 (Admin only)
export const GET = withAuth(async () => {
  if (isDemoMode()) {
    return NextResponse.json({ users: DEMO_USERS })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ users: data ?? [] })
}, ['owner'])
