import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// GET /api/audit-logs — 감사 로그 조회 (Admin only)
export const GET = withAuth(async (req) => {
  const url = req.nextUrl
  const page = Number(url.searchParams.get('page')) || 1
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100)
  const offset = (page - 1) * limit

  const action = url.searchParams.get('action')
  const entityType = url.searchParams.get('entity_type')
  const userId = url.searchParams.get('user_id')

  const supabase = await createClient()

  let query = supabase
    .from('audit_logs')
    .select('*, users!audit_logs_user_id_fkey(name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (action) {
    query = query.eq('action', action)
  }
  if (entityType) {
    query = query.eq('entity_type', entityType)
  }
  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({
    data: data ?? [],
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  })
}, ['admin'])
