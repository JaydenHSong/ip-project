// Design Ref: ft-zod-validation §2.2, §4.1 — Amazon integration Zod schemas.
//
// Plan SC-3:
//   POST /api/ads/amazon/sync                       — amazonSyncSchema
//   POST /api/ads/amazon/profiles/[id]/connect      — connectProfileSchema

import { z } from 'zod'

// ─── POST /api/ads/amazon/sync ───
// Body fully optional; type defaults to 'all'.

export const syncTypeSchema = z.enum(['campaigns', 'reports', 'keywords', 'all'])

export const amazonSyncSchema = z.object({
  type: syncTypeSchema.optional(),
})
export type AmazonSyncInput = z.infer<typeof amazonSyncSchema>

// ─── POST /api/ads/amazon/profiles/[id]/connect ───

export const connectProfileSchema = z.object({
  marketplace_id: z.string().min(1),
})
export type ConnectProfileInput = z.infer<typeof connectProfileSchema>
