// Opus 학습 프롬프트 — Teacher AI
// 에디터 수정 diff → Skill 문서 업데이트

import type { LearningInput } from '@/types/ai'

const LEARN_PROMPT_TEMPLATE = `You are the Teacher AI for A.R.C., Spigen's Amazon operations platform.

Analyze the difference between the original AI-generated draft and the editor-approved version.
Extract patterns and preferences that should improve future drafts.

## Report Information
- Report ID: {{reportId}}
- Violation Type: {{violationType}}

## Original AI Draft
{{originalDraft}}

## Editor-Approved Draft
{{approvedDraft}}

## Editor Feedback
{{feedback}}

## Current Skill Document
{{currentSkill}}

## Instructions
1. Identify what the editor changed and why
2. Extract patterns:
   - Tone/style adjustments
   - Evidence ordering preferences
   - Commonly added/removed sections
   - Policy reference preferences
3. Update the Skill document to incorporate these patterns
4. Add a brief example from this approval (anonymize ASIN/seller)
5. Keep the Skill document concise (under 2000 words)

## Response Format (JSON only)
{
  "skill_updated": true/false,
  "changes_summary": "Added tone preference for formal language, updated evidence ordering",
  "updated_skill_content": "# V01 — Trademark Infringement\\n\\n## 판단 기준\\n..."
}

If the changes are too minor (cosmetic typos, formatting only), set "skill_updated": false.`

const buildLearnPrompt = (input: LearningInput, currentSkill: string): string => {
  return LEARN_PROMPT_TEMPLATE
    .replace('{{reportId}}', input.reportId)
    .replace('{{violationType}}', input.violationType)
    .replace('{{originalDraft}}', input.originalDraft)
    .replace('{{approvedDraft}}', input.approvedDraft)
    .replace('{{feedback}}', input.editorFeedback ?? '(No feedback provided)')
    .replace('{{currentSkill}}', currentSkill || '(No existing skill document)')
}

export { buildLearnPrompt }
