// Re-write 핸들러 — Sonnet (Worker)
// 에디터 피드백 기반 드래프트 재작성

import type { AiDraftResponse } from '@/types/api'
import type { Report } from '@/types/reports'
import type { Listing } from '@/types/listings'
import { MODEL_ROLES, type ClaudeClient } from '@/types/ai'
import { buildSystemPrompt } from './prompts/system'

const REWRITE_PROMPT_TEMPLATE = `Rewrite the violation report draft based on the editor's feedback.

## Current Draft
Title: {{draftTitle}}
Body:
{{draftBody}}

## Editor Feedback
{{feedback}}

## Listing Information
- ASIN: {{asin}}
- Title: {{title}}
- Seller: {{seller}}

## Instructions
1. Address all points in the editor's feedback
2. Maintain the same violation type and evidence
3. Improve tone, structure, or content as requested
4. Keep the professional, formal style

## Response Format (JSON only)
{
  "draft_title": "...",
  "draft_body": "...",
  "draft_evidence": [...],
  "draft_policy_references": [...]
}`

const parseDraftResponse = (raw: string): AiDraftResponse => {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return {
      draft_title: 'Rewrite Failed',
      draft_body: raw,
      draft_evidence: [],
      draft_policy_references: [],
    }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as AiDraftResponse
    return {
      draft_title: parsed.draft_title ?? 'Untitled',
      draft_body: parsed.draft_body ?? '',
      draft_evidence: parsed.draft_evidence ?? [],
      draft_policy_references: parsed.draft_policy_references ?? [],
    }
  } catch {
    return {
      draft_title: 'Rewrite Failed',
      draft_body: raw,
      draft_evidence: [],
      draft_policy_references: [],
    }
  }
}

const rewriteDraft = async (
  client: ClaudeClient,
  report: Report,
  feedback: string,
  options: {
    skillContent: string
    trademarks: string[]
    listing: Listing
  },
): Promise<AiDraftResponse> => {
  const systemPrompt = buildSystemPrompt({
    trademarks: options.trademarks,
    skillContent: options.skillContent,
  })

  const userPrompt = REWRITE_PROMPT_TEMPLATE
    .replace('{{draftTitle}}', report.draft_title ?? '')
    .replace('{{draftBody}}', report.draft_body ?? '')
    .replace('{{feedback}}', feedback)
    .replace('{{asin}}', options.listing.asin)
    .replace('{{title}}', options.listing.title ?? '(unknown)')
    .replace('{{seller}}', options.listing.seller_name ?? '(unknown)')

  const response = await client.call({
    model: MODEL_ROLES.worker,
    systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 4096,
    temperature: 0.4,
    cacheSystemPrompt: true,
  })

  return parseDraftResponse(response.content)
}

export { rewriteDraft }
