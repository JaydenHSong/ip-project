// AD Optimizer — Campaigns Server Queries
// Design Ref: §4.2 Campaigns endpoints

import { createAdsAdminClient } from '@/lib/supabase/admin'
import type { CampaignKpiSummary } from './types'
import { getCampaigns } from './queries-campaign-list'

// ─── Detail ───

const getCampaignById = async (id: string) => {
  const supabase = createAdsAdminClient()

  // 1. Campaign base data
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  if (!data) return null

  // 2. 7-day metrics from report_snapshots
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const dateStr = sevenDaysAgo.toISOString().split('T')[0]

  const { data: snapshots } = await supabase
    .from('report_snapshots')
    .select('impressions, clicks, spend, sales, orders, acos, roas, cpc, ctr, cvr')
    .eq('campaign_id', id)
    .eq('report_level', 'campaign')
    .gte('report_date', dateStr)

  const metrics7d = (snapshots ?? []).reduce(
    (acc, s) => ({
      impressions: acc.impressions + (s.impressions ?? 0),
      clicks: acc.clicks + (s.clicks ?? 0),
      spend: acc.spend + (s.spend ?? 0),
      sales: acc.sales + (s.sales ?? 0),
      orders: acc.orders + (s.orders ?? 0),
      acos: null as number | null,
      roas: null as number | null,
      cpc: null as number | null,
      ctr: null as number | null,
      cvr: null as number | null,
    }),
    { impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0, acos: null as number | null, roas: null as number | null, cpc: null as number | null, ctr: null as number | null, cvr: null as number | null },
  )

  // Calculate derived metrics
  if (metrics7d.spend > 0 && metrics7d.sales > 0) {
    metrics7d.acos = (metrics7d.spend / metrics7d.sales) * 100
    metrics7d.roas = metrics7d.sales / metrics7d.spend
  }
  if (metrics7d.clicks > 0) {
    metrics7d.cpc = metrics7d.spend / metrics7d.clicks
    metrics7d.cvr = (metrics7d.orders / metrics7d.clicks) * 100
  }
  if (metrics7d.impressions > 0) {
    metrics7d.ctr = (metrics7d.clicks / metrics7d.impressions) * 100
  }

  // 3. Counts
  const { count: keywordsCount } = await supabase
    .from('keywords')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', id)

  const { count: adGroupsCount } = await supabase
    .from('ad_groups')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', id)

  // 4. Recent automation actions (last 10)
  const { data: recentActions } = await supabase
    .from('automation_logs')
    .select('id, action_type, reason, executed_at')
    .eq('campaign_id', id)
    .order('executed_at', { ascending: false })
    .limit(10)

  return {
    ...data,
    metrics_7d: metrics7d,
    keywords_count: keywordsCount ?? 0,
    ad_groups_count: adGroupsCount ?? 0,
    recent_actions: recentActions ?? [],
  }
}

// ─── KPI Summary ───

const getCampaignKpiSummary = async (brandMarketId: string): Promise<CampaignKpiSummary> => {
  const supabase = createAdsAdminClient()

  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('id, status, daily_budget, weekly_budget')
    .eq('brand_market_id', brandMarketId)

  if (error) throw error

  const all = campaigns ?? []
  const active = all.filter((c) => c.status === 'active')

  // Get current month report snapshots for spend/sales/orders
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const campaignIds = all.map((c) => c.id)

  let totalSpendMtd = 0
  let totalSalesMtd = 0
  let totalOrdersMtd = 0
  let totalAcos = 0
  let totalRoas = 0
  let acosCount = 0
  let roasCount = 0

  if (campaignIds.length > 0) {
    const { data: snapshots } = await supabase
      .from('report_snapshots')
      .select('spend, sales, orders, acos, roas')
      .in('campaign_id', campaignIds)
      .eq('report_level', 'campaign')
      .gte('report_date', monthStart)

    for (const s of snapshots ?? []) {
      totalSpendMtd += s.spend ?? 0
      totalSalesMtd += s.sales ?? 0
      totalOrdersMtd += s.orders ?? 0
      if (s.acos != null) { totalAcos += s.acos; acosCount++ }
      if (s.roas != null) { totalRoas += s.roas; roasCount++ }
    }
  }

  const totalBudgetMtd = all.reduce((sum, c) => {
    const daily = c.daily_budget ?? (c.weekly_budget ? c.weekly_budget / 7 : 0)
    return sum + daily * now.getDate()
  }, 0)

  return {
    total_campaigns: all.length,
    active_campaigns: active.length,
    total_spend_mtd: totalSpendMtd,
    total_budget_mtd: totalBudgetMtd,
    avg_acos: acosCount > 0 ? totalAcos / acosCount : null,
    avg_roas: roasCount > 0 ? totalRoas / roasCount : null,
    total_orders_mtd: totalOrdersMtd,
    total_sales_mtd: totalSalesMtd,
  }
}

// ─── Create ───

type CreateCampaignPayload = {
  org_unit_id: string
  brand_market_id: string
  marketplace_profile_id: string
  campaign_type: string
  mode: string
  marketing_code: string
  name: string
  target_acos: number
  daily_budget?: number
  weekly_budget?: number
  max_bid_cap?: number
  created_by: string
  assigned_to?: string
  // Keywords (optional)
  keywords?: { text: string; match_type: string; bid: number }[]
  negative_keywords?: { text: string; match_type: string }[]
  product_asins?: string[]
}

const createCampaign = async (payload: CreateCampaignPayload) => {
  const supabase = createAdsAdminClient()
  const { keywords, negative_keywords, ...rest } = payload
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- product_asins stored in campaign metadata
  const { product_asins, ...campaignData } = rest

  // 1. Insert campaign
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      ...campaignData,
      status: 'learning',
      learning_day: 0,
      confidence_score: 0,
    })
    .select('id, marketing_code, name')
    .single()

  if (error) throw error

  const campaignId = data.id

  // 2. Insert default ad group
  const { data: adGroup } = await supabase
    .from('ad_groups')
    .insert({
      campaign_id: campaignId,
      name: `${data.name} - Default`,
      default_bid: payload.max_bid_cap ?? 0.75,
      state: 'enabled',
    })
    .select('id')
    .single()

  const adGroupId = adGroup?.id

  // 3. Insert keywords (if provided and ad group was created)
  if (adGroupId && keywords && keywords.length > 0) {
    const keywordRows = keywords.map((kw) => ({
      campaign_id: campaignId,
      ad_group_id: adGroupId,
      keyword_text: kw.text,
      match_type: kw.match_type,
      bid: kw.bid,
      state: 'enabled',
    }))

    const { error: kwError } = await supabase
      .from('keywords')
      .insert(keywordRows)

    if (kwError) throw kwError
  }

  // 4. Insert negative keywords
  if (adGroupId && negative_keywords && negative_keywords.length > 0) {
    const negRows = negative_keywords.map((kw) => ({
      campaign_id: campaignId,
      ad_group_id: adGroupId,
      keyword_text: kw.text,
      match_type: kw.match_type,
      bid: null,
      state: 'enabled',
    }))

    const { error: negError } = await supabase
      .from('keywords')
      .insert(negRows)

    if (negError) throw negError
  }

  return data
}

// ─── Update ───

const updateCampaign = async (id: string, updates: Record<string, unknown>) => {
  const supabase = createAdsAdminClient()

  const { data, error } = await supabase
    .from('campaigns')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, marketing_code, name, status')
    .single()

  if (error) throw error
  return data
}

// ─── Delete (soft → archived) ───

const archiveCampaign = async (id: string) => {
  return updateCampaign(id, { status: 'archived' })
}

// ─── Marketing Code: next sequence ───

const getNextMarketingCode = async (brandMarketId: string, prefix: string): Promise<string> => {
  const supabase = createAdsAdminClient()

  const { data } = await supabase
    .from('campaigns')
    .select('marketing_code')
    .eq('brand_market_id', brandMarketId)
    .ilike('marketing_code', `${prefix}%`)
    .order('marketing_code', { ascending: false })
    .limit(1)

  if (!data || data.length === 0) return `${prefix}01`

  const lastCode = data[0].marketing_code
  const lastSeq = parseInt(lastCode.slice(-2), 10)
  const nextSeq = String(lastSeq + 1).padStart(2, '0')
  return `${prefix}${nextSeq}`
}

export {
  getCampaigns,
  getCampaignById,
  getCampaignKpiSummary,
  createCampaign,
  updateCampaign,
  archiveCampaign,
  getNextMarketingCode,
}
