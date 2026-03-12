import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'

// POST /api/reports/:id/save-draft — sendBeacon 호환 (PATCH 대신 POST)
export const POST = withAuth(async (req) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 2]

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID required' } },
      { status: 400 },
    )
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid body' } },
      { status: 400 },
    )
  }

  if (isDemoMode()) {
    return NextResponse.json({ ok: true })
  }

  const supabase = await createClient()

  const allowedFields = ['draft_title', 'draft_subject', 'draft_body'] as const
  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabase
    .from('reports')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}, ['owner', 'admin', 'editor'])
