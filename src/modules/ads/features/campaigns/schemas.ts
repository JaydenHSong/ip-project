// Design Ref: ft-zod-validation §2.2, §4.1 — Campaigns feature Zod schemas.
//
// Plan SC-3: Zod validation for POST /campaigns, PUT/PATCH /campaigns/[id], PATCH /campaigns/[id]/goal-mode.
// Covers the manual validation previously embedded in route handlers (target_acos range, goal_mode enum,
// required fields). Unknown fields are not rejected (loose parsing) to preserve forward compatibility
// with client payloads that may carry extra metadata.

import { z } from 'zod'

// ─── Shared primitives (aligned with @/modules/ads/shared/types/enums) ───

export const campaignTypeSchema = z.enum(['sp', 'sb', 'sd'])
export const campaignModeSchema = z.enum(['autopilot', 'manual'])
export const campaignStatusSchema = z.enum(['active', 'paused', 'learning', 'archived'])
export const matchTypeSchema = z.enum([
  'broad',
  'phrase',
  'exact',
  'negative',
  'negative_phrase',
])

const keywordInputSchema = z.object({
  text: z.string().min(1),
  match_type: matchTypeSchema,
  bid: z.number().nonnegative(),
})

const negativeKeywordInputSchema = z.object({
  text: z.string().min(1),
  match_type: matchTypeSchema,
})

// ─── POST /api/ads/campaigns ───

export const createCampaignSchema = z.object({
  brand_market_id: z.string().min(1),
  campaign_type: campaignTypeSchema,
  mode: campaignModeSchema,
  marketing_code: z.string().min(1),
  name: z.string().min(1).max(500),
  target_acos: z.number().min(1).max(100),
  daily_budget: z.number().positive().optional(),
  weekly_budget: z.number().positive().optional(),
  max_bid_cap: z.number().positive().optional(),
  targeting_type: z.enum(['keyword', 'product']).optional(),
  keywords: z.array(keywordInputSchema).optional(),
  negative_keywords: z.array(negativeKeywordInputSchema).optional(),
  product_asins: z.array(z.string().min(1)).optional(),
})
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>

// ─── PUT/PATCH /api/ads/campaigns/[id] ───
// Partial update. At least one field required — route handler already rejects empty updates.

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  status: campaignStatusSchema.optional(),
  target_acos: z.number().min(1).max(100).optional(),
  daily_budget: z.number().positive().optional(),
  weekly_budget: z.number().positive().optional(),
  max_bid_cap: z.number().positive().optional(),
  mode: campaignModeSchema.optional(),
  assigned_to: z.string().nullable().optional(),
})
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>

// ─── PATCH /api/ads/campaigns/[id]/goal-mode ───

export const goalModeSchema = z.object({
  goal_mode: z.enum(['launch', 'growth', 'profit', 'defend']),
})
export type GoalModeInput = z.infer<typeof goalModeSchema>
