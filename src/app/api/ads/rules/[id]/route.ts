// PUT /api/ads/rules/[id] — Update rule
// DELETE /api/ads/rules/[id] — Delete rule

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdsAdminContext } from '@/lib/supabase/ads-context'
import { parseBody } from '@/lib/api/validate-body'
import { updateRuleSchema } from '@/modules/ads/features/rules/schemas'

// ─── PUT: Update rule ───

export const PUT = withAuth(async (req, { params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'Rule ID is required' } },
      { status: 400 },
    )
  }

  // Plan SC-3: Zod validation — partial update; status enum enforced.
  const parsed = await parseBody(req, updateRuleSchema)
  if (!parsed.success) return parsed.response
  const body = parsed.data

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.conditions !== undefined) updates.conditions = body.conditions
  if (body.actions !== undefined) updates.actions = body.actions
  if (body.priority !== undefined) updates.priority = body.priority
  if (body.status !== undefined) updates.status = body.status

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } },
      { status: 400 },
    )
  }

  try {
    const ctx = createAdsAdminContext()

    const { data, error } = await ctx.ads
      .from(ctx.adsTable('rules'))
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Rule not found' } },
        { status: 404 },
      )
    }

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['editor', 'admin', 'owner'])

// ─── DELETE: Delete rule ───

export const DELETE = withAuth(async (_req, { params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'Rule ID is required' } },
      { status: 400 },
    )
  }

  try {
    const ctx = createAdsAdminContext()

    const { data, error } = await ctx.ads
      .from(ctx.adsTable('rules'))
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['admin', 'owner'])
