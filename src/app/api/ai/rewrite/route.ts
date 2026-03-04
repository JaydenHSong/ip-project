// Re-write API
// POST /api/ai/rewrite — 에디터 피드백 기반 드래프트 재작성

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { createClaudeClient } from '@/lib/ai/client'
import { rewriteDraft } from '@/lib/ai/rewrite'
import { loadSkillForType } from '@/lib/ai/skills/loader'
import type { Report } from '@/types/reports'
import type { Listing } from '@/types/listings'

type RewriteRequest = {
  report_id: string
  feedback: string
}

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json() as RewriteRequest

  if (!body.report_id || !body.feedback) {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'report_id and feedback are required' } },
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

  // 리스팅 조회
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', (report as Report).listing_id)
    .single()

  if (listingError || !listing) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Listing not found' } },
      { status: 404 },
    )
  }

  // 상표 데이터
  const { data: trademarks } = await supabase.from('trademarks').select('name, variations')
  const trademarkNames = (trademarks ?? []).flatMap(
    (t: { name: string; variations: string[] }) => [t.name, ...t.variations],
  )

  // Skill 로드
  const typedReport = report as Report
  const skillContent = typedReport.ai_violation_type
    ? await loadSkillForType(typedReport.ai_violation_type)
    : ''

  const client = createClaudeClient(apiKey)

  // original_draft_body 보존 (없으면 현재 body 저장)
  if (!typedReport.original_draft_body && typedReport.draft_body) {
    await supabase
      .from('reports')
      .update({ original_draft_body: typedReport.draft_body })
      .eq('id', body.report_id)
  }

  // Re-write 실행
  const newDraft = await rewriteDraft(client, typedReport, body.feedback, {
    skillContent,
    trademarks: trademarkNames,
    listing: listing as Listing,
  })

  // 드래프트 업데이트
  await supabase
    .from('reports')
    .update({
      draft_title: newDraft.draft_title,
      draft_body: newDraft.draft_body,
      draft_evidence: newDraft.draft_evidence,
      draft_policy_references: newDraft.draft_policy_references,
      status: 'draft',
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.report_id)

  return NextResponse.json(newDraft)
}, ['owner', 'admin', 'editor'])
