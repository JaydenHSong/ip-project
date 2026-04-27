// Design Ref: ft-zod-validation §2.2, §4.1 — Optimization (dayparting) Zod schemas.
//
// Plan SC-3:
//   POST /api/ads/dayparting/ai-schedule    — aiScheduleSchema
//   PUT  /api/ads/dayparting/schedules      — updateDaypartingSchema
//
// schedule_data shape varies (heatmap cells, hour weights). Kept opaque (z.unknown)
// because the dayparting engine does its own structural validation downstream.

import { z } from 'zod'

// ─── POST /api/ads/dayparting/ai-schedule ───

export const aiScheduleSchema = z.object({
  brand_market_id: z.string().min(1),
  schedule_name: z.string().min(1).max(200),
  schedule_data: z.unknown().refine((v) => v !== null && v !== undefined, {
    message: 'schedule_data is required',
  }),
})
export type AiScheduleInput = z.infer<typeof aiScheduleSchema>

// ─── PUT /api/ads/dayparting/schedules ───
// Note: id travels in the body (no [id] route segment), so it's required here.

export const updateDaypartingSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  schedule_data: z.unknown().optional(),
  is_active: z.boolean().optional(),
})
export type UpdateDaypartingInput = z.infer<typeof updateDaypartingSchema>
