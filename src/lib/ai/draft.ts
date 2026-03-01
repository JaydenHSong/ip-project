// 신고서 드래프트 생성 모듈 — Sonnet (Worker)
// 분석 결과 + Skill + 템플릿 → 드래프트

import type { AiAnalyzeResponse, AiDraftResponse } from '@/types/api'
import type { Listing } from '@/types/listings'
import { MODEL_ROLES, type ClaudeClient } from '@/types/ai'
import { buildSystemPrompt } from './prompts/system'
import { buildDraftPrompt } from './prompts/draft'

const parseDraftResponse = (raw: string): AiDraftResponse => {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return {
      draft_title: 'Draft Generation Failed',
      draft_body: raw,
      draft_evidence: [],
      draft_policy_references: [],
    }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as AiDraftResponse
    return {
      draft_title: parsed.draft_title ?? 'Untitled Draft',
      draft_body: parsed.draft_body ?? '',
      draft_evidence: parsed.draft_evidence ?? [],
      draft_policy_references: parsed.draft_policy_references ?? [],
    }
  } catch {
    return {
      draft_title: 'Draft Generation Failed',
      draft_body: raw,
      draft_evidence: [],
      draft_policy_references: [],
    }
  }
}

const generateDraft = async (
  client: ClaudeClient,
  analysis: AiAnalyzeResponse,
  listing: Listing,
  options: {
    skillContent: string
    trademarks: string[]
    template: string | null
  },
): Promise<AiDraftResponse> => {
  const systemPrompt = buildSystemPrompt({
    trademarks: options.trademarks,
    skillContent: options.skillContent,
  })

  const userPrompt = buildDraftPrompt(analysis, listing, options.template)

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

export { generateDraft }
