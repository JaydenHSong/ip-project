import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_CAMPAIGNS } from '@/lib/demo/data'
import { CampaignsContent } from './CampaignsContent'

const CampaignsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; marketplace?: string; owner?: string }>
}) => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const page = Number(params.page) || 1
  const limit = 20

  let campaigns: typeof DEMO_CAMPAIGNS | null = null
  let totalPages = 1

  if (isDemoMode()) {
    let filtered = [...DEMO_CAMPAIGNS]
    if (params.status) filtered = filtered.filter((c) => c.status === params.status)
    if (params.marketplace) filtered = filtered.filter((c) => c.marketplace === params.marketplace)
    campaigns = filtered
    totalPages = 1
  } else {
    const offset = (page - 1) * limit
    const supabase = await createClient()

    let query = supabase
      .from('campaigns')
      .select('*, users!campaigns_created_by_fkey(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (params.status) {
      query = query.eq('status', params.status)
    }
    if (params.marketplace) {
      query = query.eq('marketplace', params.marketplace)
    }

    const ownerFilter = params.owner ?? (user.role === 'admin' ? 'all' : 'my')
    if (ownerFilter === 'my') {
      query = query.eq('created_by', user.id)
    }

    const { data, error, count } = await query
    if (error) console.error('Campaigns query error:', error.message)
    campaigns = data as typeof DEMO_CAMPAIGNS | null
    totalPages = Math.ceil((count ?? 0) / limit)
  }

  const effectiveOwner = params.owner ?? (user.role === 'admin' ? 'all' : 'my')

  return (
    <CampaignsContent
      campaigns={campaigns}
      totalPages={totalPages}
      page={page}
      statusFilter={params.status ?? ''}
      canCreate={user.role === 'admin' || user.role === 'editor'}
      userRole={user.role}
      ownerFilter={effectiveOwner as 'my' | 'all'}
    />
  )
}

export default CampaignsPage
