import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE = 20

const handler = async (req: NextRequest) => {
  const supabase = await createClient()
  const url = new URL(req.url)

  const page = Number(url.searchParams.get('page') ?? '1')
  const trigger = url.searchParams.get('trigger') ?? ''
  const violationType = url.searchParams.get('violation_type') ?? ''

  let query = supabase
    .from('ai_learning_records')
    .select('*, reports(id, status, draft_title, listing_id)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (trigger) {
    query = query.eq('trigger', trigger)
  }
  if (violationType) {
    query = query.eq('violation_type', violationType)
  }

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({
    records: data ?? [],
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
  })
}

export const GET = withAuth(handler, ['owner', 'admin', 'editor'])
