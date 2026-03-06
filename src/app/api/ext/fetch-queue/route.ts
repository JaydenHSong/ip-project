import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/ext/fetch-queue — Extension 폴링: pending 1개 반환 + processing 전환
export const GET = withAuth(async (_req, { user }) => {
  const supabase = createAdminClient()

  // pending 상태 중 가장 오래된 1건 조회
  const { data: item, error } = await supabase
    .from('extension_fetch_queue')
    .select('id, asin, marketplace')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (error || !item) {
    return NextResponse.json({ item: null })
  }

  // processing으로 전환
  await supabase
    .from('extension_fetch_queue')
    .update({
      status: 'processing',
      picked_up_at: new Date().toISOString(),
      picked_up_by: user.email,
    })
    .eq('id', item.id)
    .eq('status', 'pending') // optimistic lock

  return NextResponse.json({ item })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])
