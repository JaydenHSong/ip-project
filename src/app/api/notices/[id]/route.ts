import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { NOTICE_CATEGORIES } from '@/types/notices'

export const PUT = withAuth(async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()
  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Notice ID is required.' } },
      { status: 400 },
    )
  }

  const body = await req.json()
  const updates: Record<string, unknown> = {}

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Title is required.' } },
        { status: 400 },
      )
    }
    if (body.title.length > 200) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Title must be 200 characters or less.' } },
        { status: 400 },
      )
    }
    updates.title = body.title.trim()
  }
  if (body.content !== undefined) {
    if (typeof body.content !== 'string' || body.content.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Content is required.' } },
        { status: 400 },
      )
    }
    if (body.content.length > 5000) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Content must be 5000 characters or less.' } },
        { status: 400 },
      )
    }
    updates.content = body.content.trim()
  }
  if (body.category !== undefined) {
    if (!NOTICE_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid category.' } },
        { status: 400 },
      )
    }
    updates.category = body.category
  }
  if (body.is_pinned !== undefined) {
    updates.is_pinned = body.is_pinned === true
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'No fields to update.' } },
      { status: 400 },
    )
  }

  updates.updated_at = new Date().toISOString()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notices')
    .update(updates)
    .eq('id', id)
    .select('*, users!notices_created_by_fkey(name, email)')
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }
  if (!data) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Notice not found.' } },
      { status: 404 },
    )
  }

  return NextResponse.json(data)
}, ['owner', 'admin'])

export const DELETE = withAuth(async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()
  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Notice ID is required.' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('notices')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return new NextResponse(null, { status: 204 })
}, ['owner', 'admin'])
