import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'
import { DEMO_TEMPLATES } from '@/lib/demo/data'

// GET /api/templates/:id
export const GET = withAuth(async (req, { params }) => {
  const id = params.id || null
  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID is required.' } },
      { status: 400 },
    )
  }

  if (isDemoMode()) {
    const tmpl = DEMO_TEMPLATES.find((t) => t.id === id)
    if (!tmpl) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Template not found.' } },
        { status: 404 },
      )
    }
    return NextResponse.json(tmpl)
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('report_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Template not found.' } },
      { status: 404 },
    )
  }

  return NextResponse.json(data)
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])

// PATCH /api/templates/:id
export const PATCH = withAuth(async (req, { params }) => {
  const id = params.id || null
  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID is required.' } },
      { status: 400 },
    )
  }

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  const allowed = ['title', 'body', 'category', 'violation_types', 'marketplace', 'tags', 'is_default']
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update.' } },
      { status: 400 },
    )
  }

  if (isDemoMode()) {
    const tmpl = DEMO_TEMPLATES.find((t) => t.id === id)
    if (!tmpl) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Template not found.' } },
        { status: 404 },
      )
    }
    return NextResponse.json({ ...tmpl, ...updates, updated_at: new Date().toISOString() })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('report_templates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error?.message ?? 'Update failed.' } },
      { status: 500 },
    )
  }

  return NextResponse.json(data)
}, ['owner', 'admin', 'editor'])

// DELETE /api/templates/:id
export const DELETE = withAuth(async (req, { params }) => {
  const id = params.id || null
  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID is required.' } },
      { status: 400 },
    )
  }

  if (isDemoMode()) {
    return NextResponse.json({ deleted: true })
  }

  const supabase = await createClient()
  const { error } = await supabase.from('report_templates').delete().eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ deleted: true })
}, ['owner', 'admin', 'editor'])
