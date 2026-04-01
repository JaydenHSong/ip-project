// POST /api/ads/autopilot/[id]/rollback — Rollback AI actions (S09)
// Design Ref: §4.2

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { rollbackActions } from '@/modules/ads/features/autopilot/queries'
import type { RollbackRequest } from '@/modules/ads/features/autopilot/types'

export const POST = withAuth(async (req, { user }) => {
  try {
    const body = await req.json() as RollbackRequest

    if (!body.log_ids?.length) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'log_ids array is required' } },
        { status: 400 },
      )
    }

    const result = await rollbackActions(body.log_ids, user.id)
    return NextResponse.json({ data: result })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['editor', 'admin', 'owner'])
