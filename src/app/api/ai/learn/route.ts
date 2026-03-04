// Opus 학습 트리거 API
// POST /api/ai/learn — 승인된 신고서에서 Skill 학습

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { createClaudeClient } from '@/lib/ai/client'
import { learnFromApproval } from '@/lib/ai/learn'
import type { Report } from '@/types/reports'
import type { LearningInput } from '@/types/ai'

type LearnRequest = {
  report_id: string
}

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json() as LearnRequest

  if (!body.report_id) {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'report_id is required' } },
      { status: 400 },
    )
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: { code: 'CONFIG_ERROR', message: 'ANTHROPIC_API_KEY not configured' } },
      { status: 500 },
    )
  }

  const supabase = await createClient()

  // 신고서 조회
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('*')
    .eq('id', body.report_id)
    .single()

  if (reportError || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Report not found' } },
      { status: 404 },
    )
  }

  const typedReport = report as Report

  // 승인된 보고서만 학습 가능
  if (typedReport.status !== 'approved' && typedReport.status !== 'submitted') {
    return NextResponse.json(
      { error: { code: 'INVALID_STATUS', message: 'Only approved/submitted reports can trigger learning' } },
      { status: 400 },
    )
  }

  // original_draft_body 필수
  if (!typedReport.original_draft_body || !typedReport.draft_body) {
    return NextResponse.json(
      { error: { code: 'NO_DIFF', message: 'No original draft to compare against' } },
      { status: 400 },
    )
  }

  // ai_violation_type 필수
  if (!typedReport.ai_violation_type) {
    return NextResponse.json(
      { error: { code: 'NO_VIOLATION_TYPE', message: 'Report has no AI violation type' } },
      { status: 400 },
    )
  }

  const client = createClaudeClient(apiKey)

  const input: LearningInput = {
    reportId: body.report_id,
    violationType: typedReport.ai_violation_type,
    originalDraft: typedReport.original_draft_body,
    approvedDraft: typedReport.draft_body,
    editorFeedback: typedReport.rejection_reason, // Re-write 시 피드백
  }

  const result = await learnFromApproval(client, input)

  return NextResponse.json(result)
}, ['owner', 'admin'])
