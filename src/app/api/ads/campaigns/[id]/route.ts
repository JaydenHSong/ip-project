// GET /api/ads/campaigns/[id] — Campaign detail (M02)
// PUT /api/ads/campaigns/[id] — Update campaign (kept for backwards compat)
// PATCH /api/ads/campaigns/[id] — Update campaign (RESTful partial update, preferred)
// DELETE /api/ads/campaigns/[id] — Archive campaign
// Design Ref: §4.2
// L3 fix: PATCH alias added so clients can use the RESTful verb for partial updates.

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { getCampaignById, updateCampaign, archiveCampaign } from '@/modules/ads/features/campaigns/queries'
import type { UpdateCampaignRequest } from '@/modules/ads/features/campaigns/types'

// ─── GET: Campaign detail ───

export const GET = withAuth(async (_req, { params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'Campaign ID is required' } },
      { status: 400 },
    )
  }

  try {
    const data = await getCampaignById(id)

    if (!data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Campaign not found' } },
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
}, ['viewer', 'viewer_plus', 'editor', 'admin', 'owner'])

// ─── PUT: Update campaign ───

export const PUT = withAuth(async (req, { params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'Campaign ID is required' } },
      { status: 400 },
    )
  }

  const body = await req.json() as UpdateCampaignRequest

  // Validate target_acos if provided
  if (body.target_acos != null && (body.target_acos < 1 || body.target_acos > 100)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'target_acos must be between 1 and 100' } },
      { status: 400 },
    )
  }

  // Only allow specific fields to be updated
  const allowedFields: (keyof UpdateCampaignRequest)[] = [
    'name', 'status', 'target_acos', 'daily_budget',
    'weekly_budget', 'max_bid_cap', 'mode', 'assigned_to',
  ]

  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } },
      { status: 400 },
    )
  }

  try {
    const data = await updateCampaign(id, updates)
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['editor', 'admin', 'owner'])

// ─── PATCH: alias of PUT for RESTful partial updates (L3 fix) ───
// Same behavior as PUT; exists so clients can use the semantically correct verb.
export const PATCH = PUT

// ─── DELETE: Archive campaign (soft delete) ───

export const DELETE = withAuth(async (_req, { params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'Campaign ID is required' } },
      { status: 400 },
    )
  }

  try {
    const data = await archiveCampaign(id)
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['admin', 'owner'])
