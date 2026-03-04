// AI 분석 트리거 API
// POST /api/ai/analyze — 리스팅 AI 위반 분석 + 드래프트 생성

import { NextRequest, NextResponse } from 'next/server'
import { withDualAuth } from '@/lib/auth/dual-middleware'
import { createClient } from '@/lib/supabase/server'
import { createClaudeClient } from '@/lib/ai/client'
import { processAiAnalysis } from '@/lib/ai/job-processor'
import { findBestTemplate } from '@/lib/ai/templates/matcher'
import { createAiQueue } from '@/lib/ai/queue'
import type { AiAnalyzeRequest } from '@/types/api'
import type { Listing } from '@/types/listings'
import type { Patent } from '@/types/patents'

export const POST = withDualAuth(async (req: NextRequest) => {
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

  // 위반유형별 템플릿 매칭 — Top-3 관련 템플릿을 프롬프트 컨텍스트로 주입
  const typedListing = listing as Listing
  const suspectType = (typedListing.suspect_reasons as string[])?.[0] ?? null
  let template = await findBestTemplate(suspectType)

  // Enhanced: inject Top-3 related templates as prompt context
  const violationType = body.violation_type ?? suspectType
  if (violationType) {
    const { data: relatedTemplates } = await supabase
      .from('report_templates')
      .select('title, body')
      .contains('violation_types', [violationType])
      .order('is_default', { ascending: false })
      .order('usage_count', { ascending: false })
      .limit(3)

    if (relatedTemplates && relatedTemplates.length > 0) {
      const sections = relatedTemplates.map(
        (t: { title: string; body: string }, i: number) =>
          `### Template ${i + 1}: ${t.title}\n${t.body}`,
      )
      const templateContext = `## Reference Report Templates\n\nThe following are reference templates used by the team for this violation type.\nUse these as style and structure guidance when drafting the report.\n\n${sections.join('\n\n')}`
      template = template
        ? `${template}\n\n${templateContext}`
        : templateContext
    }
  }

  // 스크린샷 URL 결정 (Supabase Storage)
  const screenshotUrl = (listing as Record<string, unknown>).screenshot_url as string
    ?? ((listing as Record<string, unknown>).raw_data as Record<string, unknown>)?.screenshot_url as string
    ?? null

  // BullMQ 비동기 모드: Redis 있으면 잡 큐잉 후 즉시 응답
  if (body.async !== false) {
    const queue = await createAiQueue()
    if (queue) {
      const job = await queue.add('analyze', {
        listingId: body.listing_id,
        includePatentCheck: body.include_patent_check !== false,
        source: body.source ?? 'crawler',
        priority: body.priority ?? 'normal',
      }, {
        priority: body.priority === 'high' ? 1 : 5,
      })

      return NextResponse.json({
        queued: true,
        job_id: job.id,
        message: 'AI analysis queued for processing',
      })
    }
  }

  // 동기 fallback (Redis 없거나 async=false)
  const client = createClaudeClient(apiKey)

  const result = await processAiAnalysis({
    client,
    listing: typedListing,
    trademarks: trademarkNames,
    patents,
    template,
    screenshotUrl,
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

  // Auto-approve 체크
  if (result.reportId) {
    try {
      const { data: autoApproveRow } = await supabase
        .from('system_configs')
        .select('value')
        .eq('key', 'auto_approve')
        .single()

      const config = autoApproveRow?.value as { enabled?: boolean; threshold?: number; types?: Record<string, boolean> } | null
      if (config?.enabled) {
        const vType = result.analysisResult?.evidence[0]?.type
        const confidence = result.analysisResult?.confidence ?? 0
        const typeEnabled = vType ? config.types?.[vType] === true : false

        if (typeEnabled && confidence >= (config.threshold ?? 90)) {
          await supabase
            .from('reports')
            .update({ status: 'approved', approved_by: 'system', approved_at: new Date().toISOString() })
            .eq('id', result.reportId)
        }
      }
    } catch {
      // auto-approve 실패해도 report는 draft로 유지
    }
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
