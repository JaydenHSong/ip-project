import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// POST /api/reports/:id/cancel-submit — br_submitting → draft (제출 취소)
export const POST = withAuth(async (req, { params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '신고를 찾을 수 없습니다.' } },
      { status: 404 },
    )
  }

  if (report.status !== 'br_submitting') {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '취소할 수 없는 상태입니다.' } },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('reports')
    .update({
      status: 'draft',
      br_submit_data: null,
      br_submit_attempts: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, status')
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json(data)
}, ['owner', 'admin', 'editor'])
