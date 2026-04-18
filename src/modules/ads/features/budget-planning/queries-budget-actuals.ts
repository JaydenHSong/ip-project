import { createAdsAdminClient } from '@/lib/supabase/admin'
import type { Channel } from '@/modules/ads/shared/types'
import type { ChannelBudget, TeamMonthlyBudget } from './types'

const CHANNELS: Channel[] = ['sp', 'sb', 'sd']

const emptyMonths = (): TeamMonthlyBudget => ({
  months: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, amount: 0 })),
  annual_total: 0,
})

const aggregateSnapshots = async (campaignIds: string[], year: number): Promise<TeamMonthlyBudget> => {
  if (campaignIds.length === 0) return emptyMonths()

  const supabase = createAdsAdminClient()
  const start = `${year}-01-01`
  const end = `${year}-12-31`

  const { data: snaps } = await supabase
    .from('report_snapshots')
    .select('report_date, spend')
    .in('campaign_id', campaignIds)
    .eq('report_level', 'campaign')
    .gte('report_date', start)
    .lte('report_date', end)

  const byMonth = new Map<number, number>()
  for (const s of snaps ?? []) {
    const d = new Date(s.report_date as string)
    if (Number.isNaN(d.getTime()) || d.getFullYear() !== year) continue
    const m = d.getMonth() + 1
    byMonth.set(m, (byMonth.get(m) ?? 0) + Number(s.spend ?? 0))
  }

  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    return { month, amount: byMonth.get(month) ?? 0 }
  })

  return {
    months,
    annual_total: months.reduce((s, x) => s + x.amount, 0),
  }
}

const getActualsByChannel = async (
  orgUnitId: string,
  brandMarketId: string,
  year: number,
): Promise<ChannelBudget[]> => {
  const supabase = createAdsAdminClient()

  const { data: camps } = await supabase
    .from('campaigns')
    .select('id, campaign_type')
    .eq('brand_market_id', brandMarketId)
    .eq('org_unit_id', orgUnitId)

  const byType: Record<Channel, string[]> = { sp: [], sb: [], sd: [] }
  for (const c of camps ?? []) {
    const t = c.campaign_type as string
    if (t === 'sp' || t === 'sb' || t === 'sd') {
      byType[t].push(c.id as string)
    }
  }

  const results: ChannelBudget[] = []
  for (const ch of CHANNELS) {
    const row = await aggregateSnapshots(byType[ch], year)
    results.push({ channel: ch, months: row.months, annual_total: row.annual_total })
  }
  return results
}

/** All campaigns in the brand market (any org) — matches market-scoped campaign KPI spend. */
const getMarketWideMonthlySpendTotal = async (
  brandMarketId: string,
  year: number,
): Promise<TeamMonthlyBudget> => {
  const supabase = createAdsAdminClient()
  const { data: camps } = await supabase.from('campaigns').select('id').eq('brand_market_id', brandMarketId)
  const ids = (camps ?? []).map((c) => c.id as string)
  return aggregateSnapshots(ids, year)
}

export { getActualsByChannel, getMarketWideMonthlySpendTotal }
