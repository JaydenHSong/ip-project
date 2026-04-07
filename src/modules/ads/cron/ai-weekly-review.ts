// AD Optimizer — AI Weekly Review Cron (FR-06)
// Design Ref: §5 — Schedule: 0 8 * * 1 (매주 월요일 8AM UTC)
// Plan SC: AI 판단 근거 100% 로그

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CampaignSummary } from '../engine/autopilot/prompts/weekly-review'
import { fetchAutoPilotCampaigns, fetchMetricsSnapshot } from './autopilot-run'
import { runWeeklyReview } from '../engine/autopilot/ai-reviewer'

type WeeklyReviewCronResult = {
  campaigns_reviewed: number
  recommendations_count: number
  tokens_used: number
  model_used: string
  errors: string[]
}

/** Weekly AI review: analyze all autopilot campaigns and store recommendations. */
async function runWeeklyReviewCron(
  profileId: string,
  db: SupabaseClient,
): Promise<WeeklyReviewCronResult> {
  const result: WeeklyReviewCronResult = {
    campaigns_reviewed: 0, recommendations_count: 0,
    tokens_used: 0, model_used: '', errors: [],
  }

  try {
    const campaigns = await fetchAutoPilotCampaigns(profileId, db)
    if (!campaigns.length) return result

    // Build campaign summaries with metrics + top/bottom keywords
    const summaries: CampaignSummary[] = []

    for (const campaign of campaigns) {
      const metrics = await fetchMetricsSnapshot(campaign.campaign_id, db)
      const { topKw, bottomKw } = await fetchKeywordSummaries(campaign.campaign_id, db)

      // Fetch campaign name
      const { data: nameRow } = await db
        .from('ads.campaigns')
        .select('name')
        .eq('id', campaign.campaign_id)
        .single()

      summaries.push({
        id: campaign.campaign_id,
        name: (nameRow?.name as string) ?? campaign.campaign_id,
        goal_mode: campaign.goal_mode,
        target_acos: campaign.target_acos,
        acos_7d: metrics.acos_7d,
        spend_7d: metrics.spend_7d,
        sales_7d: metrics.sales_7d,
        orders_7d: metrics.orders_7d,
        impressions_7d: metrics.impressions_7d,
        clicks_7d: metrics.clicks_7d,
        top_keywords: topKw,
        bottom_keywords: bottomKw,
      })
    }

    const periodEnd = new Date().toISOString().slice(0, 10)
    const periodStart = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

    const output = await runWeeklyReview({
      period_start: periodStart,
      period_end: periodEnd,
      campaigns: summaries,
    })

    // Store review in DB
    await db.from('ads.ai_reviews').insert({
      marketplace_profile_id: profileId,
      review_type: 'weekly',
      review_period_start: periodStart,
      review_period_end: periodEnd,
      input_summary: { campaigns: summaries.map(s => ({ id: s.id, name: s.name, acos_7d: s.acos_7d })) },
      recommendations: output.recommendations,
      model_used: output.model_used,
      tokens_used: output.tokens_used,
    })

    result.campaigns_reviewed = summaries.length
    result.recommendations_count = output.recommendations.length
    result.tokens_used = output.tokens_used
    result.model_used = output.model_used
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : 'Unknown error')
  }

  return result
}

// ─── Internal helpers ───

type KwSummary = { text: string; acos: number; orders: number }
type KwBottomSummary = { text: string; acos: number; spend: number }

async function fetchKeywordSummaries(
  campaignId: string,
  db: SupabaseClient,
): Promise<{ topKw: KwSummary[]; bottomKw: KwBottomSummary[] }> {
  // Top: highest orders, low ACoS
  const { data: top } = await db
    .from('ads.keywords')
    .select('keyword_text, acos_7d, orders_7d')
    .eq('campaign_id', campaignId)
    .eq('state', 'enabled')
    .gt('orders_7d', 0)
    .order('orders_7d', { ascending: false })
    .limit(5)

  // Bottom: high spend, zero orders
  const { data: bottom } = await db
    .from('ads.keywords')
    .select('keyword_text, acos_7d, spend_7d')
    .eq('campaign_id', campaignId)
    .eq('state', 'enabled')
    .eq('orders_7d', 0)
    .gt('spend_7d', 0)
    .order('spend_7d', { ascending: false })
    .limit(5)

  type Row = Record<string, unknown>
  const topKw = (top ?? []).map(r => ({
    text: (r as Row).keyword_text as string,
    acos: ((r as Row).acos_7d as number) ?? 0,
    orders: ((r as Row).orders_7d as number) ?? 0,
  }))

  const bottomKw = (bottom ?? []).map(r => ({
    text: (r as Row).keyword_text as string,
    acos: ((r as Row).acos_7d as number) ?? 0,
    spend: ((r as Row).spend_7d as number) ?? 0,
  }))

  return { topKw, bottomKw }
}

export { runWeeklyReviewCron }
export type { WeeklyReviewCronResult }
