// AD Optimizer — AutoPilot AI Reviewer (FR-06)
// Design Ref: §3.9 — Claude 주간 전략 리뷰
// Plan SC: AI 판단 근거 100% 로그, Goal Mode 전환 추천

import { createClaudeClient } from '@/lib/ai/client'
import { buildWeeklyReviewPrompt } from './prompts/weekly-review'
import type { WeeklyReviewPromptInput } from './prompts/weekly-review'

type AiRecommendation = {
  campaign_id: string
  recommendation_type: 'goal_mode_change' | 'bid_strategy' | 'keyword_insight' | 'budget_realloc'
  current_value: string
  suggested_value: string
  reasoning: string
  confidence: number
  priority: 'high' | 'medium' | 'low'
}

type AiReviewOutput = {
  recommendations: AiRecommendation[]
  portfolio_summary: string
  tokens_used: number
  model_used: string
}

const AI_REVIEW_MODEL = 'claude-sonnet-4-6'
const AI_REVIEW_MAX_TOKENS = 4096

/**
 * Run weekly AI review for a profile's autopilot campaigns.
 * Uses Claude to analyze 7d metrics and generate strategic recommendations.
 */
async function runWeeklyReview(input: WeeklyReviewPromptInput): Promise<AiReviewOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  if (!input.campaigns.length) {
    return {
      recommendations: [],
      portfolio_summary: 'No autopilot campaigns to review.',
      tokens_used: 0,
      model_used: AI_REVIEW_MODEL,
    }
  }

  const client = createClaudeClient(apiKey)
  const prompt = buildWeeklyReviewPrompt(input)

  const response = await client.call({
    model: AI_REVIEW_MODEL,
    systemPrompt: 'You are an expert Amazon PPC analyst. Output only valid JSON.',
    messages: [{ role: 'user', content: prompt }],
    maxTokens: AI_REVIEW_MAX_TOKENS,
    temperature: 0.2,
  })

  const recommendations = parseRecommendations(response.content)
  const summary = buildPortfolioSummary(input, recommendations)

  return {
    recommendations,
    portfolio_summary: summary,
    tokens_used: response.inputTokens + response.outputTokens,
    model_used: AI_REVIEW_MODEL,
  }
}

/** Parse Claude's JSON response into typed recommendations. */
function parseRecommendations(raw: string): AiRecommendation[] {
  try {
    const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned) as unknown[]

    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null &&
        'campaign_id' in item && 'recommendation_type' in item)
      .map(item => ({
        campaign_id: String(item.campaign_id),
        recommendation_type: validateRecommendationType(String(item.recommendation_type)),
        current_value: String(item.current_value ?? ''),
        suggested_value: String(item.suggested_value ?? ''),
        reasoning: String(item.reasoning ?? ''),
        confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0.5)),
        priority: validatePriority(String(item.priority)),
      }))
  } catch {
    return []
  }
}

function validateRecommendationType(val: string): AiRecommendation['recommendation_type'] {
  const valid = ['goal_mode_change', 'bid_strategy', 'keyword_insight', 'budget_realloc'] as const
  return (valid as readonly string[]).includes(val)
    ? val as AiRecommendation['recommendation_type']
    : 'bid_strategy'
}

function validatePriority(val: string): AiRecommendation['priority'] {
  const valid = ['high', 'medium', 'low'] as const
  return (valid as readonly string[]).includes(val)
    ? val as AiRecommendation['priority']
    : 'medium'
}

/** Generate one-line portfolio summary from input and recommendations. */
function buildPortfolioSummary(
  input: WeeklyReviewPromptInput,
  recs: AiRecommendation[],
): string {
  const count = input.campaigns.length
  const totalSpend = input.campaigns.reduce((s, c) => s + c.spend_7d, 0)
  const totalSales = input.campaigns.reduce((s, c) => s + c.sales_7d, 0)
  const highPriority = recs.filter(r => r.priority === 'high').length

  return `${count} campaigns reviewed ($${totalSpend.toFixed(0)} spend, $${totalSales.toFixed(0)} sales). ${recs.length} recommendations (${highPriority} high priority).`
}

export { runWeeklyReview, parseRecommendations }
export type { AiRecommendation, AiReviewOutput }
