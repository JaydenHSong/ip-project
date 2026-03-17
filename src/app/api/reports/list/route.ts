import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { fetchReports } from '@/lib/queries/reports'
import type { ReportQueryParams } from '@/lib/queries/reports'

// GET /api/reports/list — 무한 스크롤용 리포트 목록
export const GET = async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = req.nextUrl.searchParams
  const params: ReportQueryParams = {
    page: sp.get('page') ?? undefined,
    status: sp.get('status') ?? undefined,
    br_form_type: sp.get('br_form_type') ?? undefined,
    br_case_status: sp.get('br_case_status') ?? undefined,
    smart_queue: sp.get('smart_queue') ?? undefined,
    search: sp.get('search') ?? undefined,
    date_from: sp.get('date_from') ?? undefined,
    date_to: sp.get('date_to') ?? undefined,
    sort_field: sp.get('sort_field') ?? undefined,
    sort_dir: sp.get('sort_dir') ?? undefined,
    owner: sp.get('owner') ?? undefined,
  }

  // offset/limit → page 변환
  const offset = Number(sp.get('offset') ?? '0')
  const limit = Number(sp.get('limit') ?? '20')
  const page = Math.floor(offset / limit) + 1
  params.page = String(page)

  const { reports, totalCount } = await fetchReports(params, user)

  return NextResponse.json({
    data: reports ?? [],
    totalCount,
  })
}
