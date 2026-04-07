// AD Optimizer — AutoPilot Retail Signal (FR-07)
// Design Ref: §3.8 — SP-API 재고/BuyBox 반응
// Plan SC: SC-10 재고 0 → 자동 pause < 1시간

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AutoPilotContext } from '../types'

type RetailSignal = {
  campaign_id: string
  inventory_days: number | null
  has_buy_box: boolean | null
  price_changed: boolean
  recommended_action: 'pause' | 'reduce_bid' | 'normal' | 'resume'
  bid_multiplier: number
  reason: string
}

/**
 * Check retail signals for autopilot campaigns.
 * Uses cached data from ads.campaigns (synced via SP-API).
 *
 * Rules:
 * - inventory_days = 0  → pause (no stock)
 * - inventory_days < 7  → reduce_bid (50%)
 * - has_buy_box = false  → reduce_bid (70%)
 * - normal               → 1.0 multiplier
 */
async function checkRetailSignals(
  campaigns: AutoPilotContext[],
  db: SupabaseClient,
): Promise<RetailSignal[]> {
  if (!campaigns.length) return []

  const campaignIds = campaigns.map(c => c.campaign_id)

  // Read cached retail data from campaigns table
  const { data } = await db
    .from('campaigns')
    .select('id, inventory_days, has_buy_box, price_changed, amazon_state')
    .in('id', campaignIds)

  if (!data?.length) return []

  return data.map(row => {
    const campaignId = row.id as string
    const inventoryDays = row.inventory_days as number | null
    const hasBuyBox = row.has_buy_box as boolean | null
    const priceChanged = (row.price_changed as boolean) ?? false
    const amazonState = row.amazon_state as string | null

    return evaluateSignal(campaignId, inventoryDays, hasBuyBox, priceChanged, amazonState)
  })
}

function evaluateSignal(
  campaignId: string,
  inventoryDays: number | null,
  hasBuyBox: boolean | null,
  priceChanged: boolean,
  amazonState: string | null,
): RetailSignal {
  const base = { campaign_id: campaignId, inventory_days: inventoryDays, has_buy_box: hasBuyBox, price_changed: priceChanged }

  // Priority 1: Zero inventory → pause
  if (inventoryDays !== null && inventoryDays === 0) {
    return { ...base, recommended_action: 'pause', bid_multiplier: 0, reason: 'Out of stock — campaign auto-paused' }
  }

  // Priority 2: Low inventory → reduce bid 50%
  if (inventoryDays !== null && inventoryDays < 7) {
    return { ...base, recommended_action: 'reduce_bid', bid_multiplier: 0.5, reason: `Low stock (${inventoryDays} days) — bid reduced 50%` }
  }

  // Priority 3: Lost Buy Box → reduce bid 70%
  if (hasBuyBox === false) {
    return { ...base, recommended_action: 'reduce_bid', bid_multiplier: 0.3, reason: 'Buy Box lost — bid reduced 70%' }
  }

  // Priority 4: Was paused (stock back?) → resume candidate
  if (amazonState === 'paused' && inventoryDays !== null && inventoryDays >= 7 && hasBuyBox !== null) {
    return { ...base, recommended_action: 'resume', bid_multiplier: 1.0, reason: `Stock recovered (${inventoryDays} days) — resume candidate` }
  }

  // Normal operation
  return { ...base, recommended_action: 'normal', bid_multiplier: 1.0, reason: 'Retail signals normal' }
}

export { checkRetailSignals, evaluateSignal }
export type { RetailSignal }
