// Design Ref: §5.3 — StreamService (Marketing Stream processor)
// Receives real-time metrics from Amazon Marketing Stream via webhook

import type { SupabaseClient } from '@supabase/supabase-js'
import type { StreamMetricBatch, ProcessResult } from '../ports/stream-port'

export class StreamService {
  constructor(
    private db: SupabaseClient,
  ) {}

  async processMetrics(batch: StreamMetricBatch): Promise<ProcessResult> {
    const supabase = this.db
    const result: ProcessResult = { processed: 0, alerts_triggered: 0, errors: 0 }

    // Resolve local campaign IDs for this profile
    const { data: mpProfile } = await supabase
      .from('ads.marketplace_profiles')
      .select('id, brand_market_id')
      .eq('profile_id', batch.profile_id)
      .single()

    if (!mpProfile) {
      result.errors = 1
      return result
    }

    // Build campaign map: amazon_campaign_id → local campaign record
    const amazonCampaignIds = [...new Set(batch.metrics.map(m => m.campaign_id))]
    const { data: campaigns } = await supabase
      .from('ads.campaigns')
      .select('id, amazon_campaign_id, target_acos, daily_budget')
      .eq('marketplace_profile_id', mpProfile.id)
      .in('amazon_campaign_id', amazonCampaignIds)

    const campaignMap = new Map(
      (campaigns ?? []).map(c => [c.amazon_campaign_id, c]),
    )

    for (const metric of batch.metrics) {
      const campaign = campaignMap.get(metric.campaign_id)
      if (!campaign) continue

      // 1. Upsert report_snapshots (hourly granularity)
      const acos = metric.sales > 0 ? (metric.cost / metric.sales) * 100 : 0
      const ctr = metric.impressions > 0 ? (metric.clicks / metric.impressions) * 100 : 0
      const cpc = metric.clicks > 0 ? metric.cost / metric.clicks : 0
      const roas = metric.cost > 0 ? metric.sales / metric.cost : 0

      const { error } = await supabase
        .from('ads.report_snapshots')
        .upsert({
          campaign_id: campaign.id,
          brand_market_id: mpProfile.brand_market_id,
          report_date: metric.date,
          report_level: 'campaign',
          impressions: metric.impressions,
          clicks: metric.clicks,
          spend: metric.cost,
          sales: metric.sales,
          orders: metric.orders,
          acos,
          ctr,
          cpc,
          roas,
          fetched_at: new Date().toISOString(),
        }, { onConflict: 'campaign_id,ad_group_id,keyword_id,report_date,report_level' })

      if (error) {
        result.errors += 1
        continue
      }
      result.processed += 1

      // 2. Check alert thresholds
      const targetAcos = Number(campaign.target_acos) || 30
      const dailyBudget = Number(campaign.daily_budget) || 0

      // Budget >80% pacing alert
      if (dailyBudget > 0 && metric.cost > dailyBudget * 0.8) {
        const alertType = metric.cost > dailyBudget ? 'spend_spike' : 'budget_runout'
        await this.createAlert(supabase, campaign.id, mpProfile.brand_market_id, alertType,
          metric.cost > dailyBudget ? 'critical' : 'warning',
          `Budget ${((metric.cost / dailyBudget) * 100).toFixed(0)}% utilized`,
          { spend: metric.cost, budget: dailyBudget },
        )
        result.alerts_triggered += 1
      }

      // ACoS spike >2x target alert
      if (metric.sales > 0 && acos > targetAcos * 2) {
        await this.createAlert(supabase, campaign.id, mpProfile.brand_market_id, 'acos_spike', 'warning',
          `ACoS ${acos.toFixed(1)}% is 2x+ target ${targetAcos}%`,
          { acos, target_acos: targetAcos },
        )
        result.alerts_triggered += 1
      }

      // Zero sales with significant spend
      if (metric.orders === 0 && metric.cost > 10) {
        await this.createAlert(supabase, campaign.id, mpProfile.brand_market_id, 'zero_sales', 'info',
          `$${metric.cost.toFixed(2)} spent with 0 orders`,
          { cost: metric.cost, clicks: metric.clicks },
        )
        result.alerts_triggered += 1
      }
    }

    // Log stream event (non-critical — table may not exist yet)
    await supabase.from('ads.stream_events').insert({
      profile_id: batch.profile_id,
      dataset_id: batch.dataset_id,
      metrics_count: batch.metrics.length,
      processing_ms: 0,
      status: result.errors > 0 ? 'error' : 'processed',
    }).then(() => {}, () => {})

    return result
  }

  private async createAlert(
    supabase: SupabaseClient,
    campaignId: string,
    brandMarketId: string,
    alertType: string,
    severity: string,
    message: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await supabase.from('ads.alerts').insert({
      campaign_id: campaignId,
      brand_market_id: brandMarketId,
      alert_type: alertType,
      severity,
      title: `${alertType.replace(/_/g, ' ').toUpperCase()}`,
      message,
      data,
    })
  }
}
