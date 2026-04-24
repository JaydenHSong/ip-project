// Design Ref: ft-zod-validation §2.2, §4.1 — Reports feature Zod schemas.
//
// Plan SC-3: POST /api/ads/reports/export — exportReportSchema.

import { z } from 'zod'

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')

export const exportReportSchema = z.object({
  brand_market_id: z.string().min(1),
  campaign_ids: z.array(z.string().min(1)).optional(),
  date_from: isoDateSchema,
  date_to: isoDateSchema,
  // metrics is currently unused on the server (full row export). Kept loose for forward compat.
  metrics: z.array(z.string().min(1)).optional(),
  format: z.enum(['csv', 'xlsx']).optional(),
})
export type ExportReportInput = z.infer<typeof exportReportSchema>
