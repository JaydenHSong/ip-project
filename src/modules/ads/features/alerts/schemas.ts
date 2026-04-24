// Design Ref: ft-zod-validation §2.2, §4.1 — Alerts feature Zod schemas.
//
// Plan SC-3: POST /api/ads/alerts/[id]/action — alertActionSchema.

import { z } from 'zod'

export const alertActionTypeSchema = z.enum(['dismiss', 'snooze', 'resolve', 'escalate'])

export const alertActionSchema = z.object({
  action: alertActionTypeSchema,
  // Free-form ISO 8601 — route handler defaults to "+24h" when omitted on snooze.
  snooze_until: z.string().min(1).optional(),
  note: z.string().max(2000).optional(),
})
export type AlertActionInput = z.infer<typeof alertActionSchema>
