import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// POST /api/reports/[id]/case-notes — 내부 메모 작성
export const POST = withAuth(async (req) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.indexOf('reports') + 1]

  if (!id) {
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
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
  }

  // 메모 생성
  const { data: note, error } = await supabase
    .from('br_case_notes')
    .insert({
      report_id: id,
      user_id: authUser.id,
      body: body.body.trim(),
    })
    .select('*, users!br_case_notes_user_id_fkey(name)')
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  // 이벤트 기록
  await supabase.from('br_case_events').insert({
    report_id: id,
    event_type: 'br_note_added',
    new_value: body.body.trim().substring(0, 100),
    actor_id: authUser.id,
  })

  return NextResponse.json(note, { status: 201 })
}, ['owner', 'admin', 'editor'])
