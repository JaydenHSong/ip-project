import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/reports/{id}/case-id — 수동 Case ID 입력
export const PATCH = withAuth(async (req: NextRequest) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 2]

  const body = (await req.json()) as { br_case_id: string }

  // 유효성: 5자리 이상 숫자
  if (!body.br_case_id || !/^\d{5,}$/.test(body.br_case_id)) {
    return NextResponse.json(
      { error: 'Case ID는 5자리 이상 숫자여야 합니다' },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  // 중복 확인: 다른 리포트에 같은 case_id가 없는지
  const { data: existing } = await supabase
    .from('reports')
    .select('id')
    .eq('br_case_id', body.br_case_id)
    .neq('id', id)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: '이 Case ID는 이미 다른 리포트에 연결되어 있습니다' },
      { status: 409 },
    )
  }

  const { error } = await supabase
    .from('reports')
    .update({
      br_case_id: body.br_case_id,
      br_case_status: null,
      br_case_id_retry_count: 0,
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, br_case_id: body.br_case_id })
}, ['owner', 'admin', 'editor'])
