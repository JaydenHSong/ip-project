// POST /api/templates/:id/use — Increment usage_count
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'

const extractId = (req: NextRequest): string | null => {
  // Path: /api/templates/{id}/use → id is second-to-last segment
  const segments = req.nextUrl.pathname.split('/')
  return segments[segments.length - 2] || null
}

export const POST = withAuth(async (req) => {
  const id = extractId(req)
  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Template ID is required.' } },
      { status: 400 },
    )
  }

  if (isDemoMode()) {
    return NextResponse.json({ success: true })
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('increment_template_usage', {
    p_template_id: id,
  })

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])
