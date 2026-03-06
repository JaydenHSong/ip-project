// AI Draft 생성 API
// POST /api/ai/draft — 리포트에 AI 드래프트 생성

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { createClaudeClient } from '@/lib/ai/client'
import { generateDraft } from '@/lib/ai/draft'
import { loadSkillForType } from '@/lib/ai/skills/loader'
import type { Report } from '@/types/reports'
import type { Listing } from '@/types/listings'
import type { AiAnalyzeResponse } from '@/types/api'

type DraftRequest = {
  report_id: string
}

export const POST = withAuth(async (req) => {
  const body = (await req.json()) as DraftRequest

  if (!body.report_id) {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'report_id required' } },
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

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', typedReport.listing_id)
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
  const skillContent = typedReport.ai_violation_type
    ? await loadSkillForType(typedReport.ai_violation_type)
    : ''

  // AI 분석 결과를 analysis로 변환
  const analysis: AiAnalyzeResponse = typedReport.ai_analysis
    ? {
        violation_detected: typedReport.ai_analysis.violation_detected,
        violations: [{
          type: typedReport.ai_violation_type ?? typedReport.user_violation_type,
          confidence: typedReport.ai_analysis.confidence,
          category: typedReport.violation_category,
          severity: typedReport.ai_severity ?? 'medium',
          reasons: typedReport.ai_analysis.reasons,
          evidence: typedReport.ai_analysis.evidence.map((e) => ({
            type: e.type,
            url: e.location,
            description: e.description,
          })),
          policy_references: typedReport.draft_policy_references ?? [],
        }],
        summary: typedReport.ai_analysis.reasons.join('; '),
      }
    : {
        violation_detected: true,
        violations: [{
          type: typedReport.user_violation_type,
          confidence: 50,
          category: typedReport.violation_category,
          severity: 'medium',
          reasons: ['User-reported violation'],
          evidence: [],
          policy_references: [],
        }],
        summary: 'User-reported violation',
      }

  const client = createClaudeClient(apiKey)

  const draft = await generateDraft(client, analysis, listing as Listing, {
    skillContent,
    trademarks: trademarkNames,
    template: null,
  })

  // DB 업데이트
  await supabase
    .from('reports')
    .update({
      draft_title: draft.draft_title,
      draft_body: draft.draft_body,
      draft_evidence: draft.draft_evidence,
      draft_policy_references: draft.draft_policy_references,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.report_id)

  return NextResponse.json(draft)
}, ['owner', 'admin', 'editor'])
