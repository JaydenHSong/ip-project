// GET /api/ads/autopilot/[id] — Auto Pilot detail + activity log (S09)
// Design Ref: §4.2

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { getAutopilotDetail } from '@/modules/ads/features/autopilot/queries'

export const GET = withAuth(async (_req, { params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'Campaign ID is required' } },
      { status: 400 },
    )
  }

  try {
    const result = await getAutopilotDetail(id)
    return NextResponse.json({ data: result })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['viewer', 'viewer_plus', 'editor', 'admin', 'owner'])
