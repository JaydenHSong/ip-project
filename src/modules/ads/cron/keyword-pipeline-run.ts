// AD Optimizer — Keyword Pipeline Daily Cron (FR-05)
// Design Ref: §5 — Schedule: 0 6 * * * (매일 6AM UTC)
// Design Ref: ft-runtime-hardening §3.4 — ctx 주입 entry point
// Plan SC: SC-05 키워드 수확, SC-06 키워드 제거

import type { AdsAdminContext, AnyAdsDb } from '@/lib/supabase/ads-context'
import { createWriteBackService } from '@/modules/ads/api/factory'
import type { WriteBackAction } from '../api/services/write-back-service'
import { fetchAutoPilotCampaigns } from './autopilot-run'
import { runKeywordPipeline } from '../engine/autopilot/keyword-pipeline'
import { getLearningPhase, getConstraints } from '../engine/autopilot/learning-guard'

type PipelineCronResult = {
  promoted: number
  negated: number
  skipped: number
  errors: string[]
}

type PipelineCronBatchResult = {
  profiles: Array<{ profile_id: string } & PipelineCronResult>
  message?: string
}

/** Daily keyword pipeline for a single profile: harvest + negate for all autopilot campaigns. */
async function runKeywordPipelineForProfile(
  profileId: string,
  db: AnyAdsDb,
  executeBatch: (actions: WriteBackAction[]) => Promise<unknown>,
): Promise<PipelineCronResult> {
  const result: PipelineCronResult = { promoted: 0, negated: 0, skipped: 0, errors: [] }

  try {
    const campaigns = await fetchAutoPilotCampaigns(profileId, db)
    if (!campaigns.length) return result

    // Filter by learning phase — week1 cannot harvest/negate
    const eligible = campaigns.filter(c => {
      const phase = getLearningPhase(c.learning_day, c.confidence_score)
      const constraints = getConstraints(phase)
      return constraints.allow_harvest || constraints.allow_negate
    })

    if (!eligible.length) return result

    const pipelineResult = await runKeywordPipeline(profileId, eligible, db)

    // Build WriteBackActions for promoted keywords
    const actions: WriteBackAction[] = []

    for (const promo of pipelineResult.promoted) {
      actions.push({
        type: 'keyword_add',
        campaign_id: promo.campaign_id,
        current_value: 0,
        proposed_value: 1,
        details: {
          reason: `Auto harvest: "${promo.search_term}" promoted from ${promo.from_match} to exact`,
          source: 'autopilot_formula',
          keywords: [{ keyword_text: promo.search_term, match_type: 'exact', bid: 0.5 }],
        },
      })
    }

    for (const neg of pipelineResult.negated) {
      actions.push({
        type: 'keyword_negate',
        campaign_id: neg.keyword_id,
        keyword_id: neg.keyword_id,
        current_value: 1,
        proposed_value: 0,
        details: {
          reason: `Auto negate: ${neg.reason}`,
          source: 'autopilot_formula',
        },
      })
    }

    if (actions.length > 0) {
      await executeBatch(actions)
    }

    result.promoted = pipelineResult.promoted.length
    result.negated = pipelineResult.negated.length
    result.skipped = pipelineResult.skipped_harvest + pipelineResult.skipped_negate
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : 'Unknown error')
  }

  return result
}

/**
 * Cron entry point: iterate over all active profiles and run keyword pipeline.
 * Called by /api/ads/cron/keyword-pipeline route via createCronHandler.
 * Design Ref: ft-runtime-hardening §3.4
 */
async function runKeywordPipelineCron(ctx: AdsAdminContext): Promise<PipelineCronBatchResult> {
  const { data: profiles, error } = await ctx.ads
    .from(ctx.adsTable('marketplace_profiles'))
    .select('id')
    .eq('status', 'active')

  if (error) {
    throw new Error(`Failed to fetch marketplace profiles: ${error.message}`)
  }

  if (!profiles?.length) {
    return { profiles: [], message: 'No active profiles' }
  }

  const results = await Promise.all(
    profiles.map(async (p) => {
      const pid = p.id as string
      const wbService = createWriteBackService(pid)
      const profileResult = await runKeywordPipelineForProfile(
        pid,
        ctx.ads,
        (actions) => wbService.executeBatch(actions as WriteBackAction[]),
      )
      return { profile_id: pid, ...profileResult }
    }),
  )

  return { profiles: results }
}

export { runKeywordPipelineCron, runKeywordPipelineForProfile }
export type { PipelineCronResult, PipelineCronBatchResult }
