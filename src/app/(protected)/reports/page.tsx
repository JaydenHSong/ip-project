import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_REPORTS } from '@/lib/demo/data'
import { ReportsContent } from './ReportsContent'

const ReportsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    status?: string
    violation_type?: string
    disagreement?: string
  }>
}) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const page = Number(params.page) || 1
  const limit = 20

  let reports: typeof DEMO_REPORTS | null = null
  let totalPages = 1

  if (isDemoMode()) {
    let filtered = [...DEMO_REPORTS]
    if (params.status) filtered = filtered.filter((r) => r.status === params.status)
    if (params.violation_type) filtered = filtered.filter((r) => r.violation_type === params.violation_type)
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
      .in('status', ['draft', 'pending_review', 'approved', 'rejected'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (params.status) {
      query = query.eq('status', params.status)
    }
    if (params.violation_type) {
      query = query.eq('violation_type', params.violation_type)
    }
    if (params.disagreement === 'true') {
      query = query.eq('disagreement_flag', true)
    }

    const { data, count } = await query
    reports = data as typeof DEMO_REPORTS | null
    totalPages = Math.ceil((count ?? 0) / limit)
  }

  return (
    <ReportsContent
      reports={reports as Parameters<typeof ReportsContent>[0]['reports']}
      totalPages={totalPages}
      page={page}
      statusFilter={params.status ?? ''}
      disagreementFilter={params.disagreement === 'true'}
    />
  )
}

export default ReportsPage
