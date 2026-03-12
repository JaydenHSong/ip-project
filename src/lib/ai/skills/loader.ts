// Skill 로더 — BR 폼 타입에 맞는 Skill 문서 로드
// v2: V01~V19 → BR 폼 타입 기반으로 전환

import { BR_FORM_TYPES, type BrFormTypeCode } from '@/constants/br-form-types'
import { skillManager } from './manager'

const MAX_SKILLS_PER_ANALYSIS = 3
const MAX_SKILL_CONTENT_LENGTH = 2000

// suspect_reasons에서 관련 BR 폼 타입 추출
const inferFormTypes = (suspectReasons: string[]): BrFormTypeCode[] => {
  const types = new Set<BrFormTypeCode>()

  for (const reason of suspectReasons) {
    const lower = reason.toLowerCase()
    if (lower.includes('trademark') || lower.includes('copyright') || lower.includes('patent') || lower.includes('counterfeit')) {
      types.add('ip_violation')
    }
    if (lower.includes('review') || lower.includes('리뷰')) {
      types.add('product_review')
    }
    if (lower.includes('variation') || lower.includes('변형')) {
      types.add('incorrect_variation')
    }
    if (lower.includes('keyword') || lower.includes('misleading') || lower.includes('policy')) {
      types.add('other_policy')
    }
    if (lower.includes('listing') || lower.includes('category')) {
      types.add('other_policy')
    }
  }

  if (types.size === 0) {
    types.add('other_policy')
  }

  return Array.from(types)
}

// 관련 Skill 문서를 로드하여 하나의 문자열로 합침
const loadRelevantSkills = async (
  suspectReasons: string[],
): Promise<string> => {
  const formTypes = inferFormTypes(suspectReasons)
  const skillParts: string[] = []

  // V01~V19 레거시 스킬 파일 로드 시도 (기존 파일 호환)
  const FORM_TYPE_TO_LEGACY: Record<string, string[]> = {
    ip_violation: ['V01', 'V02', 'V03'],
    other_policy: ['V05', 'V07'],
    incorrect_variation: ['V10'],
    product_review: ['V11'],
  }

  for (const formType of formTypes.slice(0, MAX_SKILLS_PER_ANALYSIS)) {
    const legacyCodes = FORM_TYPE_TO_LEGACY[formType] ?? []
    for (const code of legacyCodes.slice(0, 1)) {
      const skill = await skillManager.get(code)
      if (!skill) continue

      const truncatedContent = skill.content.length > MAX_SKILL_CONTENT_LENGTH
        ? skill.content.slice(0, MAX_SKILL_CONTENT_LENGTH) + '\n...(truncated)'
        : skill.content

      skillParts.push(`### ${formType} Skill (v${skill.version})\n${truncatedContent}`)
    }
  }

  return skillParts.length > 0
    ? skillParts.join('\n\n---\n\n')
    : '(No relevant skill documents available)'
}

// 특정 위반유형의 Skill만 로드 (레거시 호환)
const loadSkillForType = async (
  violationType: string,
): Promise<string> => {
  const skill = await skillManager.get(violationType)
  if (!skill) return '(No skill document for this violation type)'

  return `### ${violationType} Skill (v${skill.version})\n${skill.content}`
}

export { loadRelevantSkills, loadSkillForType, inferFormTypes as inferCategories }
