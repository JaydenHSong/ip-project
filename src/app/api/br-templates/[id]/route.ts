import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH /api/br-templates/:id — 수정
export const PATCH = withAuth(async (req) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 1]

  const supabase = createAdminClient()
  const body = await req.json() as Record<string, unknown>

  const allowed = ['code', 'category', 'title', 'subject', 'body', 'br_form_type', 'instruction', 'violation_codes', 'placeholders', 'active']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('br_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ template: data })
}, ['owner', 'admin'])

// DELETE /api/br-templates/:id — 삭제
export const DELETE = withAuth(async (req) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 1]

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('br_templates')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
}, ['owner', 'admin'])
