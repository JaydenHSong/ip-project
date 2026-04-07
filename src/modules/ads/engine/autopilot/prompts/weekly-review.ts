// AD Optimizer — Weekly Review Prompt Template (FR-06)
// Design Ref: §3.10 — Claude prompt 구조
// Plan SC: AI 판단 근거 100% 로그

type CampaignSummary = {
  id: string
  name: string
  goal_mode: string
  target_acos: number
  acos_7d: number | null
  spend_7d: number
  sales_7d: number
  orders_7d: number
  impressions_7d: number
  clicks_7d: number
  top_keywords: { text: string; acos: number; orders: number }[]
  bottom_keywords: { text: string; acos: number; spend: number }[]
}

type WeeklyReviewPromptInput = {
  period_start: string
  period_end: string
  campaigns: CampaignSummary[]
}

function buildWeeklyReviewPrompt(input: WeeklyReviewPromptInput): string {
  const campaignBlocks = input.campaigns.map(c => {
    const topKw = c.top_keywords.length > 0
      ? c.top_keywords.map(k => `  - "${k.text}" ACoS ${k.acos}%, Orders ${k.orders}`).join('\n')
      : '  (no data)'
    const bottomKw = c.bottom_keywords.length > 0
      ? c.bottom_keywords.map(k => `  - "${k.text}" ACoS ${k.acos}%, Spend $${k.spend.toFixed(2)}`).join('\n')
      : '  (no data)'

    return `### ${c.name} (Goal: ${c.goal_mode}, Target ACoS: ${c.target_acos}%)
- 7d Metrics: ACoS ${c.acos_7d ?? 'N/A'}%, Spend $${c.spend_7d.toFixed(2)}, Sales $${c.sales_7d.toFixed(2)}, Orders ${c.orders_7d}
- Impressions: ${c.impressions_7d.toLocaleString()}, Clicks: ${c.clicks_7d.toLocaleString()}
- Top Keywords:\n${topKw}
- Bottom Keywords:\n${bottomKw}`
  }).join('\n\n')

  return `You are an Amazon Ads optimization expert analyzing a Spigen campaign portfolio.

## Context
- Brand: Spigen (phone cases, screen protectors, accessories)
- Market: US
- Period: ${input.period_start} ~ ${input.period_end}

## Campaigns
${campaignBlocks}

## Task
Analyze each campaign and provide recommendations as a JSON array.
Each recommendation must have these fields:
- campaign_id: string (from the campaigns above)
- recommendation_type: "goal_mode_change" | "bid_strategy" | "keyword_insight" | "budget_realloc"
- current_value: string (current state)
- suggested_value: string (suggested change)
- reasoning: string (in Korean, 2-3 sentences)
- confidence: number (0-1)
- priority: "high" | "medium" | "low"

Focus on:
1. Goal Mode 전환 시점 (Launch→Growth, Growth→Profit 등)
2. 예산 재배분 기회
3. 키워드 전략 인사이트 (경쟁 과열, long-tail 기회 등)
4. 위험 신호 (ACoS 급등, 전환율 하락 등)

Respond ONLY with a valid JSON array. No markdown, no explanation outside the array.`
}

export { buildWeeklyReviewPrompt }
export type { WeeklyReviewPromptInput, CampaignSummary }
