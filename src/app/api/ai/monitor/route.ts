// AI 모니터링 API — Haiku Vision 스크린샷 비교
// POST /api/ai/monitor — 이전 vs 현재 스크린샷 비교 + 리마크 생성

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClaudeClient } from '@/lib/ai/client'
import { compareScreenshots, fallbackDiffAnalysis } from '@/lib/ai/monitor-compare'
import type { SnapshotDiff } from '@/types/monitoring'

type MonitorRequest = {
  report_id: string
  violation_type?: string
  initial_screenshot_url: string | null
  current_screenshot_url: string | null
  initial_listing_data: Record<string, unknown>
  current_listing_data: Record<string, unknown>
  diff: SnapshotDiff
}

// POST /api/ai/monitor
export const POST = withAuth(async (req) => {
  const body = await req.json().catch(() => ({})) as Partial<MonitorRequest>

  if (!body.report_id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'report_id is required' } },
      { status: 400 },
    )
  }

  const diff = body.diff
  if (!diff) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'diff is required' } },
      { status: 400 },
    )
  }

  // Haiku Vision 사용 가능 여부 확인
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (apiKey && body.initial_screenshot_url && body.current_screenshot_url) {
    try {
      const client = createClaudeClient(apiKey)
      const result = await compareScreenshots(client, {
        initialScreenshotUrl: body.initial_screenshot_url,
        currentScreenshotUrl: body.current_screenshot_url,
        diff,
        violationType: body.violation_type ?? 'unknown',
      })

      return NextResponse.json(result)
    } catch {
      // Haiku Vision 실패 시 fallback
    }
  }

  // Fallback: diff 기반 분석 (API Key 없거나, 스크린샷 없거나, Vision 실패 시)
  const result = fallbackDiffAnalysis(diff)
  return NextResponse.json(result)
}, ['owner', 'admin', 'editor'])
