// Opus 학습 모듈 — Teacher AI
// 에디터 수정 diff 분석 → Skill 문서 자동 업데이트

import { MODEL_ROLES, type ClaudeClient, type LearningInput, type LearningResult } from '@/types/ai'
import { buildLearnPrompt } from './prompts/learn'
import { skillManager } from './skills/manager'

const MIN_DIFF_RATIO = 0.1 // 최소 10% 이상 변경 시에만 학습

const calculateDiffRatio = (original: string, modified: string): number => {
  if (!original || !modified) return 0
  const maxLen = Math.max(original.length, modified.length)
  if (maxLen === 0) return 0

  // 간단한 문자 레벨 diff ratio
  let diffCount = 0
  const minLen = Math.min(original.length, modified.length)
  for (let i = 0; i < minLen; i++) {
    if (original[i] !== modified[i]) diffCount++
  }
  diffCount += Math.abs(original.length - modified.length)

  return diffCount / maxLen
}

const parseLearningResponse = (raw: string, violationType: string): {
  skillUpdated: boolean
  changesSummary: string
  updatedSkillContent: string | null
} => {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { skillUpdated: false, changesSummary: 'Failed to parse response', updatedSkillContent: null }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      skill_updated?: boolean
      changes_summary?: string
      updated_skill_content?: string
    }

    return {
      skillUpdated: parsed.skill_updated ?? false,
      changesSummary: parsed.changes_summary ?? '',
      updatedSkillContent: parsed.updated_skill_content ?? null,
    }
  } catch {
    return { skillUpdated: false, changesSummary: 'JSON parse error', updatedSkillContent: null }
  }
}

const learnFromApproval = async (
  client: ClaudeClient,
  input: LearningInput,
): Promise<LearningResult> => {
  // diff ratio 체크 — 너무 작은 변경은 스킵
  const diffRatio = calculateDiffRatio(input.originalDraft, input.approvedDraft)
  if (diffRatio < MIN_DIFF_RATIO) {
    return {
      skillUpdated: false,
      violationType: input.violationType,
      changesSummary: `Diff ratio too small (${(diffRatio * 100).toFixed(1)}%), skipping learning`,
      newVersion: 0,
    }
  }

  // 현재 Skill 문서 로드
  const currentSkill = await skillManager.get(input.violationType)
  const currentSkillContent = currentSkill?.content ?? ''

  // Opus 호출
  const systemPrompt = `You are the Teacher AI for Sentinel brand protection system. Your role is to analyze editor corrections and update skill documents for better future drafts.`

  const userPrompt = buildLearnPrompt(input, currentSkillContent)

  const response = await client.call({
    model: MODEL_ROLES.teacher,
    systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 4096,
    temperature: 0.2,
    cacheSystemPrompt: false, // Opus는 호출 빈도 낮음, 캐싱 불필요
  })

  const result = parseLearningResponse(response.content, input.violationType)

  // Skill 업데이트
  if (result.skillUpdated && result.updatedSkillContent) {
    const updatedDoc = await skillManager.update(
      input.violationType,
      result.updatedSkillContent,
      'opus',
    )

    return {
      skillUpdated: true,
      violationType: input.violationType,
      changesSummary: result.changesSummary,
      newVersion: updatedDoc.version,
    }
  }

  return {
    skillUpdated: false,
    violationType: input.violationType,
    changesSummary: result.changesSummary,
    newVersion: currentSkill?.version ?? 0,
  }
}

export { learnFromApproval }
