// AI Analysis Pipeline 타입 정의
// Teacher-Student Architecture: Sonnet(Worker), Opus(Teacher), Haiku(Monitor)

import type { AiAnalysisResult } from './reports'

// Claude API 모델 식별자
export type ClaudeModel = 'claude-sonnet-4-6' | 'claude-opus-4-6' | 'claude-haiku-4-5-20251001'

// 모델 역할 매핑
export const MODEL_ROLES = {
  worker: 'claude-sonnet-4-6',
  teacher: 'claude-opus-4-6',
  monitor: 'claude-haiku-4-5-20251001',
} as const satisfies Record<string, ClaudeModel>

export type ModelRole = keyof typeof MODEL_ROLES

// Claude API 호출 옵션
export type ClaudeCallOptions = {
  model: ClaudeModel
  systemPrompt: string
  messages: ClaudeMessage[]
  maxTokens?: number
  temperature?: number
  cacheSystemPrompt?: boolean
}

export type ClaudeMessage = {
  role: 'user' | 'assistant'
  content: string | ClaudeContentBlock[]
}

export type ClaudeContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: ClaudeImageSource }

export type ClaudeImageSource = {
  type: 'base64'
  media_type: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
  data: string
}

// Claude API 응답
export type ClaudeResponse = {
  content: string
  inputTokens: number
  outputTokens: number
  cacheHit: boolean
  model: ClaudeModel
  duration: number
}

// Claude 클라이언트 인터페이스
export type ClaudeClient = {
  call: (options: ClaudeCallOptions) => Promise<ClaudeResponse>
  callWithImages: (
    options: ClaudeCallOptions & { images: { base64: string; mediaType: string }[] },
  ) => Promise<ClaudeResponse>
}

// 스크린샷 검증 결과
export type ScreenshotVerification = {
  match: boolean
  corrections: Record<string, string> | null
  mismatchFields: string[]
  confidence: number
  rawResponse: string
}

// Skill 문서
export type SkillDocument = {
  violationType: string
  version: number
  lastUpdatedBy: 'opus' | 'admin'
  lastUpdatedAt: string
  content: string
  metadata: SkillMetadata
}

export type SkillMetadata = {
  totalDrafts: number
  approveRate: number
  rewriteRate: number
  lastLearningAt: string | null
  exampleCount: number
}

// Opus 학습 입출력
export type LearningInput = {
  reportId: string
  violationType: string
  originalDraft: string
  approvedDraft: string
  editorFeedback: string | null
}

export type LearningResult = {
  skillUpdated: boolean
  violationType: string
  changesSummary: string
  newVersion: number
}

// AI 분석 잡 데이터
export type AiAnalysisJobData = {
  listingId: string
  includePatentCheck: boolean
  source: 'crawler' | 'extension'
  priority: 'high' | 'normal'
}

// AI 분석 잡 결과
export type AiAnalysisJobResult = {
  listingId: string
  reportId: string | null
  violationDetected: boolean
  screenshotVerification: ScreenshotVerification | null
  analysisResult: AiAnalysisResult | null
  draftGenerated: boolean
  duration: number
}

// Monday.com 동기화
export type MondaySyncResult = {
  total: number
  created: number
  created_ids: string[]
  updated: number
  unchanged: number
  errors: { itemId: string; error: string }[]
  syncedAt: string
}

// 특허 유사도 분석 결과
export type PatentSimilarityResult = {
  patentId: string
  patentNumber: string
  similarityScore: number
  matchedFeatures: string[]
  reasoning: string
}
