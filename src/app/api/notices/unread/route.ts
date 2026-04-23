import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { isDemoMode } from '@/lib/demo'
import { getUnreadDemoNotices } from '@/lib/demo/runtime'
import { createAdminClient } from '@/lib/supabase/admin'

export const GET = withAuth(async (_req, { user }) => {
  if (isDemoMode()) {
    const data = getUnreadDemoNotices(user.id)

    return NextResponse.json({
      data,
      count: data.length,
    })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('get_unread_notices', {
    p_user_id: user.id,
  })

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({
    data: data ?? [],
    count: data?.length ?? 0,
  })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])
