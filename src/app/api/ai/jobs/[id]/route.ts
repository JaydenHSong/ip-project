// AI 분석 잡 상태 조회 API
// GET /api/ai/jobs/:id — BullMQ 잡 진행 상태/결과 반환

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAiQueue } from '@/lib/ai/queue'

export const GET = withAuth(async (req: NextRequest, { params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'Job ID is required' } },
      { status: 400 },
    )
  }

  const queue = await createAiQueue()
  if (!queue) {
    return NextResponse.json(
      { error: { code: 'QUEUE_UNAVAILABLE', message: 'Job queue is not configured (no REDIS_URL)' } },
      { status: 503 },
    )
  }

  const job = await queue.getJob(id)
  if (!job) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Job not found' } },
      { status: 404 },
    )
  }

  const state = await job.getState()

  return NextResponse.json({
    job_id: job.id,
    state,
    progress: job.progress,
    result: job.returnvalue ?? null,
    failed_reason: job.failedReason ?? null,
    finished_at: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    started_at: job.processedOn ? new Date(job.processedOn).toISOString() : null,
  })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])
