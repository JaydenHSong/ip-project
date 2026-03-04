import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_REPORTS } from '@/lib/demo/data'
import { CompletedReportsContent } from './CompletedReportsContent'

const COMPLETED_STATUSES = ['submitted', 'monitoring', 'resolved', 'unresolved', 'resubmitted', 'escalated']

const CompletedReportsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; owner?: string }>
}) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams

  let reports: typeof DEMO_REPORTS | null = null

  if (isDemoMode()) {
    let filtered = DEMO_REPORTS.filter((r) => COMPLETED_STATUSES.includes(r.status))
    if (params.status) filtered = filtered.filter((r) => r.status === params.status)
    reports = filtered
  } else {
    const supabase = await createClient()

    let query = supabase
      .from('reports')
      .select(
        '*, listings!reports_listing_id_fkey(asin, title, marketplace, seller_name), users!reports_created_by_fkey(name)',
      )
      .in('status', params.status ? [params.status] : COMPLETED_STATUSES)
      .order('created_at', { ascending: false })
      .limit(100)

    const ownerFilter = params.owner ?? ((user.role === 'owner' || user.role === 'admin') ? 'all' : 'my')
    if (ownerFilter === 'my') {
      query = query.eq('created_by', user.id)
    }

    const { data, error: queryError } = await query

    if (queryError) console.error('Completed reports query error:', queryError.message)
    reports = data as typeof DEMO_REPORTS | null
  }

  const effectiveOwner = params.owner ?? ((user.role === 'owner' || user.role === 'admin') ? 'all' : 'my')

  return (
    <CompletedReportsContent
      reports={reports as Parameters<typeof CompletedReportsContent>[0]['reports']}
      statusFilter={params.status ?? ''}
      userRole={user.role}
      ownerFilter={effectiveOwner as 'my' | 'all'}
    />
  )
}

export default CompletedReportsPage
