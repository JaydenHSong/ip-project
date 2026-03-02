import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import type { SnapshotDiff, AiMarking } from '@/types/monitoring'

type MonitorRequest = {
  report_id: string
  initial_screenshot_url: string | null
  current_screenshot_url: string | null
  initial_listing_data: Record<string, unknown>
  current_listing_data: Record<string, unknown>
  diff: SnapshotDiff
}

type MonitorResponse = {
  remark: string
  marking_data: AiMarking[]
  resolution_suggestion: 'resolved' | 'unresolved' | 'continue'
  change_summary: string
}

// POST /api/ai/monitor
// Haiku로 스크린샷 비교 + 리마크 생성
export const POST = withAuth(async (req) => {
  const body = await req.json().catch(() => ({})) as Partial<MonitorRequest>

  if (!body.report_id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'report_id가 필요합니다.' } },
      { status: 400 },
    )
  }

  const diff = body.diff
  if (!diff) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'diff가 필요합니다.' } },
      { status: 400 },
    )
  }

  // TODO: 실제 Claude Haiku API 호출 구현
  // 현재는 diff 기반 간소화된 분석 로직

  const hasChanges = diff.listing_removed || diff.changes.length > 0
  const markingData: AiMarking[] = []

  let remark: string
  let suggestion: MonitorResponse['resolution_suggestion']
  let summary: string

  if (diff.listing_removed) {
    remark = 'The listing has been completely removed from Amazon. This indicates the violation report was effective and the seller or Amazon took action to remove the infringing product.'
    suggestion = 'resolved'
    summary = 'Listing removed'
  } else if (hasChanges) {
    const changedFields = diff.changes.map((c) => c.field).join(', ')
    remark = `Changes detected in the following fields: ${changedFields}. The seller appears to have modified the listing content. Review the changes to determine if the violation has been adequately addressed.`
    suggestion = 'resolved'
    summary = `Modified: ${changedFields}`

    diff.changes.forEach((change, i) => {
      markingData.push({
        x: 50,
        y: 40 + i * 60,
        width: 400,
        height: 25,
        label: `${change.field}: changed`,
        severity: 'high',
      })
    })
  } else {
    remark = 'No changes detected in the listing since the initial snapshot. The violation content remains unchanged. Continued monitoring is recommended.'
    suggestion = 'continue'
    summary = 'No changes'
  }

  const response: MonitorResponse = {
    remark,
    marking_data: markingData,
    resolution_suggestion: suggestion,
    change_summary: summary,
  }

  return NextResponse.json(response)
}, ['editor', 'admin'])
