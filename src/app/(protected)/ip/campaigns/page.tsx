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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let campaigns: any[] | null = null
  let totalPages = 1
  let totalCount = 0

  if (isDemoMode()) {
    let filtered = [...DEMO_CAMPAIGNS]
    if (params.status) filtered = filtered.filter((c) => c.status === params.status)
    if (params.marketplace) filtered = filtered.filter((c) => c.marketplace === params.marketplace)
    campaigns = filtered
    totalCount = filtered.length
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

    const ownerFilter = params.owner ?? ((user.role === 'owner' || user.role === 'admin') ? 'all' : 'my')
    if (ownerFilter === 'my') {
      query = query.eq('created_by', user.id)
    }

    const { data, count } = await query
    totalCount = count ?? 0
    // 실제 DB listings count 조회 (total_listings 컬럼은 부정확할 수 있음)
    if (data && data.length > 0) {
      const campaignIds = data.map((c) => c.id)
      const { data: counts } = await supabase
        .rpc('count_listings_by_campaigns', { campaign_ids: campaignIds })

      const countMap = new Map<string, number>()
      if (counts) {
        for (const row of counts as { source_campaign_id: string; cnt: number }[]) {
          countMap.set(row.source_campaign_id, row.cnt)
        }
      }

      campaigns = data.map((c) => ({
        ...c,
        total_listings: countMap.get(c.id) ?? 0,
      }))
    } else {
      campaigns = data
    }
    totalPages = Math.ceil(totalCount / limit)
  }

  const effectiveOwner = params.owner ?? ((user.role === 'owner' || user.role === 'admin') ? 'all' : 'my')

  return (
    <CampaignsContent
      campaigns={campaigns}
      totalPages={totalPages}
      totalCount={totalCount}
      page={page}
      statusFilter={params.status ?? ''}
      canCreate={user.role === 'owner' || user.role === 'admin' || user.role === 'editor'}
      userRole={user.role}
      ownerFilter={effectiveOwner as 'my' | 'all'}
    />
  )
}

export default CampaignsPage
