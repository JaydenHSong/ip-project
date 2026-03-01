// Skill 로더 — 의심 리스팅의 카테고리에 맞는 Skill 문서 로드
// 시스템 프롬프트에 주입할 Skill 콘텐츠 생성

import { VIOLATION_TYPES, type ViolationCode, type ViolationCategory } from '@/constants/violations'
import { skillManager } from './manager'

const MAX_SKILLS_PER_ANALYSIS = 3
const MAX_SKILL_CONTENT_LENGTH = 2000

// 카테고리별 위반유형 매핑
const CATEGORY_CODES: Record<ViolationCategory, ViolationCode[]> = {
  intellectual_property: ['V01', 'V02', 'V03', 'V04'],
  listing_content: ['V05', 'V06', 'V07', 'V08', 'V09', 'V10'],
  review_manipulation: ['V11', 'V12'],
  selling_practice: ['V13', 'V14', 'V15'],
  regulatory_safety: ['V16', 'V17', 'V18', 'V19'],
}

// suspect_reasons에서 관련 카테고리 추출
const inferCategories = (suspectReasons: string[]): ViolationCategory[] => {
  const categories = new Set<ViolationCategory>()

  for (const reason of suspectReasons) {
    const lower = reason.toLowerCase()
    if (lower.includes('trademark') || lower.includes('상표')) {
      categories.add('intellectual_property')
    }
    if (lower.includes('counterfeit') || lower.includes('위조')) {
      categories.add('intellectual_property')
    }
    if (lower.includes('copyright') || lower.includes('image') || lower.includes('이미지')) {
      categories.add('intellectual_property')
      categories.add('listing_content')
    }
    if (lower.includes('review') || lower.includes('리뷰')) {
      categories.add('review_manipulation')
    }
    if (lower.includes('keyword') || lower.includes('misleading') || lower.includes('키워드')) {
      categories.add('listing_content')
    }
    if (lower.includes('certification') || lower.includes('regulatory') || lower.includes('인증')) {
      categories.add('regulatory_safety')
    }
    if (lower.includes('compatibility') || lower.includes('호환')) {
      categories.add('listing_content')
    }
  }

  // 아무것도 추론 못하면 IP 기본
  if (categories.size === 0) {
    categories.add('intellectual_property')
  }

  return Array.from(categories)
}

// 관련 Skill 문서를 로드하여 하나의 문자열로 합침
const loadRelevantSkills = async (
  suspectReasons: string[],
): Promise<string> => {
  const categories = inferCategories(suspectReasons)
  const relevantCodes: ViolationCode[] = []

  for (const category of categories) {
    const codes = CATEGORY_CODES[category] ?? []
    relevantCodes.push(...codes)
  }

  // 중복 제거 + 상위 N개만
  const uniqueCodes = [...new Set(relevantCodes)].slice(0, MAX_SKILLS_PER_ANALYSIS)

  const skillParts: string[] = []

  for (const code of uniqueCodes) {
    const skill = await skillManager.get(code)
    if (!skill) continue

    const truncatedContent = skill.content.length > MAX_SKILL_CONTENT_LENGTH
      ? skill.content.slice(0, MAX_SKILL_CONTENT_LENGTH) + '\n...(truncated)'
      : skill.content

    skillParts.push(`### ${code} Skill (v${skill.version})\n${truncatedContent}`)
  }

  return skillParts.length > 0
    ? skillParts.join('\n\n---\n\n')
    : '(No relevant skill documents available)'
}

// 특정 위반유형의 Skill만 로드
const loadSkillForType = async (
  violationType: ViolationCode,
): Promise<string> => {
  const skill = await skillManager.get(violationType)
  if (!skill) return '(No skill document for this violation type)'

  return `### ${violationType} Skill (v${skill.version})\n${skill.content}`
}

export { loadRelevantSkills, loadSkillForType, inferCategories }
