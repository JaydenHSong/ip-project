import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_REPORTS } from '@/lib/demo/data'
import { VIOLATION_TYPES } from '@/constants/violations'
import type { ViolationCategory } from '@/constants/violations'
import { ReportsContent } from './ReportsContent'

const getCategoryViolationCodes = (category: string): string[] =>
  Object.values(VIOLATION_TYPES)
    .filter((v) => v.category === category)
    .map((v) => v.code)

const ReportsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    status?: string
    violation_type?: string
    category?: string
    disagreement?: string
    owner?: string
  }>
}) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const page = Number(params.page) || 1
  const limit = 20

  const categoryCodes = params.category
    ? getCategoryViolationCodes(params.category)
    : []

  let reports: typeof DEMO_REPORTS | null = null
  let totalPages = 1

  if (isDemoMode()) {
    let filtered = [...DEMO_REPORTS]
    if (params.status) filtered = filtered.filter((r) => r.status === params.status)
    if (params.violation_type) filtered = filtered.filter((r) => r.violation_type === params.violation_type)
    if (categoryCodes.length > 0) filtered = filtered.filter((r) => categoryCodes.includes(r.violation_type))
    if (params.disagreement === 'true') filtered = filtered.filter((r) => r.disagreement_flag)
    reports = filtered
    totalPages = 1
  } else {
    const offset = (page - 1) * limit
    const supabase = await createClient()

    let query = supabase
      .from('reports')
      .select(
        '*, listings!reports_listing_id_fkey(asin, title, marketplace, seller_name), users!reports_created_by_fkey(name)',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (params.status) {
      query = query.eq('status', params.status)
    } else {
      query = query.in('status', ['draft', 'pending_review', 'approved', 'rejected'])
    }
    if (params.violation_type) {
      query = query.eq('violation_type', params.violation_type)
    }
    if (categoryCodes.length > 0) {
      query = query.in('violation_type', categoryCodes)
    }
    if (params.disagreement === 'true') {
      query = query.eq('disagreement_flag', true)
    }

    const ownerFilter = params.owner ?? ((user.role === 'owner' || user.role === 'admin') ? 'all' : 'my')
    if (ownerFilter === 'my') {
      query = query.eq('created_by', user.id)
    }

    const { data, error, count } = await query
    if (error) console.error('Reports query error:', error.message)
    reports = data as typeof DEMO_REPORTS | null
    totalPages = Math.ceil((count ?? 0) / limit)
  }

  const effectiveOwner = params.owner ?? ((user.role === 'owner' || user.role === 'admin') ? 'all' : 'my')

  return (
    <ReportsContent
      reports={reports as Parameters<typeof ReportsContent>[0]['reports']}
      totalPages={totalPages}
      page={page}
      statusFilter={params.status ?? ''}
      categoryFilter={(params.category ?? '') as ViolationCategory | ''}
      disagreementFilter={params.disagreement === 'true'}
      userRole={user.role}
      ownerFilter={effectiveOwner as 'my' | 'all'}
    />
  )
}

export default ReportsPage
