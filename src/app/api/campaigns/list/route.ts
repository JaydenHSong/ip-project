import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'
import { DEMO_CAMPAIGNS } from '@/lib/demo/data'

const PAGE_SIZE = 20

// GET /api/campaigns/list — infinite scroll for campaigns
export const GET = async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = req.nextUrl.searchParams
  const status = sp.get('status') ?? undefined
  const marketplace = sp.get('marketplace') ?? undefined
  const owner = sp.get('owner') ?? undefined

  // offset/limit -> page conversion
  const offset = Number(sp.get('offset') ?? '0')
  const limit = Number(sp.get('limit') ?? String(PAGE_SIZE))
  const page = Math.floor(offset / limit) + 1

  if (isDemoMode()) {
    let filtered = [...DEMO_CAMPAIGNS]
    if (status) filtered = filtered.filter((c) => c.status === status)
    if (marketplace) filtered = filtered.filter((c) => c.marketplace === marketplace)
    const totalCount = filtered.length
    const sliced = filtered.slice((page - 1) * limit, page * limit)
    return NextResponse.json({ data: sliced, totalCount })
  }

  const supabase = await createClient()
  const rangeFrom = (page - 1) * limit
  const rangeTo = rangeFrom + limit - 1

  let query = supabase
    .from('campaigns')
    .select('*, users!campaigns_created_by_fkey(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(rangeFrom, rangeTo)

  if (status) query = query.eq('status', status)
  if (marketplace) query = query.eq('marketplace', marketplace)

  const effectiveOwner = owner ?? ((user.role === 'owner' || user.role === 'admin') ? 'all' : 'my')
  if (effectiveOwner === 'my') {
    query = query.eq('created_by', user.id)
  }

  const { data, error, count } = await query

  // Fetch listing counts for returned campaigns
  let campaigns = error ? [] : (data ?? [])
  if (campaigns.length > 0) {
    const campaignIds = campaigns.map((c: Record<string, unknown>) => c.id as string)
    const { data: counts } = await supabase
      .rpc('count_listings_by_campaigns', { campaign_ids: campaignIds })

    const countMap = new Map<string, number>()
    if (counts) {
      for (const row of counts as { source_campaign_id: string; cnt: number }[]) {
        countMap.set(row.source_campaign_id, row.cnt)
      }
    }

    campaigns = campaigns.map((c: Record<string, unknown>) => ({
      ...c,
      total_listings: countMap.get(c.id as string) ?? 0,
    }))
  }

  const totalCount = count ?? 0

  return NextResponse.json({ data: campaigns, totalCount })
}
