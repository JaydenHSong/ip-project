// Design Ref: §3.3 P2 — Campaign sync from Amazon Ads API

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdsPort } from '../../ports/ads-port'
import type { AmazonCampaign } from '../../types'
import type { SyncResult } from './index'

export async function syncCampaignsImpl(
  adsPort: AdsPort,
  db: SupabaseClient<any, any>,
  publicDb: SupabaseClient<any, any>,
  profileId: string,
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

    // Resolve org_unit_id: brand_markets → brands → org_units
    const { data: brandMarket } = await publicDb
      .from('brand_markets')
      .select('id, brand_id')
      .eq('id', mpProfile.brand_market_id)
      .single()

    let orgUnitId: string | null = null
    if (brandMarket?.brand_id) {
      const { data: brand } = await publicDb
        .from('brands')
        .select('name')
        .eq('id', brandMarket.brand_id)
        .single()

      if (brand?.name) {
        const { data: orgUnit } = await publicDb
          .from('org_units')
          .select('id')
          .eq('name', brand.name)
          .single()

        orgUnitId = (orgUnit?.id as string) ?? null
      }
    }

    const { data: adminUser } = await publicDb
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single()

    // Paginate through all campaigns
    let nextToken: string | undefined
    const allCampaigns: AmazonCampaign[] = []

    do {
      const page = await adsPort.listCampaigns(nextToken)
      allCampaigns.push(...page.data)
      nextToken = page.next_token
    } while (nextToken)

    // Existing campaigns mapped by amazon_campaign_id
    const { data: existing } = await db
      .from('campaigns')
      .select('id, amazon_campaign_id')
      .eq('marketplace_profile_id', mpProfile.id)
      .not('amazon_campaign_id', 'is', null)

    const existingMap = new Map(
      (existing ?? []).map(c => [c.amazon_campaign_id, c.id]),
    )

    const seenIds = new Set<string>()

    const mapStatus = (state: string): string => {
      if (state === 'enabled') return 'active'
      if (state === 'paused') return 'paused'
      return 'archived'
    }

    for (const campaign of allCampaigns) {
      seenIds.add(campaign.campaign_id)
      const localId = existingMap.get(campaign.campaign_id)

      if (localId) {
        const { error } = await db
          .from('campaigns')
          .update({
            amazon_state: campaign.state,
            status: mapStatus(campaign.state),
            daily_budget: campaign.budget,
            name: campaign.name,
            updated_at: new Date().toISOString(),
          })
          .eq('id', localId)

        if (error) result.errors += 1
        else result.updated += 1
      } else if (orgUnitId && adminUser?.id) {
        const marketingCode = `SYNC-${campaign.campaign_id.slice(-6).toUpperCase()}`
        const { error } = await db
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

        if (error) result.errors += 1
        else result.created += 1
      }
    }

    // Mark campaigns removed from Amazon as archived
    for (const [amazonId, localId] of existingMap) {
      if (!seenIds.has(amazonId)) {
        await db
          .from('campaigns')
          .update({ amazon_state: 'archived', status: 'archived', updated_at: new Date().toISOString() })
          .eq('id', localId)
      }
    }

    await db
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
