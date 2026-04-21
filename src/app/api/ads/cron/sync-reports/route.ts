// Cron: Reporting → report_snapshots (daily 2AM)
// Design Ref: ft-runtime-hardening §3.3 — createCronHandler 통일

import { createCronHandler } from '@/lib/api/cron-handler'
import { syncReports } from '@/modules/ads/cron/sync-reports'

const handler = createCronHandler(
  async (ctx) => {
    const result = await syncReports(ctx)
    return {
      data: result,
      summary: `Synced ${result.synced} (created ${result.created}, updated ${result.updated}, errors ${result.errors})`,
    }
  },
  { name: 'sync-reports', maxDuration: 300 },
)

export const GET = handler.GET
export const POST = handler.POST
export const maxDuration = 300
