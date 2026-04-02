// Design Ref: §5.1 — Sync Service (business orchestration)
// module-2: Brand Analytics + Orders only. Campaign/Report sync added in module-4

import { createAdminClient } from '@/lib/supabase/admin'
import type { SpApiPort } from '../ports/sp-api-port'
import type { AdsPort } from '../ports/ads-port'

export type SyncResult = {
  synced: number
  created: number
  updated: number
  errors: number
}

export type AnalysisResult = {
  campaigns_analyzed: number
  recommendations_created: number
  negative_keywords_found: number
  errors: number
}

export class SyncService {
  constructor(
    private adsPort: AdsPort,
    private spApiPort: SpApiPort,
  ) {}

  // ─── SP-API: Brand Analytics → ads.brand_analytics (module-2) ───

  async syncBrandAnalytics(profileId: string, reportDate: string): Promise<SyncResult> {
    const supabase = createAdminClient()
    const result: SyncResult = { synced: 0, created: 0, updated: 0, errors: 0 }

    try {
      // Get marketplace_id for this profile
      const { data: profile } = await supabase
        .from('ads.marketplace_profiles')
        .select('marketplace_id')
        .eq('profile_id', profileId)
        .single()

      if (!profile?.marketplace_id) {
        result.errors = 1
        return result
      }

      const rows = await this.spApiPort.getBrandAnalyticsSearchTerms(
        profile.marketplace_id,
        reportDate,
      )

      // Upsert into report_snapshots or a dedicated brand analytics table
      for (const row of rows) {
        const { error } = await supabase
          .from('ads.report_snapshots')
          .upsert({
            brand_market_id: profileId,
            campaign_id: null,
            snapshot_date: reportDate,
            snapshot_type: 'brand_analytics',
            data: row,
          }, { onConflict: 'brand_market_id,snapshot_date,snapshot_type' })

        if (error) {
          result.errors += 1
        } else {
          result.synced += 1
        }
      }

      result.created = rows.length
    } catch (err) {
      result.errors += 1
      throw err
    }

    return result
  }

  // ─── SP-API: Orders → dayparting patterns (module-2) ───

  async syncOrderPatterns(profileId: string): Promise<SyncResult> {
    const supabase = createAdminClient()
    const result: SyncResult = { synced: 0, created: 0, updated: 0, errors: 0 }

    try {
      const { data: profile } = await supabase
        .from('ads.marketplace_profiles')
        .select('marketplace_id')
        .eq('profile_id', profileId)
        .single()

      if (!profile?.marketplace_id) {
        result.errors = 1
        return result
      }

      // Fetch orders from last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const orders = await this.spApiPort.listOrders(
        profile.marketplace_id,
        thirtyDaysAgo.toISOString(),
      )

      // Aggregate by hour-of-day for dayparting analysis
      const hourlyBuckets = new Array<number>(24).fill(0)
      for (const order of orders.data) {
        const hour = new Date(order.purchase_date).getHours()
        hourlyBuckets[hour] += 1
      }

      // Calculate peak hours (orders > average * 1.2)
      const avgOrders = orders.data.length / 24
      const peakHours = hourlyBuckets
        .map((count, hour) => ({ hour, count, isPeak: count > avgOrders * 1.2 }))
        .filter(h => h.isPeak)
        .map(h => h.hour)

      // Store pattern
      const { error } = await supabase
        .from('ads.report_snapshots')
        .upsert({
          brand_market_id: profileId,
          campaign_id: null,
          snapshot_date: new Date().toISOString().split('T')[0],
          snapshot_type: 'order_pattern',
          data: {
            hourly_distribution: hourlyBuckets,
            peak_hours: peakHours,
            total_orders: orders.data.length,
            analysis_period_days: 30,
          },
        }, { onConflict: 'brand_market_id,snapshot_date,snapshot_type' })

      if (error) {
        result.errors += 1
      } else {
        result.synced = 1
        result.created = 1
      }
    } catch (err) {
      result.errors += 1
      throw err
    }

    return result
  }

  // ─── Stubs for module-4 (Campaign/Report/Keyword sync) ───

  async syncCampaigns(_profileId: string): Promise<SyncResult> {
    // TODO: module-4 — adsPort.listCampaigns() → upsert ads.campaigns
    void this.adsPort
    return { synced: 0, created: 0, updated: 0, errors: 0 }
  }

  async syncReports(_profileId: string, _date: string): Promise<SyncResult> {
    // TODO: module-4 — adsPort.requestReport() + downloadReport() → ads.report_snapshots
    return { synced: 0, created: 0, updated: 0, errors: 0 }
  }

  async analyzeKeywords(_profileId: string): Promise<AnalysisResult> {
    // TODO: module-4 — adsPort.getSearchTermReport() → ads.recommendations
    return { campaigns_analyzed: 0, recommendations_created: 0, negative_keywords_found: 0, errors: 0 }
  }
}
