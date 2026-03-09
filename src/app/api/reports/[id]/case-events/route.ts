import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// GET /api/reports/[id]/case-events — 케이스 이벤트 목록 (시간 역순)
export const GET = withAuth(async (req) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.indexOf('reports') + 1]

  if (!id) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ID required' } }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: events, error } = await supabase
    .from('br_case_events')
    .select('*')
    .eq('report_id', id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ events: events ?? [] })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])
