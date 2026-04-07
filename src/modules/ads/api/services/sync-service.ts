// Design Ref: §5.1 — Sync Service (business orchestration)
// module-2: Brand Analytics + Orders only. Campaign/Report sync added in module-4

import type { SupabaseClient } from '@supabase/supabase-js'
import type { SpApiPort } from '../ports/sp-api-port'
import type { AdsPort, DateRange } from '../ports/ads-port'
import type { AmazonCampaign } from '../types'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

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
    private db: SupabaseClient<any, any>,
    private publicDb: SupabaseClient<any, any>,
  ) {}

  // ─── SP-API: Brand Analytics → ads.brand_analytics (module-2) ───

  async syncBrandAnalytics(profileId: string, reportDate: string): Promise<SyncResult> {
    const supabase = this.db
    const result: SyncResult = { synced: 0, created: 0, updated: 0, errors: 0 }

    try {
      // Get marketplace_id for this profile
      const { data: profile } = await supabase
        .from('marketplace_profiles')
        .select('marketplace_id')
        .eq('ads_profile_id', profileId)
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
          .from('report_snapshots')
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
    const supabase = this.db
    const result: SyncResult = { synced: 0, created: 0, updated: 0, errors: 0 }

    try {
      const { data: profile } = await supabase
        .from('marketplace_profiles')
        .select('marketplace_id')
        .eq('ads_profile_id', profileId)
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
        .from('report_snapshots')
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

  // ─── Ads API: Campaigns → ads.campaigns (module-4) ───

  async syncCampaigns(profileId: string): Promise<SyncResult> {
    const supabase = this.db
    const result: SyncResult = { synced: 0, created: 0, updated: 0, errors: 0 }

    try {
      // Get marketplace_profile + brand_market for FK references
      const { data: mpProfile } = await supabase
        .from('marketplace_profiles')
        .select('id, brand_market_id')
        .eq('ads_profile_id', profileId)
        .single()

      if (!mpProfile) {
        result.errors = 1
        return result
      }

      // Resolve org_unit_id: brand_markets → brands → org_units (via name match)
      const { data: brandMarket } = await this.publicDb
        .from('brand_markets')
        .select('id, brand_id')
        .eq('id', mpProfile.brand_market_id)
        .single()

      let orgUnitId: string | null = null
      if (brandMarket?.brand_id) {
        const { data: brand } = await this.publicDb
          .from('brands')
          .select('name')
          .eq('id', brandMarket.brand_id)
          .single()

        if (brand?.name) {
          const { data: orgUnit } = await this.publicDb
            .from('org_units')
            .select('id')
            .eq('name', brand.name)
            .single()

          orgUnitId = (orgUnit?.id as string) ?? null
        }
      }

      // Get a system admin user for created_by on auto-created campaigns
      const { data: adminUser } = await this.publicDb
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single()

      // Paginate through all campaigns
      let nextToken: string | undefined
      const allCampaigns: AmazonCampaign[] = []

      do {
        const page = await this.adsPort.listCampaigns(nextToken)
        allCampaigns.push(...page.data)
        nextToken = page.next_token
      } while (nextToken)

      // Get existing campaigns mapped by amazon_campaign_id
      const { data: existing } = await supabase
        .from('campaigns')
        .select('id, amazon_campaign_id')
        .eq('marketplace_profile_id', mpProfile.id)
        .not('amazon_campaign_id', 'is', null)

      const existingMap = new Map(
        (existing ?? []).map(c => [c.amazon_campaign_id, c.id]),
      )

      // Track seen amazon IDs (for detecting archived)
      const seenIds = new Set<string>()

      for (const campaign of allCampaigns) {
        seenIds.add(campaign.campaign_id)
        const localId = existingMap.get(campaign.campaign_id)

        const mapStatus = (state: string): string => {
          if (state === 'enabled') return 'active'
          if (state === 'paused') return 'paused'
          return 'archived'
        }

        if (localId) {
          // Update existing campaign
          const { error } = await supabase
            .from('campaigns')
            .update({
              amazon_state: campaign.state,
              status: mapStatus(campaign.state),
              daily_budget: campaign.budget,
              name: campaign.name,
              updated_at: new Date().toISOString(),
            })
            .eq('id', localId)

          if (error) {
            result.errors += 1
          } else {
            result.updated += 1
          }
        } else if (orgUnitId && adminUser?.id) {
          // Auto-create new campaign discovered from Amazon with defaults
          const marketingCode = `SYNC-${campaign.campaign_id.slice(-6).toUpperCase()}`
          const { error } = await supabase
            .from('campaigns')
            .insert({
              org_unit_id: orgUnitId,
              brand_market_id: mpProfile.brand_market_id,
              marketplace_profile_id: mpProfile.id,
              amazon_campaign_id: campaign.campaign_id,
              amazon_state: campaign.state,
              marketing_code: marketingCode,
              name: campaign.name,
              campaign_type: campaign.campaign_type ?? 'sp',
              mode: 'manual',
              status: mapStatus(campaign.state),
              daily_budget: campaign.budget,
              created_by: adminUser.id,
            })

          if (error) {
            result.errors += 1
          } else {
            result.created += 1
          }
        }
      }

      // Mark campaigns removed from Amazon as archived
      for (const [amazonId, localId] of existingMap) {
        if (!seenIds.has(amazonId)) {
          await supabase
            .from('campaigns')
            .update({ amazon_state: 'archived', status: 'archived', updated_at: new Date().toISOString() })
            .eq('id', localId)
        }
      }

      // Update last_sync_at on marketplace_profile
      await supabase
        .from('marketplace_profiles')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('ads_profile_id', profileId)

      result.synced = allCampaigns.length
    } catch (err) {
      result.errors += 1
      throw err
    }

    return result
  }

  // ─── Ads API: Reports → ads.report_snapshots (module-4) ───

  async syncReports(profileId: string, date: string): Promise<SyncResult> {
    const supabase = this.db
    const result: SyncResult = { synced: 0, created: 0, updated: 0, errors: 0 }

    try {
      const { data: mpProfile } = await supabase
        .from('marketplace_profiles')
        .select('id, brand_market_id')
        .eq('ads_profile_id', profileId)
        .single()

      if (!mpProfile) {
        result.errors = 1
        return result
      }

      // Get campaigns to associate reports
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, amazon_campaign_id')
        .eq('marketplace_profile_id', mpProfile.id)
        .not('amazon_campaign_id', 'is', null)

      const campaignMap = new Map(
        (campaigns ?? []).map(c => [c.amazon_campaign_id, c.id]),
      )

      // Request and download SP campaign report
      const dateRange: DateRange = { start: date, end: date }
      const reportId = await this.adsPort.requestReport('sp_campaigns', dateRange)
      const metrics = await this.adsPort.downloadReport(reportId)

      for (const row of metrics) {
        const localCampaignId = campaignMap.get(row.campaign_id)
        if (!localCampaignId) continue

        const { error } = await supabase
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

        if (error) {
          result.errors += 1
        } else {
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

  // ─── Ads API: Search Terms → ads.keyword_recommendations (module-4) ───

  async analyzeKeywords(profileId: string): Promise<AnalysisResult> {
    const supabase = this.db
    const result: AnalysisResult = {
      campaigns_analyzed: 0,
      recommendations_created: 0,
      negative_keywords_found: 0,
      errors: 0,
    }

    try {
      const { data: mpProfile } = await supabase
        .from('marketplace_profiles')
        .select('id, brand_market_id')
        .eq('ads_profile_id', profileId)
        .single()

      if (!mpProfile) {
        result.errors = 1
        return result
      }

      // Get active SP campaigns with their target ACoS
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, amazon_campaign_id, target_acos, brand_market_id')
        .eq('marketplace_profile_id', mpProfile.id)
        .eq('status', 'active')
        .in('campaign_type', ['sp'])

      if (!campaigns?.length) return result

      const dateRange: DateRange = {
        start: daysAgo(14),
        end: daysAgo(1),
      }

      for (const campaign of campaigns) {
        if (!campaign.amazon_campaign_id) continue

        try {
          const searchTerms = await this.adsPort.getSearchTermReport(
            campaign.amazon_campaign_id,
            dateRange,
          )
          result.campaigns_analyzed += 1

          const targetAcos = Number(campaign.target_acos) || 30
          // Expire old pending recommendations for this campaign
          await supabase
            .from('keyword_recommendations')
            .update({ status: 'expired' })
            .eq('campaign_id', campaign.id)
            .eq('status', 'pending')

          for (const term of searchTerms) {
            // High performer: orders > 0, ACoS < target → promote
            if (term.orders > 0 && term.acos < targetAcos && term.clicks >= 5) {
              const { error } = await supabase
                .from('keyword_recommendations')
                .insert({
                  campaign_id: campaign.id,
                  brand_market_id: campaign.brand_market_id,
                  recommendation_type: 'promote',
                  keyword_text: term.search_term,
                  match_type: 'exact',
                  suggested_bid: Math.round(term.cost / term.clicks * 100) / 100,
                  estimated_impact: term.sales,
                  impact_level: term.orders >= 3 ? 'high' : term.orders >= 1 ? 'medium' : 'low',
                  reason: `ACoS ${term.acos.toFixed(1)}% < target ${targetAcos}%, ${term.orders} orders`,
                  source: 'search_term_analysis',
                  look_back_days: 14,
                  metrics: { impressions: term.impressions, clicks: term.clicks, cost: term.cost, sales: term.sales, orders: term.orders, acos: term.acos },
                  status: 'pending',
                })

              if (!error) result.recommendations_created += 1
            }

            // Waster: clicks > 10, orders = 0, spend > $5 → negate
            if (term.orders === 0 && term.clicks > 10 && term.cost > 5) {
              const { error } = await supabase
                .from('keyword_recommendations')
                .insert({
                  campaign_id: campaign.id,
                  brand_market_id: campaign.brand_market_id,
                  recommendation_type: 'negate',
                  keyword_text: term.search_term,
                  match_type: 'negative',
                  estimated_impact: term.cost,
                  impact_level: term.cost > 20 ? 'high' : term.cost > 10 ? 'medium' : 'low',
                  reason: `${term.clicks} clicks, $${term.cost.toFixed(2)} spend, 0 orders`,
                  source: 'search_term_analysis',
                  look_back_days: 14,
                  metrics: { impressions: term.impressions, clicks: term.clicks, cost: term.cost, sales: 0, orders: 0, acos: 0 },
                  status: 'pending',
                })

              if (!error) {
                result.recommendations_created += 1
                result.negative_keywords_found += 1
              }
            }
          }
        } catch {
          result.errors += 1
        }
      }
    } catch (err) {
      result.errors += 1
      throw err
    }

    return result
  }
}
