// Design Ref: ft-zod-validation §2.2, §4.1 — Budget planning Zod schemas.
//
// Plan SC-3: PUT /api/ads/budgets validation.
// Mirrors SaveBudgetRequest. org_unit_id is optional — resolveBudgetOrgUnitId fills default.

import { z } from 'zod'

export const budgetChannelSchema = z.enum(['sp', 'sb', 'sd', 'total'])

const budgetEntrySchema = z.object({
  channel: budgetChannelSchema,
  month: z.number().int().min(1).max(12),
  amount: z.number().nonnegative(),
})

export const saveBudgetSchema = z.object({
  brand_market_id: z.string().min(1),
  year: z.number().int().min(2020).max(2100),
  org_unit_id: z.string().nullable().optional(),
  entries: z.array(budgetEntrySchema).min(1),
})
export type SaveBudgetInput = z.infer<typeof saveBudgetSchema>
