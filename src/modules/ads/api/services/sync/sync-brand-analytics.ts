// Design Ref: §3.3 P2 — Brand analytics + order pattern sync via SP-API

import type { SupabaseClient } from '@supabase/supabase-js'
import type { SpApiPort } from '../../ports/sp-api-port'
import type { SyncResult } from './index'

export async function syncBrandAnalyticsImpl(
  spApiPort: SpApiPort,
  db: SupabaseClient<any, any>,
  profileId: string,
  reportDate: string,
): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, created: 0, updated: 0, errors: 0 }

  try {
    const { data: profile } = await db
      .from('marketplace_profiles')
      .select('marketplace_id')
      .eq('ads_profile_id', profileId)
      .single()

    if (!profile?.marketplace_id) {
      result.errors = 1
      return result
    }

    const rows = await spApiPort.getBrandAnalyticsSearchTerms(
      profile.marketplace_id,
      reportDate,
    )

    for (const row of rows) {
      const { error } = await db
        .from('report_snapshots')
        .upsert({
          brand_market_id: profileId,
          campaign_id: null,
          snapshot_date: reportDate,
          snapshot_type: 'brand_analytics',
          data: row,
        }, { onConflict: 'brand_market_id,snapshot_date,snapshot_type' })

      if (error) result.errors += 1
      else result.synced += 1
    }

    result.created = rows.length
  } catch (err) {
    result.errors += 1
    throw err
  }

  return result
}

export async function syncOrderPatternsImpl(
  spApiPort: SpApiPort,
  db: SupabaseClient<any, any>,
  profileId: string,
): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, created: 0, updated: 0, errors: 0 }

  try {
    const { data: profile } = await db
      .from('marketplace_profiles')
      .select('marketplace_id')
      .eq('ads_profile_id', profileId)
      .single()

    if (!profile?.marketplace_id) {
      result.errors = 1
      return result
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const orders = await spApiPort.listOrders(
      profile.marketplace_id,
      thirtyDaysAgo.toISOString(),
    )

    const hourlyBuckets = new Array<number>(24).fill(0)
    for (const order of orders.data) {
      const hour = new Date(order.purchase_date).getHours()
      hourlyBuckets[hour] += 1
    }

    const avgOrders = orders.data.length / 24
    const peakHours = hourlyBuckets
      .map((count, hour) => ({ hour, count, isPeak: count > avgOrders * 1.2 }))
      .filter(h => h.isPeak)
      .map(h => h.hour)

    const { error } = await db
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

    if (error) result.errors += 1
    else {
      result.synced = 1
      result.created = 1
    }
  } catch (err) {
    result.errors += 1
    throw err
  }

  return result
}
