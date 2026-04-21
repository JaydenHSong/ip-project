// Cron: Keyword harvest/negate (daily 6AM UTC)
// Design Ref: ft-runtime-hardening §3.3 — createCronHandler 통일

import { createCronHandler } from '@/lib/api/cron-handler'
import { runKeywordPipelineCron } from '@/modules/ads/cron/keyword-pipeline-run'

const handler = createCronHandler(
  async (ctx) => {
    const result = await runKeywordPipelineCron(ctx)
    return {
      data: result,
      summary: `Processed ${result.profiles.length} profile(s)`,
    }
  },
  { name: 'keyword-pipeline', maxDuration: 300 },
)

export const GET = handler.GET
export const POST = handler.POST
export const maxDuration = 300
