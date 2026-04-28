// POST /api/templates/:id/use — Increment usage_count
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'

export const POST = withAuth(async (_req, { params }) => {
  const id = params.id || null
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
