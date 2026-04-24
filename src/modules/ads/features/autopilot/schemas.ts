// Design Ref: ft-zod-validation §2.2, §4.1 — Autopilot feature Zod schemas.
//
// Plan SC-3:
//   POST /api/ads/autopilot/run                 — runAutopilotSchema
//   PUT  /api/ads/autopilot/[id]/settings       — updateAutopilotSettingsSchema
//   POST /api/ads/autopilot/[id]/rollback       — rollbackAutopilotSchema

import { z } from 'zod'

// ─── POST /api/ads/autopilot/run ───

export const runAutopilotSchema = z.object({
  profile_id: z.string().min(1),
  campaign_ids: z.array(z.string().min(1)).optional(),
})
export type RunAutopilotInput = z.infer<typeof runAutopilotSchema>

// ─── PUT/PATCH /api/ads/autopilot/[id]/settings ───

export const updateAutopilotSettingsSchema = z.object({
  target_acos: z.number().min(1).max(100).optional(),
  weekly_budget: z.number().positive().optional(),
  daily_budget: z.number().positive().optional(),
  max_bid_cap: z.number().positive().optional(),
  // bid_strategy stays free-form to match Amazon's evolving values.
  bid_strategy: z.string().min(1).max(64).optional(),
})
export type UpdateAutopilotSettingsInput = z.infer<typeof updateAutopilotSettingsSchema>

// ─── POST /api/ads/autopilot/[id]/rollback ───

export const rollbackAutopilotSchema = z.object({
  log_ids: z.array(z.string().min(1)).min(1),
})
export type RollbackAutopilotInput = z.infer<typeof rollbackAutopilotSchema>
