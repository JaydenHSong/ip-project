import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/reports/[id]/case-notes/[noteId] — 메모 수정
export const PATCH = withAuth(async (req, { user, params }) => {
  const { id, noteId } = params

  if (!id || !noteId) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ID required' } }, { status: 400 })
  }

  const body = (await req.json()) as { body: string }

  if (!body.body?.trim()) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Note body is required' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const { data: note, error } = await supabase
    .from('br_case_notes')
    .update({ body: body.body.trim(), updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .eq('report_id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error || !note) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Note not found or not yours' } },
      { status: 404 },
    )
  }

  return NextResponse.json(note)
}, ['owner', 'admin', 'editor'])

// DELETE /api/reports/[id]/case-notes/[noteId] — 메모 삭제
export const DELETE = withAuth(async (_req, { user, params }) => {
  const { id, noteId } = params

  if (!id || !noteId) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ID required' } }, { status: 400 })
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('br_case_notes')
    .delete()
    .eq('id', noteId)
    .eq('report_id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}, ['owner', 'admin', 'editor'])
