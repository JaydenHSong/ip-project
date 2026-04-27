// Cron: Ads API → ads.campaigns (hourly)
// Design Ref: ft-runtime-hardening §3.3 — createCronHandler 통일

import { createCronHandler } from '@/lib/api/cron-handler'
import { syncCampaigns } from '@/modules/ads/cron/sync-campaigns'

const handler = createCronHandler(
  async (ctx) => {
    const result = await syncCampaigns(ctx)
    return {
      data: result,
      summary: `Synced ${result.synced} (created ${result.created}, updated ${result.updated}, errors ${result.errors})`,
    }
  },
  { name: 'sync-campaigns', maxDuration: 300 },
)

export const GET = handler.GET
export const POST = handler.POST
export const maxDuration = 300
