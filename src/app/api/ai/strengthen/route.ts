// AI Draft 강화 API — 재제출용 드래프트 강화
// POST /api/ai/strengthen — 기존 draft를 Claude Sonnet으로 보강

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClaudeClient } from '@/lib/ai/client'
import { MODEL_ROLES } from '@/types/ai'
import { buildSystemPrompt } from '@/lib/ai/prompts/system'

type StrengthenRequest = {
  report_id: string
}

const STRENGTHEN_PROMPT = `Strengthen this Amazon violation report for resubmission.

## Context
- This report was originally submitted but the listing is STILL violating Amazon policies.
- It has been {{daysSince}} days since original submission.
- This is resubmission #{{resubmitCount}}.

## Current Draft
Title: {{draftTitle}}
Body:
{{draftBody}}

## ASIN: {{asin}} | Marketplace: {{marketplace}}

## Instructions
1. Add urgency — reference the time elapsed since original report
2. Strengthen policy references — cite specific Amazon Seller Code of Conduct sections
3. Add escalation language — indicate this is a repeated violation
4. Reference the original case ID if available
5. Keep factual, professional tone

## Response Format (JSON only)
{
  "draft_title": "...",
  "draft_body": "...",
  "draft_evidence": [...],
  "draft_policy_references": [...]
}`

// Service token 인증 (Crawler에서 호출)
export const POST = async (req: Request) => {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const serviceToken = process.env.CRAWLER_SERVICE_TOKEN

  if (!serviceToken || token !== serviceToken) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid service token' } },
      { status: 401 },
    )
  }

  const body = (await req.json()) as StrengthenRequest
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

  const supabase = createAdminClient()

  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('id, draft_title, draft_body, resubmit_count, approved_at, user_violation_type, listing_id')
    .eq('id', body.report_id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Report not found' } },
      { status: 404 },
    )
  }

  const { data: listing } = await supabase
    .from('listings')
    .select('asin, marketplace')
    .eq('id', report.listing_id)
    .single()

  const { data: trademarks } = await supabase.from('trademarks').select('name, variations')
  const trademarkNames = (trademarks ?? []).flatMap(
    (t: { name: string; variations: string[] }) => [t.name, ...t.variations],
  )

  const daysSince = report.approved_at
    ? Math.floor((Date.now() - new Date(report.approved_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const systemPrompt = await buildSystemPrompt({ trademarks: trademarkNames, skillContent: '' })
  const userPrompt = STRENGTHEN_PROMPT
    .replace('{{daysSince}}', String(daysSince))
    .replace('{{resubmitCount}}', String((report.resubmit_count ?? 0) + 1))
    .replace('{{draftTitle}}', report.draft_title ?? '')
    .replace('{{draftBody}}', report.draft_body ?? '')
    .replace('{{asin}}', listing?.asin ?? 'N/A')
    .replace('{{marketplace}}', listing?.marketplace ?? 'US')

  const client = createClaudeClient(apiKey)
  const response = await client.call({
    model: MODEL_ROLES.worker,
    systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 4096,
    temperature: 0.4,
    cacheSystemPrompt: true,
  })

  // Parse response
  const jsonMatch = response.content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json(
      { error: { code: 'AI_ERROR', message: 'Failed to parse AI response' } },
      { status: 500 },
    )
  }

  const strengthened = JSON.parse(jsonMatch[0]) as {
    draft_title: string
    draft_body: string
    draft_evidence: unknown[]
    draft_policy_references: unknown[]
  }

  // DB 업데이트
  await supabase
    .from('reports')
    .update({
      draft_title: strengthened.draft_title,
      draft_body: strengthened.draft_body,
      draft_evidence: strengthened.draft_evidence,
      draft_policy_references: strengthened.draft_policy_references,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.report_id)

  return NextResponse.json(strengthened)
}
