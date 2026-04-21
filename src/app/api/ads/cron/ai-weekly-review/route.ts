// Cron: Claude AI review (weekly Mon 8AM UTC)
// Design Ref: ft-runtime-hardening §3.3 — createCronHandler 통일

import { createCronHandler } from '@/lib/api/cron-handler'
import { runWeeklyReviewCron } from '@/modules/ads/cron/ai-weekly-review'

const handler = createCronHandler(
  async (ctx) => {
    const result = await runWeeklyReviewCron(ctx)
    return {
      data: result,
      summary: `Reviewed ${result.profiles.length} profile(s)`,
    }
  },
  { name: 'ai-weekly-review', maxDuration: 300 },
)

export const GET = handler.GET
export const POST = handler.POST
export const maxDuration = 300
