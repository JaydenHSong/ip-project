// AI 위반 분석 모듈 — Sonnet (Worker)
// 리스팅 데이터 + 이미지 + Skill → 위반 판정

import type { AiAnalyzeResponse } from '@/types/api'
import type { Listing } from '@/types/listings'
import type { Patent } from '@/types/patents'
import { MODEL_ROLES, type ClaudeClient } from '@/types/ai'
import { buildSystemPrompt } from './prompts/system'
import { buildAnalyzePrompt } from './prompts/analyze'

const MIN_CONFIDENCE = 30

const parseAnalyzeResponse = (raw: string): AiAnalyzeResponse => {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { violation_detected: false, violations: [], summary: 'Failed to parse AI response' }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as AiAnalyzeResponse

    // confidence 최소값 필터링
    const filteredViolations = (parsed.violations ?? []).filter(
      v => v.confidence >= MIN_CONFIDENCE,
    )

    return {
      violation_detected: filteredViolations.length > 0,
      violations: filteredViolations,
      summary: parsed.summary ?? '',
    }
  } catch {
    return { violation_detected: false, violations: [], summary: 'JSON parse error' }
  }
}

const analyzeListingViolation = async (
  client: ClaudeClient,
  listing: Listing,
  options: {
    skillContent: string
    trademarks: string[]
    patents?: Patent[]
    images?: { base64: string; mediaType: string }[]
  },
): Promise<AiAnalyzeResponse> => {
  const systemPrompt = buildSystemPrompt({
    trademarks: options.trademarks,
    skillContent: options.skillContent,
  })

  const userPrompt = buildAnalyzePrompt(listing, options.patents)

  // 이미지가 있으면 멀티모달 호출
  if (options.images && options.images.length > 0) {
    // 이미지 최대 5장으로 제한 (토큰 절약)
    const limitedImages = options.images.slice(0, 5)

    const response = await client.callWithImages({
      model: MODEL_ROLES.worker,
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 4096,
      temperature: 0.3,
      cacheSystemPrompt: true,
      images: limitedImages,
    })

    return parseAnalyzeResponse(response.content)
  }

  // 텍스트만
  const response = await client.call({
    model: MODEL_ROLES.worker,
    systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 4096,
    temperature: 0.3,
    cacheSystemPrompt: true,
  })

  return parseAnalyzeResponse(response.content)
}

export { analyzeListingViolation }
