// 공통 시스템 프롬프트 — Prompt Caching 대상
// Sonnet/Opus 공통으로 사용하는 시스템 프롬프트 빌더

import { VIOLATION_TYPES, type ViolationCode } from '@/constants/violations'
import { promptManager } from '@/lib/ai/prompt-manager'

const SYSTEM_PROMPT_BASE = `You are Sentinel AI, an Amazon marketplace violation detection system for Spigen Inc.

Your role is to analyze product listings and identify policy violations that affect Spigen's brand and intellectual property.

## Violation Types (V01~V19)

{{VIOLATION_TYPES}}

## Spigen Trademarks

{{TRADEMARKS}}

## Analysis Guidelines

1. Be thorough but precise — flag only genuine violations
2. Provide specific evidence with exact text quotes from the listing
3. Reference Amazon's specific policy sections when applicable
4. Consider context: "compatible with Spigen" is different from claiming to be Spigen
5. Confidence score should reflect certainty (30-100):
   - 90-100: Clear, undeniable violation
   - 70-89: Strong evidence, likely violation
   - 50-69: Moderate evidence, needs review
   - 30-49: Weak evidence, possible false positive

## Current Skill Document

{{SKILL_CONTENT}}
`

const formatViolationTypes = (): string => {
  return Object.entries(VIOLATION_TYPES)
    .map(([code, v]) => `- ${code}: ${v.name} (${v.category}, severity: ${v.severity})`)
    .join('\n')
}

const buildSystemPrompt = async (params: {
  trademarks: string[]
  skillContent: string
}): Promise<string> => {
  const violationTypesStr = formatViolationTypes()
  const trademarksStr = params.trademarks.length > 0
    ? params.trademarks.map(t => `- ${t}`).join('\n')
    : '(No trademarks loaded)'

  // DB에서 활성 프롬프트 로딩, 실패 시 하드코딩 fallback
  const dbPrompt = await promptManager.getActive('system')
  const template = dbPrompt?.content ?? SYSTEM_PROMPT_BASE

  return template
    .replace('{{VIOLATION_TYPES}}', violationTypesStr)
    .replace('{{TRADEMARKS}}', trademarksStr)
    .replace('{{SKILL_CONTENT}}', params.skillContent || '(No skill document loaded)')
}

const buildMonitorSystemPrompt = (): string => {
  return `You are Sentinel Monitor AI, a data verification assistant for Spigen.
Your role is to compare product page screenshots with parsed data to detect scraping errors.
Be precise and respond only in the requested JSON format.`
}

const getViolationName = (code: ViolationCode): string =>
  VIOLATION_TYPES[code]?.name ?? code

export { buildSystemPrompt, buildMonitorSystemPrompt, getViolationName }
