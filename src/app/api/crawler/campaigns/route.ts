import { NextResponse } from 'next/server'
import { withServiceAuth } from '@/lib/auth/service-middleware'
import { createClient } from '@/lib/supabase/server'

// GET /api/crawler/campaigns — 활성 캠페인 목록 (Crawler 전용)
export const GET = withServiceAuth(async () => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('campaigns')
    .select('id, keyword, marketplace, frequency, max_pages')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ campaigns: data })
})
