// Design Ref: ft-zod-validation §2.2, §4.1 — Rules feature Zod schemas.
//
// Plan SC-3: POST /api/ads/rules, PUT /api/ads/rules/[id], POST /api/ads/rules/simulate.
// conditions/actions stay opaque (z.unknown) — rule DSL is validated downstream by engine.

import { z } from 'zod'

// ─── Shared primitives ───

// Intentionally not an enum yet — ads.rules.rule_type accepts free-form strings in DB.
const ruleTypeSchema = z.string().min(1).max(100)
const ruleStatusSchema = z.enum(['active', 'paused', 'archived'])

// ─── POST /api/ads/rules ───

export const createRuleSchema = z.object({
  brand_market_id: z.string().min(1),
  rule_type: ruleTypeSchema,
  name: z.string().min(1).max(200),
  conditions: z.unknown().refine((v) => v !== null && v !== undefined, {
    message: 'conditions is required',
  }),
  actions: z.unknown().refine((v) => v !== null && v !== undefined, {
    message: 'actions is required',
  }),
  priority: z.number().int().min(0).optional(),
})
export type CreateRuleInput = z.infer<typeof createRuleSchema>

// ─── PUT/PATCH /api/ads/rules/[id] ───

export const updateRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  conditions: z.unknown().optional(),
  actions: z.unknown().optional(),
  priority: z.number().int().min(0).optional(),
  status: ruleStatusSchema.optional(),
})
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>

// ─── POST /api/ads/rules/simulate ───

export const simulateRuleSchema = z.object({
  brand_market_id: z.string().min(1),
  rule_type: ruleTypeSchema,
  conditions: z.unknown().refine((v) => v !== null && v !== undefined, {
    message: 'conditions is required',
  }),
  actions: z.unknown().refine((v) => v !== null && v !== undefined, {
    message: 'actions is required',
  }),
  lookback_days: z.number().int().min(1).max(90).optional(),
})
export type SimulateRuleInput = z.infer<typeof simulateRuleSchema>
