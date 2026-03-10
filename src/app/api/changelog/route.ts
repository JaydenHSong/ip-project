import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDemoMode } from '@/lib/demo'
import { DEMO_CHANGELOG } from '@/lib/demo/changelog'
import type { ChangelogCategory } from '@/types/changelog'

const VALID_CATEGORIES: ChangelogCategory[] = ['new', 'fix', 'policy', 'ai']

// GET /api/changelog — fetch all changelog entries
export const GET = async (): Promise<NextResponse> => {
  if (isDemoMode()) {
    return NextResponse.json({ data: DEMO_CHANGELOG })
  }

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
      { status: 401 },
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('changelog')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ data: data ?? [] })
}

// POST /api/changelog — create new entry (Admin only)
export const POST = async (req: NextRequest): Promise<NextResponse> => {
  if (isDemoMode()) {
    return NextResponse.json(
      { error: { code: 'DEMO_MODE', message: 'Cannot create entries in demo mode.' } },
      { status: 403 },
    )
  }

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
      { status: 401 },
    )
  }

  if (user.role !== 'owner' && user.role !== 'admin') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Admin access required.' } },
      { status: 403 },
    )
  }

  const body = (await req.json()) as { category?: string; title?: string; description?: string }

  if (!body.category || !body.title) {
    return NextResponse.json(
      { error: { code: 'VALIDATION', message: 'Category and title are required.' } },
      { status: 400 },
    )
  }

  if (!VALID_CATEGORIES.includes(body.category as ChangelogCategory)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION', message: 'Invalid category.' } },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('changelog')
    .insert({
      category: body.category,
      title: body.title,
      description: body.description || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  // 감사 로그
  void supabase
    .from('audit_logs')
    .insert({
      user_id: user.id,
      action: 'create',
      resource_type: 'changelog',
      resource_id: data.id,
      details: { category: body.category, title: body.title },
    })

  return NextResponse.json({ data }, { status: 201 })
}
