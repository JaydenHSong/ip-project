// Cron: AutoPilot hourly (every hour)
// Design Ref: ft-runtime-hardening §3.3 — createCronHandler 통일

import { createCronHandler } from '@/lib/api/cron-handler'
import { runAutoPilotCron } from '@/modules/ads/cron/autopilot-run'

const handler = createCronHandler(
  async (ctx) => {
    const result = await runAutoPilotCron(ctx)
    return {
      data: result,
      summary: `Processed ${result.profiles.length} profile(s)`,
    }
  },
  { name: 'autopilot-run', maxDuration: 300 },
)

export const GET = handler.GET
export const POST = handler.POST
export const maxDuration = 300
