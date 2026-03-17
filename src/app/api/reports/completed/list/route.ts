import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { fetchCompletedReports } from '@/lib/queries/completed-reports'
import type { CompletedReportQueryParams } from '@/lib/queries/completed-reports'

// GET /api/reports/completed/list — infinite scroll for completed reports
export const GET = async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = req.nextUrl.searchParams
  const params: CompletedReportQueryParams = {
    page: sp.get('page') ?? undefined,
    status: sp.get('status') ?? undefined,
    owner: sp.get('owner') ?? undefined,
    search: sp.get('search') ?? undefined,
    sort_field: sp.get('sort_field') ?? undefined,
    sort_dir: sp.get('sort_dir') ?? undefined,
  }

  // offset/limit -> page conversion
  const offset = Number(sp.get('offset') ?? '0')
  const limit = Number(sp.get('limit') ?? '100')
  const page = Math.floor(offset / limit) + 1
  params.page = String(page)

  const { reports, totalCount } = await fetchCompletedReports(params, user)

  return NextResponse.json({
    data: reports ?? [],
    totalCount,
  })
}
