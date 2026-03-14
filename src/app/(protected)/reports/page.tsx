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
    br_form_type?: string
    category?: string
    owner?: string
    br_case_status?: string
    smart_queue?: string
    search?: string
    date_from?: string
    date_to?: string
  }>
}) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams

  const page = Number(params.page) || 1
  const limit = 20

  let reports: typeof DEMO_REPORTS | null = null
  let totalPages = 1
  let totalCount = 0

  if (isDemoMode()) {
    let filtered = [...DEMO_REPORTS]
    if (params.status) filtered = filtered.filter((r) => r.status === params.status)
    if (params.br_form_type) filtered = filtered.filter((r) => r.br_form_type === params.br_form_type)
    reports = filtered
    totalPages = 1
    totalCount = filtered.length
  } else {
    const offset = (page - 1) * limit
    const supabase = await createClient()

    let query = supabase
      .from('reports')
      .select(
        '*, listing_snapshot, listings!reports_listing_id_fkey(asin, title, marketplace, seller_name), users!reports_created_by_fkey(name)',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Status filter — always apply (even with search)
    if (params.status === 'answered') {
      query = query.eq('status', 'monitoring').eq('br_case_status', 'answered')
    } else if (params.status === 'monitoring') {
      query = query.eq('status', 'monitoring').neq('br_case_status', 'answered')
    } else if (params.status) {
      query = query.eq('status', params.status)
    } else {
      query = query.in('status', ['draft', 'pending_review', 'approved', 'rejected', 'br_submitting', 'monitoring'])
    }
    if (params.br_form_type) {
      query = query.eq('br_form_type', params.br_form_type)
    }
    if (params.br_case_status) {
      query = query.eq('br_case_status', params.br_case_status)
    }
    if (params.smart_queue === 'needs_attention') {
      query = query.eq('br_case_status', 'needs_attention')
    } else if (params.smart_queue === 'new_reply') {
      query = query.not('br_last_amazon_reply_at', 'is', null)
    } else if (params.smart_queue === 'stale') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      query = query.or(`br_last_scraped_at.lt.${sevenDaysAgo},br_last_scraped_at.is.null`)
    }

    // Search filter — applied on top of status filter
    const searchTerm = params.search?.trim()
    if (searchTerm) {
      const isNumber = /^\d+$/.test(searchTerm)
      if (isNumber) {
        query = query.eq('report_number', Number(searchTerm))
      } else {
        query = query.or(
          `listing_snapshot->>asin.ilike.%${searchTerm}%,listing_snapshot->>title.ilike.%${searchTerm}%,listing_snapshot->>seller_name.ilike.%${searchTerm}%`,
        )
      }
    }
    if (params.date_from) {
      query = query.gte('created_at', `${params.date_from}T00:00:00.000Z`)
    }
    if (params.date_to) {
      query = query.lte('created_at', `${params.date_to}T23:59:59.999Z`)
    }

    const ownerFilter = params.owner ?? ((user.role === 'owner' || user.role === 'admin') ? 'all' : 'my')
    if (ownerFilter === 'my') {
      query = query.eq('created_by', user.id)
    }

    const { data, error, count } = await query
    if (error) console.error('Reports query error:', error.message)
    reports = (data ?? []).map((r: Record<string, unknown>) => {
      if (!r.listings && r.listing_snapshot) return { ...r, listings: r.listing_snapshot }
      return r
    }) as typeof DEMO_REPORTS | null
    totalPages = Math.ceil((count ?? 0) / limit)
    totalCount = count ?? 0
  }

  const effectiveOwner = params.owner ?? ((user.role === 'owner' || user.role === 'admin') ? 'all' : 'my')

  return (
    <ReportsContent
      reports={reports as Parameters<typeof ReportsContent>[0]['reports']}
      totalPages={totalPages}
      totalCount={totalCount}
      page={page}
      statusFilter={params.status ?? ''}
      brFormTypeFilter={params.br_form_type ?? ''}
      userRole={user.role}
      ownerFilter={effectiveOwner as 'my' | 'all'}
      searchQuery={params.search ?? ''}
      dateFrom={params.date_from ?? ''}
      dateTo={params.date_to ?? ''}
    />
  )
}

export default ReportsPage
