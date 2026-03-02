import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { getDemoDashboardStats } from '@/lib/demo/dashboard'
import type { PeriodFilter } from '@/types/dashboard'

const VALID_PERIODS: PeriodFilter[] = ['7d', '30d', '90d']

export const GET = async (request: Request): Promise<NextResponse> => {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const periodParam = searchParams.get('period') ?? '30d'
  const period = VALID_PERIODS.includes(periodParam as PeriodFilter)
    ? (periodParam as PeriodFilter)
    : '30d'

  if (isDemoMode()) {
    return NextResponse.json(getDemoDashboardStats(period))
  }

  // Supabase aggregation queries — future implementation
  return NextResponse.json(getDemoDashboardStats(period))
}
