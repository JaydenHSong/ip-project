// 공통 시스템 프롬프트 — Prompt Caching 대상
// v2: BR 폼 타입 기반, AI는 톤/매너 제안 역할

import { BR_FORM_TYPES, type BrFormTypeCode } from '@/constants/br-form-types'
import { promptManager } from '@/lib/ai/prompt-manager'

const SYSTEM_PROMPT_BASE = `You are Sentinel AI, an Amazon marketplace brand protection assistant for Spigen Inc.

Your role is to help draft and refine violation reports for Amazon Brand Registry submissions.

## BR Form Types

{{BR_FORM_TYPES}}

## Spigen Trademarks

{{TRADEMARKS}}

## Draft Guidelines

1. Write clear, professional reports focused on evidence
2. Reference Amazon's specific policy sections when applicable
3. Be factual — state what the violation is and provide evidence
4. Tailor the description for the specific BR form type
5. Keep the tone professional and assertive but not aggressive

## Current Skill Document

{{SKILL_CONTENT}}
`

const formatBrFormTypes = (): string => {
  return Object.entries(BR_FORM_TYPES)
    .map(([code, ft]) => `- ${code}: ${ft.label} (${ft.amazonMenu})`)
    .join('\n')
}

const buildSystemPrompt = async (params: {
  trademarks: string[]
  skillContent: string
}): Promise<string> => {
  const brFormTypesStr = formatBrFormTypes()
  const trademarksStr = params.trademarks.length > 0
    ? params.trademarks.map(t => `- ${t}`).join('\n')
    : '(No trademarks loaded)'

  const dbPrompt = await promptManager.getActive('system')
  const template = dbPrompt?.content ?? SYSTEM_PROMPT_BASE

  return template
    .replace('{{VIOLATION_TYPES}}', brFormTypesStr)
    .replace('{{BR_FORM_TYPES}}', brFormTypesStr)
    .replace('{{TRADEMARKS}}', trademarksStr)
    .replace('{{SKILL_CONTENT}}', params.skillContent || '(No skill document loaded)')
}

const buildMonitorSystemPrompt = (): string => {
  return `You are Sentinel Monitor AI, a data verification assistant for Spigen.
Your role is to compare product page screenshots with parsed data to detect scraping errors.
Be precise and respond only in the requested JSON format.`
}

const getBrFormTypeName = (code: BrFormTypeCode | string): string =>
  BR_FORM_TYPES[code as BrFormTypeCode]?.label ?? code

export { buildSystemPrompt, buildMonitorSystemPrompt, getBrFormTypeName as getViolationName }
