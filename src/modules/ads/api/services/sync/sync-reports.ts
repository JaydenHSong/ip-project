// Design Ref: §3.3 P2 — Report sync from Amazon Ads API

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdsPort, DateRange } from '../../ports/ads-port'
import type { SyncResult } from './index'

export async function syncReportsImpl(
  adsPort: AdsPort,
  db: SupabaseClient<any, any>,
  profileId: string,
  date: string,
): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, created: 0, updated: 0, errors: 0 }

  try {
    const { data: mpProfile } = await db
      .from('marketplace_profiles')
      .select('id, brand_market_id')
      .eq('ads_profile_id', profileId)
      .single()

    if (!mpProfile) {
      result.errors = 1
      return result
    }

    // Paginate campaigns to build amazon_campaign_id → local id map
    const campaignMap = new Map<string, string>()
    let from = 0
    const pageSize = 1000

    while (true) {
      const { data: page } = await db
        .from('campaigns')
        .select('id, amazon_campaign_id')
        .eq('marketplace_profile_id', mpProfile.id)
        .not('amazon_campaign_id', 'is', null)
        .range(from, from + pageSize - 1)

      if (!page || page.length === 0) break
      for (const c of page) {
        campaignMap.set(String(c.amazon_campaign_id), c.id)
      }
      if (page.length < pageSize) break
      from += pageSize
    }

    const dateRange: DateRange = { start: date, end: date }
    const reportId = await adsPort.requestReport('sp_campaigns', dateRange)
    const metrics = await adsPort.downloadReport(reportId)

    for (const row of metrics) {
      const localCampaignId = campaignMap.get(row.campaign_id)
      if (!localCampaignId) continue

      const { error } = await db
        .from('report_snapshots')
        .upsert({
          campaign_id: localCampaignId,
          brand_market_id: mpProfile.brand_market_id,
          report_date: date,
          report_level: 'campaign',
          impressions: row.impressions,
          clicks: row.clicks,
          spend: row.cost,
          sales: row.sales,
          orders: row.orders,
          acos: row.acos,
          cpc: row.cpc,
          ctr: row.ctr,
          roas: row.roas,
          fetched_at: new Date().toISOString(),
        }, { onConflict: 'campaign_id,ad_group_id,keyword_id,report_date,report_level' })

      if (error) result.errors += 1
      else {
        result.synced += 1
        result.created += 1
      }
    }
  } catch (err) {
    result.errors += 1
    throw err
  }

  return result
}
