import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

type ThreadItem = {
  type: 'message' | 'note' | 'event'
  id: string
  timestamp: string
  data: Record<string, unknown>
}

// GET /api/reports/[id]/case-thread — 메시지 + 노트 + 이벤트 통합 타임라인
export const GET = withAuth(async (req) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.indexOf('reports') + 1]

  if (!id) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ID required' } }, { status: 400 })
  }

  const supabase = await createClient()

  const items: ThreadItem[] = []

  // 메시지
  const { data: messages } = await supabase
    .from('br_case_messages')
    .select('*')
    .eq('report_id', id)
    .order('sent_at', { ascending: true })

  for (const msg of messages ?? []) {
    items.push({ type: 'message', id: msg.id, timestamp: msg.sent_at, data: msg })
  }

  // 내부 메모
  const { data: notes } = await supabase
    .from('br_case_notes')
    .select('*, users!br_case_notes_user_id_fkey(name)')
    .eq('report_id', id)
    .order('created_at', { ascending: true })

  for (const note of notes ?? []) {
    items.push({ type: 'note', id: note.id, timestamp: note.created_at, data: note })
  }

  // 이벤트
  const { data: events } = await supabase
    .from('br_case_events')
    .select('*')
    .eq('report_id', id)
    .order('created_at', { ascending: true })

  for (const event of events ?? []) {
    items.push({ type: 'event', id: event.id, timestamp: event.created_at, data: event })
  }

  // 시간순 정렬
  items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  return NextResponse.json({ items })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])
