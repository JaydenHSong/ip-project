// Design Ref: ft-zod-validation §2.2, §4.1 — Keywords feature Zod schemas.
//
// Plan SC-3: POST /api/ads/keywords (bulk create), PUT/PATCH /api/ads/keywords/[id].

import { z } from 'zod'

// Bid matches allowed Amazon types; keywords table rejects 'negative' / 'negative_phrase' here
// since those are stored separately. Match types are restricted to the positive set.
export const keywordMatchTypeSchema = z.enum(['broad', 'phrase', 'exact'])

// DB default is 'enabled'; common values observed: enabled / paused / archived.
const keywordStateSchema = z.enum(['enabled', 'paused', 'archived'])

const keywordItemSchema = z.object({
  keyword_text: z.string().min(1).max(200),
  match_type: keywordMatchTypeSchema,
  bid: z.number().nonnegative(),
  state: keywordStateSchema.optional(),
})

// ─── POST /api/ads/keywords (bulk) ───

export const createKeywordsSchema = z.object({
  campaign_id: z.string().min(1),
  keywords: z.array(keywordItemSchema).min(1),
})
export type CreateKeywordsInput = z.infer<typeof createKeywordsSchema>

// ─── PUT/PATCH /api/ads/keywords/[id] ───

export const updateKeywordSchema = z.object({
  bid: z.number().nonnegative().optional(),
  state: keywordStateSchema.optional(),
  match_type: keywordMatchTypeSchema.optional(),
})
export type UpdateKeywordInput = z.infer<typeof updateKeywordSchema>
