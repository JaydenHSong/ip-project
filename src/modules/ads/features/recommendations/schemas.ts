// Design Ref: ft-zod-validation §2.2, §4.1 — Recommendations feature Zod schemas.
//
// Plan SC-3:
//   POST /api/ads/recommendations/[id]/approve  — approveRecommendationSchema
//   POST /api/ads/recommendations/[id]/skip      — skipRecommendationSchema

import { z } from 'zod'

// ─── POST /approve ───
// Body is fully optional — when present, adjusted_bid overrides the suggested bid.

export const approveRecommendationSchema = z.object({
  adjusted_bid: z.number().nonnegative().optional(),
})
export type ApproveRecommendationInput = z.infer<typeof approveRecommendationSchema>

// ─── POST /skip ───
// brand_market_id is required for tenant scoping.

export const skipRecommendationSchema = z.object({
  brand_market_id: z.string().min(1),
})
export type SkipRecommendationInput = z.infer<typeof skipRecommendationSchema>
