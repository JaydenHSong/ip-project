// 임시 테스트용 — sync-campaigns 수동 트리거 (나중에 삭제)
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { syncCampaigns } from '@/modules/ads/cron/sync-campaigns'

export const GET = withAuth(async () => {
  try {
    const result = await syncCampaigns()
    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}, ['admin', 'owner'])
