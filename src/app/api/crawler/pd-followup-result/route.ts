import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyAdmins } from '@/lib/notifications'
import type { SnapshotDiff } from '@/types/monitoring'

type FollowupResultRequest = {
  report_id: string
  screenshot_url: string | null
  listing_data: Record<string, unknown>
  crawled_at: string
  listing_removed: boolean
}

// POST /api/crawler/pd-followup-result — 크롤러 PD 재방문 결과 수신
export const POST = async (req: Request): Promise<Response> => {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const serviceToken = process.env.CRAWLER_SERVICE_TOKEN

  if (!serviceToken || token !== serviceToken) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid service token' } },
      { status: 401 },
    )
  }

  const body = (await req.json()) as FollowupResultRequest

  if (!body.report_id || !body.crawled_at) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'report_id and crawled_at required' } },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  // 리포트 확인
  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('id, status')
    .eq('id', body.report_id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Report not found' } },
      { status: 404 },
    )
  }

  if (report.status !== 'monitoring') {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Only monitoring reports accept followup results' } },
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

  // crawler_logs 기록
  void supabase.from('crawler_logs').insert({
    type: 'pd_followup',
    message: changeDetected
      ? `PD follow-up: ${changeType} detected for report ${body.report_id}`
      : `PD follow-up: no change for report ${body.report_id}`,
  })

  // 변화 감지 시 Admin 알림
  if (changeDetected) {
    await notifyAdmins({
      type: 'followup_change_detected',
      title: 'PD Change Detected',
      message: `Change detected in report ${body.report_id}: ${changeType}`,
      metadata: { report_id: body.report_id, change_type: changeType },
    })
  }

  return NextResponse.json({
    snapshot_id: snapshot?.id,
    change_detected: changeDetected,
    change_type: changeType,
    ai_resolution_suggestion: aiSuggestion,
  })
}

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
