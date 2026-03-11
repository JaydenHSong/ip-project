import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_REPORTS } from '@/lib/demo/data'
import { CompletedReportsContent } from './CompletedReportsContent'

const COMPLETED_STATUSES = ['submitted', 'monitoring', 'resolved', 'unresolved', 'resubmitted', 'escalated']
const PAGE_SIZE = 100

const CompletedReportsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; owner?: string }>
}) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  let reports: typeof DEMO_REPORTS | null = null
  let totalCount = 0

  if (isDemoMode()) {
    let filtered = DEMO_REPORTS.filter((r) => COMPLETED_STATUSES.includes(r.status))
    if (params.status) filtered = filtered.filter((r) => r.status === params.status)
    totalCount = filtered.length
    reports = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  } else {
    const supabase = await createClient()

    const ownerFilter = params.owner ?? ((user.role === 'owner' || user.role === 'admin') ? 'all' : 'my')
    const statusFilter = params.status ? [params.status] : COMPLETED_STATUSES

    // Count query
    let countQuery = supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .in('status', statusFilter)
    if (ownerFilter === 'my') {
      countQuery = countQuery.eq('created_by', user.id)
    }
    const { count } = await countQuery
    totalCount = count ?? 0

    // Data query with pagination
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from('reports')
      .select(
        '*, listing_snapshot, listings!reports_listing_id_fkey(asin, title, marketplace, seller_name), users!reports_created_by_fkey(name)',
      )
      .in('status', statusFilter)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (ownerFilter === 'my') {
      query = query.eq('created_by', user.id)
    }

    const { data, error: queryError } = await query

    if (queryError) console.error('Completed reports query error:', queryError.message)
    reports = (data ?? []).map((r: Record<string, unknown>) => {
      if (!r.listings && r.listing_snapshot) return { ...r, listings: r.listing_snapshot }
      return r
    }) as typeof DEMO_REPORTS | null
  }

  const effectiveOwner = params.owner ?? ((user.role === 'owner' || user.role === 'admin') ? 'all' : 'my')
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <CompletedReportsContent
      reports={reports as Parameters<typeof CompletedReportsContent>[0]['reports']}
      statusFilter={params.status ?? ''}
      userRole={user.role}
      ownerFilter={effectiveOwner as 'my' | 'all'}
      page={page}
      totalPages={totalPages}
      totalCount={totalCount}
      pageSize={PAGE_SIZE}
    />
  )
}

export default CompletedReportsPage
