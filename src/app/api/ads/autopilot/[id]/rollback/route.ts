// POST /api/ads/autopilot/[id]/rollback — Rollback AI actions (S09)
// Design Ref: §4.2

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { parseBody } from '@/lib/api/validate-body'
import { rollbackActions } from '@/modules/ads/features/autopilot/queries'
import { rollbackAutopilotSchema } from '@/modules/ads/features/autopilot/schemas'

export const POST = withAuth(async (req, { user }) => {
  // Plan SC-3: Zod validation — log_ids array required, min 1.
  const parsed = await parseBody(req, rollbackAutopilotSchema)
  if (!parsed.success) return parsed.response
  const body = parsed.data

  try {
    const result = await rollbackActions(body.log_ids, user.id)
    return NextResponse.json({ data: result })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['editor', 'admin', 'owner'])
