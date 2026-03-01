// AI 분석 트리거 API
// POST /api/ai/analyze — 리스팅 AI 위반 분석 + 드래프트 생성

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { createClaudeClient } from '@/lib/ai/client'
import { processAiAnalysis } from '@/lib/ai/job-processor'
import type { AiAnalyzeRequest } from '@/types/api'
import type { Listing } from '@/types/listings'
import type { Patent } from '@/types/patents'

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json() as AiAnalyzeRequest

  if (!body.listing_id) {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'listing_id is required' } },
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

  // 리스팅 조회
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', body.listing_id)
    .single()

  if (listingError || !listing) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Listing not found' } },
      { status: 404 },
    )
  }

  // 상표 데이터 조회
  const { data: trademarks } = await supabase
    .from('trademarks')
    .select('name, variations')

  const trademarkNames = (trademarks ?? []).flatMap(
    (t: { name: string; variations: string[] }) => [t.name, ...t.variations],
  )

  // 특허 데이터 조회
  let patents: Patent[] = []
  if (body.include_patent_check !== false) {
    const { data: patentData } = await supabase
      .from('patents')
      .select('*')
      .eq('status', 'active')

    patents = (patentData ?? []) as Patent[]
  }

  // 신고서 템플릿 조회 (가장 관련성 높은 것)
  const { data: templates } = await supabase
    .from('report_templates')
    .select('template_body, violation_type')
    .limit(1)

  const template = templates?.[0]?.template_body ?? null

  const client = createClaudeClient(apiKey)

  const result = await processAiAnalysis({
    client,
    listing: listing as Listing,
    trademarks: trademarkNames,
    patents,
    template,
    screenshotUrl: null, // TODO: Supabase Storage URL
    supabaseInsertReport: async (data) => {
      const { data: report, error } = await supabase
        .from('reports')
        .insert(data)
        .select('id')
        .single()

      if (error) throw new Error(`Report insert failed: ${error.message}`)
      return report.id as string
    },
    supabaseInsertReportPatent: async (data) => {
      await supabase.from('report_patents').insert(data)
    },
  })

  if (!result.violationDetected) {
    return NextResponse.json({
      violation_detected: false,
      violations: [],
      summary: 'No violations detected',
    })
  }

  return NextResponse.json({
    violation_detected: true,
    violations: result.analysisResult
      ? [{
          type: result.analysisResult.evidence[0]?.type ?? 'text',
          confidence: result.analysisResult.confidence,
          reasons: result.analysisResult.reasons,
        }]
      : [],
    summary: `AI analysis completed. Report ${result.reportId} created as draft.`,
    report_id: result.reportId,
  })
}, ['editor', 'admin'])
