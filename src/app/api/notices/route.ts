import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDemoMode } from '@/lib/demo'
import { getDemoNotices } from '@/lib/demo/runtime'
import { NOTICE_CATEGORIES } from '@/types/notices'
import type { NoticeCategory } from '@/types/notices'

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 20))
  const category = searchParams.get('category') as NoticeCategory | null
  const offset = (page - 1) * limit

  if (isDemoMode()) {
    let notices = getDemoNotices()
    if (category && NOTICE_CATEGORIES.includes(category)) {
      notices = notices.filter((notice) => notice.category === category)
    }

    return NextResponse.json({
      notices: notices.slice(offset, offset + limit),
      total: notices.length,
      page,
      limit,
    })
  }

  const supabase = await createClient()

  let query = supabase
    .from('notices')
    .select('*, users!notices_created_by_fkey(name, email)', { count: 'exact' })
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (category && NOTICE_CATEGORIES.includes(category)) {
    query = query.eq('category', category)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({
    notices: data ?? [],
    total: count ?? 0,
    page,
    limit,
  })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])

export const POST = withAuth(async (req, { user }) => {
  const body = await req.json()
  const { category, title, content, is_pinned } = body

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Title is required.' } },
      { status: 400 },
    )
  }
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Content is required.' } },
      { status: 400 },
    )
  }
  if (title.length > 200) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Title must be 200 characters or less.' } },
      { status: 400 },
    )
  }
  if (content.length > 5000) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Content must be 5000 characters or less.' } },
      { status: 400 },
    )
  }
  if (category && !NOTICE_CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid category.' } },
      { status: 400 },
    )
  }

  if (isDemoMode()) {
    const now = new Date().toISOString()
    return NextResponse.json({
      id: `demo-notice-${Date.now()}`,
      category: category || 'notice',
      title: title.trim(),
      content: content.trim(),
      is_pinned: is_pinned === true,
      created_by: user.id,
      created_at: now,
      updated_at: now,
      users: { name: user.name, email: user.email },
    }, { status: 201 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notices')
    .insert({
      category: category || 'notice',
      title: title.trim(),
      content: content.trim(),
      is_pinned: is_pinned === true,
      created_by: user.id,
    })
    .select('*, users!notices_created_by_fkey(name, email)')
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  // 전체 활성 사용자에게 notification 생성 (비동기, 실패해도 메인 로직 중단 안 함)
  try {
    const adminSupabase = createAdminClient()
    const { data: activeUsers } = await adminSupabase
      .from('users')
      .select('id')
      .eq('is_active', true)
      .neq('id', user.id)

    if (activeUsers && activeUsers.length > 0) {
      const rows = activeUsers.map((u) => ({
        user_id: u.id,
        type: 'notice_new' as const,
        title: `New Notice: ${title.trim().substring(0, 50)}`,
        message: content.trim().substring(0, 200),
        metadata: { notice_id: data.id, category: data.category },
        is_read: false,
      }))
      await adminSupabase.from('notifications').insert(rows)
    }
  } catch {
    // notification 실패가 메인 로직을 중단시키면 안 됨
  }

  return NextResponse.json(data, { status: 201 })
}, ['owner', 'admin', 'editor'])
