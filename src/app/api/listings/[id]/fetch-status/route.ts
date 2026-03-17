import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// GET /api/listings/{id}/fetch-status — polling용
export const GET = withAuth(async (req: NextRequest) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 2]

  const supabase = await createClient()

  const { data } = await supabase
    .from('listings')
    .select('fetch_status, last_fetched_at, fetch_error')
    .eq('id', id)
    .single()

  if (!data) {
    return NextResponse.json({ status: 'idle' })
  }

  return NextResponse.json({
    status: data.fetch_status ?? 'idle',
    last_fetched_at: data.last_fetched_at,
    error: data.fetch_error,
  })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])
