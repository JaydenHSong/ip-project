// POST /api/ads/alerts/[id]/action — Quick action on alert

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdsAdminContext } from '@/lib/supabase/ads-context'

export const POST = withAuth(async (req, { params, user }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'Alert ID is required' } },
      { status: 400 },
    )
  }

  const body = await req.json() as {
    action: 'dismiss' | 'snooze' | 'resolve' | 'escalate'
    snooze_until?: string
    note?: string
  }

  if (!body.action) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'action is required (dismiss | snooze | resolve | escalate)' } },
      { status: 400 },
    )
  }

  try {
    const ctx = createAdsAdminContext()

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      actioned_by: user.id,
    }

    switch (body.action) {
      case 'dismiss':
        updates.status = 'dismissed'
        break
      case 'snooze':
        updates.status = 'snoozed'
        updates.snoozed_until = body.snooze_until ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        break
      case 'resolve':
        updates.status = 'resolved'
        updates.resolved_at = new Date().toISOString()
        break
      case 'escalate':
        updates.status = 'escalated'
        break
    }

    if (body.note) {
      updates.action_note = body.note
    }

    const { data, error } = await ctx.ads
      .from(ctx.adsTable('alerts'))
      .update(updates)
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
}, ['editor', 'admin', 'owner'])
