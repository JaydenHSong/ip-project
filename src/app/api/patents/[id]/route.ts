import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

const extractId = (pathname: string): string => {
  const segments = pathname.split('/')
  return segments[segments.length - 1]
}

// GET /api/patents/:id — IP 자산 상세
export const GET = withAuth(async (req) => {
  const id = extractId(req.nextUrl.pathname)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ip_assets')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'IP asset not found' } },
      { status: 404 },
    )
  }

  return NextResponse.json({ data })
}, ['admin', 'editor', 'viewer'])

// PUT /api/patents/:id — IP 자산 수정 (Admin 전용)
export const PUT = withAuth(async (req) => {
  const id = extractId(req.nextUrl.pathname)
  const body = await req.json() as Record<string, unknown>

  const supabase = await createClient()

  const allowedFields = [
    'ip_type', 'management_number', 'name', 'description', 'country', 'status',
    'application_number', 'application_date', 'registration_number', 'registration_date',
    'expiry_date', 'keywords', 'image_urls', 'related_products', 'report_url',
    'assignee', 'notes',
  ]

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  const { data, error } = await supabase
    .from('ip_assets')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: { code: 'UPDATE_ERROR', message: error?.message ?? 'IP asset not found' } },
      { status: error ? 500 : 404 },
    )
  }

  return NextResponse.json({ data })
}, ['admin'])

// DELETE /api/patents/:id — IP 자산 삭제 (Admin 전용)
export const DELETE = withAuth(async (req) => {
  const id = extractId(req.nextUrl.pathname)
  const supabase = await createClient()

  const { error } = await supabase
    .from('ip_assets')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: { code: 'DELETE_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
}, ['admin'])
