// AD Optimizer — Campaign list query (split from queries.ts for 250-line policy)

import { createAdsAdminClient } from '@/lib/supabase/admin'
import type { CampaignListQuery } from './types'

const getCampaigns = async (query: CampaignListQuery) => {
  const supabase = createAdsAdminClient()
  const {
    brand_market_id,
    mode,
    status,
    assigned_to,
    search,
    sort_by = 'created_at',
    sort_dir = 'desc',
    page = 1,
    limit = 20,
  } = query

  let qb = supabase
    .from('campaigns')
    .select('*', { count: 'exact' })
    .eq('brand_market_id', brand_market_id)

  if (mode) qb = qb.eq('mode', mode)
  if (status) qb = qb.eq('status', status)
  if (assigned_to) qb = qb.eq('assigned_to', assigned_to)
  if (search) qb = qb.or(`name.ilike.%${search}%,marketing_code.ilike.%${search}%`)

  const offset = (page - 1) * limit
  const ascending = sort_dir === 'asc'
  qb = qb.order(sort_by, { ascending })

  const sortKeysWithCreatedTiebreak = new Set([
    'name',
    'status',
    'daily_budget',
    'weekly_budget',
    'marketing_code',
    'mode',
    'updated_at',
  ])
  if (sortKeysWithCreatedTiebreak.has(sort_by)) {
    qb = qb.order('created_at', { ascending: false })
  }

  qb = qb.range(offset, offset + limit - 1)

  const { data, count, error } = await qb

  if (error) throw error

  const campaigns = data ?? []

  const campaignIds = campaigns.map((c) => c.id)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const dateStr = sevenDaysAgo.toISOString().split('T')[0]

  const kpiMap = new Map<string, { spend: number; sales: number; orders: number }>()

  if (campaignIds.length > 0) {
    const { data: snapshots } = await supabase
      .from('report_snapshots')
      .select('campaign_id, spend, sales, orders')
      .in('campaign_id', campaignIds)
      .eq('report_level', 'campaign')
      .gte('report_date', dateStr)

    for (const s of snapshots ?? []) {
      const existing = kpiMap.get(s.campaign_id) ?? { spend: 0, sales: 0, orders: 0 }
      existing.spend += s.spend ?? 0
      existing.sales += s.sales ?? 0
      existing.orders += s.orders ?? 0
      kpiMap.set(s.campaign_id, existing)
    }
  }

  const enriched = campaigns.map((c) => {
    const kpi = kpiMap.get(c.id)
    const spend7d = kpi?.spend ?? 0
    const sales7d = kpi?.sales ?? 0
    return {
      ...c,
      spend_7d: spend7d,
      sales_7d: sales7d,
      orders_7d: kpi?.orders ?? 0,
      acos: sales7d > 0 ? (spend7d / sales7d) * 100 : null,
      roas: spend7d > 0 ? sales7d / spend7d : null,
    }
  })

  return {
    data: enriched,
    pagination: { page, limit, total: count ?? 0 },
  }
}

export { getCampaigns }
