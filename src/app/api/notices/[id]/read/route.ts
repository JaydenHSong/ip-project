import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

export const POST = withAuth(async (req, { user }) => {
  const segments = req.nextUrl.pathname.split('/')
  const noticeId = segments[segments.length - 2] // /api/notices/[id]/read
  if (!noticeId) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Notice ID is required.' } },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('notice_reads')
    .upsert(
      { user_id: user.id, notice_id: noticeId },
      { onConflict: 'user_id,notice_id' },
    )

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])
