// Skill 파일 CRUD 관리자
// 위반유형별 Markdown Skill 문서 (skills/V01-trademark.md 등)

import { readFile, writeFile, readdir, mkdir } from 'fs/promises'
import { join } from 'path'
import { VIOLATION_TYPES, type ViolationCode } from '@/constants/violations'
import type { SkillDocument, SkillMetadata } from '@/types/ai'

const SKILLS_DIR = join(process.cwd(), 'skills')

const SKILL_FILENAME_MAP: Record<ViolationCode, string> = {
  V01: 'V01-trademark.md',
  V02: 'V02-copyright.md',
  V03: 'V03-patent.md',
  V04: 'V04-counterfeit.md',
  V05: 'V05-false-advertising.md',
  V06: 'V06-restricted-keywords.md',
  V07: 'V07-inaccurate-info.md',
  V08: 'V08-image-policy.md',
  V09: 'V09-comparative-advertising.md',
  V10: 'V10-variation-policy.md',
  V11: 'V11-review-manipulation.md',
  V12: 'V12-review-hijacking.md',
  V13: 'V13-price-manipulation.md',
  V14: 'V14-resale-violation.md',
  V15: 'V15-bundling-violation.md',
  V16: 'V16-certification-missing.md',
  V17: 'V17-safety-standards.md',
  V18: 'V18-warning-label.md',
  V19: 'V19-import-regulation.md',
}

const getSkillPath = (violationType: ViolationCode): string =>
  join(SKILLS_DIR, SKILL_FILENAME_MAP[violationType])

const DEFAULT_METADATA: SkillMetadata = {
  totalDrafts: 0,
  approveRate: 0,
  rewriteRate: 0,
  lastLearningAt: null,
  exampleCount: 0,
}

const parseFrontmatter = (content: string): { metadata: Record<string, unknown>; body: string } => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { metadata: {}, body: content }

  const metadataLines = match[1].split('\n')
  const metadata: Record<string, unknown> = {}

  for (const line of metadataLines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()

    // 숫자 변환
    if (/^\d+$/.test(value)) {
      metadata[key] = parseInt(value, 10)
    } else if (/^\d+\.\d+$/.test(value)) {
      metadata[key] = parseFloat(value)
    } else if (value === 'null') {
      metadata[key] = null
    } else {
      metadata[key] = value
    }
  }

  return { metadata, body: match[2] }
}

const buildFrontmatter = (doc: SkillDocument): string => {
  return [
    '---',
    `violationType: ${doc.violationType}`,
    `version: ${doc.version}`,
    `lastUpdatedBy: ${doc.lastUpdatedBy}`,
    `lastUpdatedAt: ${doc.lastUpdatedAt}`,
    `totalDrafts: ${doc.metadata.totalDrafts}`,
    `approveRate: ${doc.metadata.approveRate}`,
    `rewriteRate: ${doc.metadata.rewriteRate}`,
    `lastLearningAt: ${doc.metadata.lastLearningAt ?? 'null'}`,
    `exampleCount: ${doc.metadata.exampleCount}`,
    '---',
    '',
    doc.content,
  ].join('\n')
}

const skillManager = {
  list: async (): Promise<SkillDocument[]> => {
    const skills: SkillDocument[] = []

    for (const [code] of Object.entries(VIOLATION_TYPES)) {
      const violationType = code as ViolationCode
      const doc = await skillManager.get(violationType)
      if (doc) skills.push(doc)
    }

    return skills
  },

  get: async (violationType: ViolationCode): Promise<SkillDocument | null> => {
    const path = getSkillPath(violationType)

    try {
      const raw = await readFile(path, 'utf-8')
      const { metadata, body } = parseFrontmatter(raw)

      return {
        violationType,
        version: (metadata.version as number) ?? 1,
        lastUpdatedBy: (metadata.lastUpdatedBy as 'opus' | 'admin') ?? 'admin',
        lastUpdatedAt: (metadata.lastUpdatedAt as string) ?? new Date().toISOString(),
        content: body.trim(),
        metadata: {
          totalDrafts: (metadata.totalDrafts as number) ?? 0,
          approveRate: (metadata.approveRate as number) ?? 0,
          rewriteRate: (metadata.rewriteRate as number) ?? 0,
          lastLearningAt: (metadata.lastLearningAt as string | null) ?? null,
          exampleCount: (metadata.exampleCount as number) ?? 0,
        },
      }
    } catch {
      return null
    }
  },

  update: async (
    violationType: ViolationCode,
    content: string,
    updatedBy: 'opus' | 'admin',
  ): Promise<SkillDocument> => {
    const existing = await skillManager.get(violationType)
    const version = existing ? existing.version + 1 : 1
    const metadata = existing?.metadata ?? { ...DEFAULT_METADATA }

    if (updatedBy === 'opus') {
      metadata.lastLearningAt = new Date().toISOString()
    }

    const doc: SkillDocument = {
      violationType,
      version,
      lastUpdatedBy: updatedBy,
      lastUpdatedAt: new Date().toISOString(),
      content,
      metadata,
    }

    const path = getSkillPath(violationType)
    await writeFile(path, buildFrontmatter(doc), 'utf-8')

    return doc
  },

  ensureExists: async (violationType: ViolationCode): Promise<void> => {
    const existing = await skillManager.get(violationType)
    if (existing) return

    const violation = VIOLATION_TYPES[violationType]
    const defaultContent = [
      `# ${violationType} — ${violation.name}`,
      '',
      '## 판단 기준',
      `(${violation.name} 판단 기준을 여기에 작성)`,
      '',
      '## 증거 수집 가이드',
      '(Opus 학습으로 자동 업데이트됨)',
      '',
      '## 신고서 톤/스타일',
      '- 정중하지만 단호한 톤',
      '- Amazon 정책 번호 명시',
      '',
      '## 에디터 선호 패턴',
      '(Opus 학습으로 자동 업데이트됨)',
      '',
      '## 예시',
      '(승인된 신고서에서 자동 추가됨)',
    ].join('\n')

    const doc: SkillDocument = {
      violationType,
      version: 1,
      lastUpdatedBy: 'admin',
      lastUpdatedAt: new Date().toISOString(),
      content: defaultContent,
      metadata: { ...DEFAULT_METADATA },
    }

    await mkdir(SKILLS_DIR, { recursive: true })
    const path = getSkillPath(violationType)
    await writeFile(path, buildFrontmatter(doc), 'utf-8')
  },

  initializeAll: async (): Promise<void> => {
    await mkdir(SKILLS_DIR, { recursive: true })
    for (const code of Object.keys(VIOLATION_TYPES)) {
      await skillManager.ensureExists(code as ViolationCode)
    }
  },
}

export { skillManager, getSkillPath, SKILLS_DIR }
