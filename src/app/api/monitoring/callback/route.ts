import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { notifyAdmins } from '@/lib/notifications'
import type { MonitoringCallbackPayload, SnapshotDiff } from '@/types/monitoring'

// POST /api/monitoring/callback
// 크롤러 재방문 결과 수신 + AI 분석 트리거
export const POST = withAuth(async (req, { user }) => {
  const body = await req.json().catch(() => ({})) as MonitoringCallbackPayload

  if (!body.report_id || !body.crawled_at) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'report_id와 crawled_at이 필요합니다.' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  // 신고 확인
  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('id, status')
    .eq('id', body.report_id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '신고를 찾을 수 없습니다.' } },
      { status: 404 },
    )
  }

  if (report.status !== 'monitoring') {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'monitoring 상태의 신고만 콜백 가능합니다.' } },
      { status: 400 },
    )
  }

  // 초기 스냅샷 조회
  const { data: initialSnapshot } = await supabase
    .from('report_snapshots')
    .select('listing_data')
    .eq('report_id', body.report_id)
    .eq('snapshot_type', 'initial')
    .single()

  // diff 계산
  const diff = computeDiff(initialSnapshot?.listing_data ?? {}, body.listing_data, body.listing_removed)
  const changeDetected = body.listing_removed || diff.changes.length > 0
  const changeType = body.listing_removed
    ? 'listing_removed' as const
    : diff.seller_changed
      ? 'seller_changed' as const
      : diff.changes.length > 0
        ? 'content_modified' as const
        : 'no_change' as const

  // AI 분석 (간소화 — 실제로는 /api/ai/monitor 호출)
  const aiRemark = changeDetected
    ? `Changes detected: ${diff.changes.map((c) => c.field).join(', ')}`
    : 'No changes detected since last visit.'

  const aiSuggestion = body.listing_removed
    ? 'resolved' as const
    : changeDetected
      ? 'resolved' as const
      : 'continue' as const

  // 스냅샷 저장
  const { data: snapshot, error: insertError } = await supabase
    .from('report_snapshots')
    .insert({
      report_id: body.report_id,
      snapshot_type: 'followup',
      screenshot_url: body.screenshot_url,
      listing_data: body.listing_data,
      diff_from_initial: diff,
      change_detected: changeDetected,
      change_type: changeType,
      ai_remark: aiRemark,
      ai_marking_data: [],
      ai_resolution_suggestion: aiSuggestion,
      crawled_at: body.crawled_at,
    })
    .select('id')
    .single()

  if (insertError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: insertError.message } },
      { status: 500 },
    )
  }

  // 변화 감지 시 모든 Admin에게 알림
  if (changeDetected) {
    await notifyAdmins({
      type: 'followup_change_detected',
      title: 'Change Detected',
      message: `Change detected in report ${body.report_id}: ${changeType}`,
      metadata: { report_id: body.report_id, change_type: changeType },
    })
  }

  // 감사 로그
  void supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'monitoring_callback',
    resource_type: 'report',
    resource_id: body.report_id,
    details: { change_detected: changeDetected, change_type: changeType },
  })

  return NextResponse.json({
    snapshot_id: snapshot?.id,
    change_detected: changeDetected,
    ai_resolution_suggestion: aiSuggestion,
  })
}, ['owner', 'admin', 'editor'])

const computeDiff = (
  initial: Record<string, unknown>,
  current: Record<string, unknown>,
  listingRemoved: boolean,
): SnapshotDiff => {
  if (listingRemoved) {
    return {
      title_changed: false,
      description_changed: false,
      images_changed: false,
      price_changed: false,
      seller_changed: false,
      listing_removed: true,
      changes: [{ field: 'listing', before: 'active', after: 'removed' }],
    }
  }

  const changes: { field: string; before: string | null; after: string | null }[] = []

  const fields = ['title', 'description', 'price', 'seller', 'images']
  for (const field of fields) {
    const before = String(initial[field] ?? '')
    const after = String(current[field] ?? '')
    if (before !== after) {
      changes.push({ field, before: before || null, after: after || null })
    }
  }

  return {
    title_changed: changes.some((c) => c.field === 'title'),
    description_changed: changes.some((c) => c.field === 'description'),
    images_changed: changes.some((c) => c.field === 'images'),
    price_changed: changes.some((c) => c.field === 'price'),
    seller_changed: changes.some((c) => c.field === 'seller'),
    listing_removed: false,
    changes,
  }
}
