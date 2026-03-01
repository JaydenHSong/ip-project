# AI Analysis Pipeline — Design Document

> **Summary**: Claude AI 기반 위반 자동 분석 + 신고서 드래프트 생성 + 스크린샷 검증 + Skill 학습 시스템 상세 설계
>
> **Project**: Sentinel (센티널) — MS2
> **Version**: 0.1
> **Author**: Claude (AI)
> **Date**: 2026-03-01
> **Status**: Draft
> **Planning Doc**: [ai-analysis.plan.md](../../01-plan/features/ai-analysis.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- Teacher-Student AI 아키텍처 구현 (Sonnet=Worker, Opus=Teacher, Haiku=Monitor)
- 리스팅 도착 → 스크린샷 검증 → 의심 필터 → AI 분석 → 드래프트 생성 자동 파이프라인
- Skill 시스템으로 위반유형별 학습 문서 관리 (Opus가 에디터 수정 diff로 업데이트)
- 기존 Report/Listing 타입과 완벽 호환
- Prompt Caching으로 시스템 프롬프트 비용 30% 절감

### 1.2 Design Principles

- **모듈 분리**: Claude API 클라이언트, 프롬프트, 분석 로직, Skill 관리를 각각 분리
- **비용 효율**: 의심 필터로 불필요한 AI 호출 제거, Haiku로 저비용 검증
- **기존 타입 재사용**: `AiAnalysisResult`, `AiSeverity`, `DraftEvidence` 등 기존 타입 활용
- **CLAUDE.md 컨벤션 준수**: type only, no enum, no any, named export

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     AI Analysis Pipeline                         │
│                                                                  │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │ Screenshot    │───▶│  Suspect Filter  │───▶│  AI Analyzer  │  │
│  │ Verifier      │    │  (Rule-based)    │    │  (Sonnet)     │  │
│  │ (Haiku)       │    └──────────────────┘    └──────┬────────┘  │
│  └──────────────┘                                    │           │
│                                                      ▼           │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │ Skill System │◀──▶│  Draft Generator │◀───│  Patent Check │  │
│  │ (Markdown)   │    │  (Sonnet)        │    │  (Sonnet)     │  │
│  └──────┬───────┘    └────────┬─────────┘    └───────────────┘  │
│         │                     │                                  │
│         ▼                     ▼                                  │
│  ┌──────────────┐    ┌──────────────────┐                       │
│  │ Opus Learner │    │  Notification    │                       │
│  │ (Teacher)    │    │  (Google Chat)   │                       │
│  └──────────────┘    └──────────────────┘                       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Claude API Client (Anthropic SDK)            │   │
│  │   Sonnet (Worker)  │  Opus (Teacher)  │  Haiku (Monitor)  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 Prompt Manager + Cache                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
         │                     │                     │
         │ listing 조회         │ report 저장          │ patent 조회
         ▼                     ▼                     ▼
┌──────────────────────────────────────────────────────────────────┐
│              Sentinel Web (Supabase / Next.js API)               │
│  listings │ reports │ patents │ trademarks │ report_templates     │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Pipeline Data Flow

```
1. 리스팅 도착 (Crawler POST /api/crawler/listings 또는 Extension POST /api/ext/submit-report)
   └─▶ listings 테이블 INSERT
   └─▶ AI 분석 트리거 (직접 호출 또는 BullMQ 잡)

2. [Step 0] 스크린샷 검증 (Haiku)
   └─▶ screenshotUrl + parsedData → Haiku Vision API
   └─▶ match: true → 파싱 데이터 유지
   └─▶ match: false → corrections 적용 + 셀렉터 오류 Google Chat 알림

3. [Step 1] 의심 리스팅 필터
   └─▶ RESTRICTED_KEYWORDS 매칭 (기존 모듈)
   └─▶ is_suspect: false → 저장만 (AI 미호출, 비용 절약)
   └─▶ is_suspect: true → AI 분석 진행

4. [Step 2] AI 위반 분석 (Sonnet)
   └─▶ Skill 문서 로드 (해당 카테고리)
   └─▶ 리스팅 텍스트 + 이미지 + 특허 데이터 + 상표 데이터 + Skill → Sonnet
   └─▶ 출력: { violationType, severity, confidence, reasoning }

5. [Step 3] 드래프트 생성 (Sonnet)
   └─▶ 분석 결과 + Skill + report_templates → 신고서 드래프트
   └─▶ reports 테이블 INSERT (status: 'draft')

6. [Step 4] Disagreement 체크 (Extension 경유 시)
   └─▶ user_violation_type vs ai_violation_type 비교
   └─▶ 불일치 시 disagreement_flag = true

7. [Step 5] Google Chat 알림
   └─▶ notifyDraftReady() (기존 함수)

8. [Step 6] Editor 검토 후 승인/Re-write
   └─▶ Approve → Opus 학습 트리거
   └─▶ Re-write → Sonnet 재작성 (피드백 포함)

9. [Step 7] Opus 학습 (승인 시)
   └─▶ original_draft_body vs approved draft_body diff 분석
   └─▶ 해당 위반유형 Skill 문서 업데이트
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| Claude Client | Anthropic SDK | Sonnet/Opus/Haiku API 호출 |
| Prompt Manager | Skill System | 시스템 프롬프트 + Skill 주입 |
| Screenshot Verifier | Claude Client (Haiku) | 파싱 데이터 검증 |
| Suspect Filter | restricted-keywords.ts | 의심 리스팅 사전 필터 |
| AI Analyzer | Claude Client, Prompt Manager, Skill System | 위반 분석 |
| Draft Generator | AI Analyzer, report_templates | 신고서 생성 |
| Patent Check | patents 테이블, Claude Client | V03 특허 유사도 |
| Opus Learner | Claude Client (Opus), Skill System | Skill 자동 업데이트 |
| Monday Sync | Monday.com GraphQL API | 특허 데이터 동기화 |

---

## 3. Data Model

### 3.1 기존 타입 재사용 (변경 없음)

| 타입 | 파일 | AI 파이프라인 용도 |
|------|------|-------------------|
| `AiAnalysisResult` | `src/types/reports.ts` | 분석 결과 저장 |
| `AiEvidence` | `src/types/reports.ts` | 증거 항목 |
| `AiSeverity` | `src/types/reports.ts` | 심각도 |
| `DraftEvidence` | `src/types/reports.ts` | 드래프트 증거 |
| `PolicyReference` | `src/types/reports.ts` | 정책 참조 |
| `Report` | `src/types/reports.ts` | 전체 신고서 (ai_* 필드 포함) |
| `Patent` | `src/types/patents.ts` | 특허 데이터 |
| `ReportPatent` | `src/types/patents.ts` | 신고서-특허 매핑 |
| `ViolationCode` | `src/constants/violations.ts` | V01~V19 |
| `AiAnalyzeRequest/Response` | `src/types/api.ts` | API 요청/응답 |
| `AiDraftRequest/Response` | `src/types/api.ts` | 드래프트 API |

### 3.2 신규 타입 (`src/types/ai.ts`)

```typescript
// Claude API 모델 식별자
type ClaudeModel = 'claude-sonnet-4-6' | 'claude-opus-4-6' | 'claude-haiku-4-5-20251001'

// 모델 역할 매핑
const MODEL_ROLES = {
  worker: 'claude-sonnet-4-6',
  teacher: 'claude-opus-4-6',
  monitor: 'claude-haiku-4-5-20251001',
} as const

type ModelRole = keyof typeof MODEL_ROLES

// 스크린샷 검증 결과
type ScreenshotVerification = {
  match: boolean
  corrections: Record<string, string> | null
  mismatchFields: string[]
  confidence: number
  rawResponse: string
}

// Skill 문서 메타데이터
type SkillDocument = {
  violationType: ViolationCode
  version: number
  lastUpdatedBy: 'opus' | 'admin'
  lastUpdatedAt: string
  content: string
  metadata: SkillMetadata
}

type SkillMetadata = {
  totalDrafts: number
  approveRate: number
  rewriteRate: number
  lastLearningAt: string | null
  exampleCount: number
}

// Opus 학습 입력
type LearningInput = {
  reportId: string
  violationType: ViolationCode
  originalDraft: string
  approvedDraft: string
  editorFeedback: string | null
}

// Opus 학습 결과
type LearningResult = {
  skillUpdated: boolean
  violationType: ViolationCode
  changesSummary: string
  newVersion: number
}

// AI 분석 잡 데이터 (BullMQ)
type AiAnalysisJobData = {
  listingId: string
  includePatentCheck: boolean
  source: 'crawler' | 'extension'
  priority: 'high' | 'normal'
}

// AI 분석 잡 결과
type AiAnalysisJobResult = {
  listingId: string
  reportId: string | null
  violationDetected: boolean
  screenshotVerification: ScreenshotVerification | null
  analysisResult: AiAnalysisResult | null
  draftGenerated: boolean
  duration: number
}

// Monday.com 동기화 결과
type MondaySyncResult = {
  total: number
  created: number
  updated: number
  unchanged: number
  errors: { itemId: string; error: string }[]
  syncedAt: string
}

// 특허 유사도 분석 결과
type PatentSimilarityResult = {
  patentId: string
  patentNumber: string
  similarityScore: number
  matchedFeatures: string[]
  reasoning: string
}
```

### 3.3 DB 스키마 변경

이번 MS2에서는 **DB 스키마 변경 없음**. 기존 테이블이 이미 AI 필드를 갖고 있음:

| 테이블 | 기존 AI 필드 | 용도 |
|--------|-------------|------|
| `reports` | `ai_analysis`, `ai_severity`, `ai_confidence_score`, `ai_violation_type`, `original_draft_body` | 분석 결과 + 학습 diff |
| `reports` | `draft_title`, `draft_body`, `draft_evidence`, `draft_policy_references` | 드래프트 |
| `reports` | `disagreement_flag` (computed) | 사용자-AI 불일치 |
| `listings` | `is_suspect`, `suspect_reasons` | 의심 필터 결과 |
| `patents` | `keywords`, `image_urls`, `status` | 특허 데이터 |
| `report_patents` | `similarity_score`, `ai_reasoning` | 특허 유사도 |
| `trademarks` | `name`, `variations` | 상표 데이터 (V01 프롬프트 주입) |
| `report_templates` | `violation_type`, `template_body` | 드래프트 참조 |

---

## 4. API Specification

### 4.1 AI 분석 API

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | /api/ai/analyze | 리스팅 AI 분석 트리거 | withAuth (editor, admin) |
| POST | /api/ai/verify-screenshot | 스크린샷 크로스체크 | withServiceAuth |
| POST | /api/ai/rewrite | Re-write (피드백 포함 재작성) | withAuth (editor, admin) |
| POST | /api/ai/learn | Opus 학습 트리거 | withAuth (admin) |
| GET | /api/ai/skills | Skill 목록 조회 | withAuth (editor, admin) |
| GET | /api/ai/skills/[type] | 특정 Skill 조회 | withAuth (editor, admin) |
| PUT | /api/ai/skills/[type] | Skill 수동 수정 | withAuth (admin) |

### 4.2 특허 동기화 API

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | /api/patents/sync | 동기화 상태 조회 | withAuth (admin) |
| POST | /api/patents/sync | 동기화 실행 | withAuth (admin) |

### 4.3 Endpoint Details

#### `POST /api/ai/analyze`

```typescript
// Request — 기존 AiAnalyzeRequest
type AiAnalyzeRequest = {
  listing_id: string
  include_patent_check?: boolean   // default: true
}

// Response 200 — 기존 AiAnalyzeResponse
type AiAnalyzeResponse = {
  violation_detected: boolean
  violations: {
    type: ViolationCode
    confidence: number
    category: string
    severity: AiSeverity
    reasons: string[]
    evidence: DraftEvidence[]
    policy_references: PolicyReference[]
  }[]
  summary: string
}

// 이 API는:
// 1. listing_id로 리스팅 조회
// 2. 스크린샷 있으면 Haiku 검증
// 3. 의심 필터 체크
// 4. Sonnet 분석 + 드래프트 생성
// 5. reports 테이블에 INSERT
// 6. Google Chat 알림
// 7. 결과 반환
```

#### `POST /api/ai/verify-screenshot`

```typescript
// Request
type VerifyScreenshotRequest = {
  listing_id: string
  screenshot_url: string
  parsed_data: {
    title: string
    price: string | null
    seller: string | null
    rating: string | null
  }
}

// Response 200
type VerifyScreenshotResponse = ScreenshotVerification
```

#### `POST /api/ai/rewrite`

```typescript
// Request
type AiRewriteRequest = {
  report_id: string
  feedback: string
}

// Response 200
type AiRewriteResponse = AiDraftResponse
// Sonnet이 피드백 참조하여 드래프트 재작성
// report.original_draft_body 보존 (없으면 현재 draft_body 저장)
```

#### `POST /api/ai/learn`

```typescript
// Request
type AiLearnRequest = {
  report_id: string
}

// Response 200
type AiLearnResponse = LearningResult
// Opus가 original_draft_body vs draft_body diff 분석 → Skill 업데이트
```

#### `GET /api/ai/skills`

```typescript
// Response 200
type SkillListResponse = {
  skills: {
    violationType: ViolationCode
    violationName: string
    version: number
    lastUpdatedBy: 'opus' | 'admin'
    lastUpdatedAt: string
    approveRate: number
    totalDrafts: number
  }[]
}
```

#### `GET /api/ai/skills/[type]`

```typescript
// Response 200
type SkillDetailResponse = SkillDocument

// 404: Skill 파일 없음
```

#### `PUT /api/ai/skills/[type]`

```typescript
// Request
type UpdateSkillRequest = {
  content: string
}

// Response 200
type UpdateSkillResponse = {
  violationType: ViolationCode
  version: number
  updatedAt: string
}
```

#### `POST /api/patents/sync`

```typescript
// Response 200
type PatentSyncResponse = MondaySyncResult
```

---

## 5. Module Design

### 5.1 Claude API Client (`src/lib/ai/client.ts`)

```typescript
import Anthropic from '@anthropic-ai/sdk'

type ClaudeMessage = {
  role: 'user' | 'assistant'
  content: string | Anthropic.ContentBlock[]
}

type ClaudeCallOptions = {
  model: ClaudeModel
  systemPrompt: string
  messages: ClaudeMessage[]
  maxTokens?: number          // default: 4096
  temperature?: number        // default: 0.3
  cacheSystemPrompt?: boolean // Prompt Caching (default: true)
}

type ClaudeResponse = {
  content: string
  inputTokens: number
  outputTokens: number
  cacheHit: boolean
  model: ClaudeModel
  duration: number
}

// 팩토리 함수
const createClaudeClient = (apiKey: string): ClaudeClient => {
  const anthropic = new Anthropic({ apiKey })

  return {
    call: async (options: ClaudeCallOptions): Promise<ClaudeResponse> => { ... },
    callWithImages: async (
      options: ClaudeCallOptions & { images: { url: string; mediaType: string }[] }
    ): Promise<ClaudeResponse> => { ... },
  }
}
```

### 5.2 Prompt Manager (`src/lib/ai/prompts/`)

#### `system.ts` — 공통 시스템 프롬프트

```typescript
const SYSTEM_PROMPT_BASE = `
You are Sentinel AI, an Amazon marketplace violation detection system for Spigen.
Your role is to analyze product listings and identify policy violations.

Violation Types (V01~V19):
{{VIOLATION_TYPES}}

Spigen Trademarks:
{{TRADEMARKS}}

Current Skill Document:
{{SKILL_CONTENT}}
`

const buildSystemPrompt = (params: {
  violationTypes: string
  trademarks: string
  skillContent: string
}): string => { ... }
```

#### `analyze.ts` — 위반 분석 프롬프트

```typescript
const ANALYZE_PROMPT = `
Analyze the following Amazon listing for potential policy violations.

Listing Data:
- Title: {{title}}
- Seller: {{seller}}
- Brand: {{brand}}
- Description: {{description}}
- Bullet Points: {{bulletPoints}}
- Price: {{price}}

{{#if images}}
[Images are attached for visual analysis]
{{/if}}

{{#if patentData}}
Patent Registry:
{{patentData}}
{{/if}}

Respond in JSON format:
{
  "violation_detected": boolean,
  "violations": [{
    "type": "V01",
    "confidence": 85,
    "category": "intellectual_property",
    "severity": "high",
    "reasons": ["..."],
    "evidence": [{"type": "text", "location": "title", "description": "..."}],
    "policy_references": [{"code": "...", "url": "...", "section": "..."}]
  }],
  "summary": "..."
}
`

const buildAnalyzePrompt = (listing: Listing, patents?: Patent[]): string => { ... }
```

#### `draft.ts` — 신고서 드래프트 프롬프트

```typescript
const DRAFT_PROMPT = `
Generate a formal violation report draft for Amazon Seller Central.

Analysis Result:
{{analysisResult}}

Reference Template:
{{template}}

Listing: {{listing}}

Generate in JSON format:
{
  "draft_title": "...",
  "draft_body": "...",
  "draft_evidence": [...],
  "draft_policy_references": [...]
}
`

const buildDraftPrompt = (
  analysis: AiAnalyzeResponse,
  listing: Listing,
  template: string | null,
): string => { ... }
```

#### `verify.ts` — 스크린샷 검증 프롬프트

```typescript
const VERIFY_PROMPT = `
Compare this product page screenshot with the parsed data below.
Check if title, price, seller, and rating match.

Parsed Data:
{{parsedData}}

Respond in JSON:
{
  "match": boolean,
  "corrections": {"title": "correct value from screenshot"} | null,
  "mismatchFields": ["title", "price"],
  "confidence": 0.95
}
`

const buildVerifyPrompt = (parsedData: Record<string, string | null>): string => { ... }
```

#### `learn.ts` — Opus 학습 프롬프트

```typescript
const LEARN_PROMPT = `
You are the Teacher AI for Sentinel. Analyze the difference between the
original AI draft and the editor-approved version.

Original Draft:
{{originalDraft}}

Approved Draft:
{{approvedDraft}}

Editor Feedback:
{{feedback}}

Current Skill Document:
{{currentSkill}}

Extract patterns from the editor's changes and update the Skill document.
Return the updated Skill content with clear sections for:
1. Tone and style preferences
2. Evidence ordering patterns
3. Commonly edited sections
4. New examples from this approval

Respond in JSON:
{
  "skill_updated": boolean,
  "changes_summary": "...",
  "updated_skill_content": "..."
}
`

const buildLearnPrompt = (input: LearningInput, currentSkill: string): string => { ... }
```

### 5.3 Skill System (`src/lib/ai/skills/`)

#### `manager.ts` — Skill 파일 CRUD

```typescript
import { readFile, writeFile, readdir, stat } from 'fs/promises'
import { join } from 'path'

const SKILLS_DIR = join(process.cwd(), 'skills')

// Skill 파일명 패턴: V01-trademark.md
const getSkillPath = (violationType: ViolationCode): string =>
  join(SKILLS_DIR, `${violationType}-${VIOLATION_TYPES[violationType].name}.md`)

const skillManager = {
  // 전체 Skill 목록 (메타데이터만)
  list: async (): Promise<SkillDocument[]> => { ... },

  // 특정 Skill 읽기
  get: async (violationType: ViolationCode): Promise<SkillDocument | null> => { ... },

  // Skill 업데이트 (Opus 학습 또는 Admin 수동)
  update: async (
    violationType: ViolationCode,
    content: string,
    updatedBy: 'opus' | 'admin',
  ): Promise<SkillDocument> => { ... },

  // 초기 Skill 파일 생성 (없으면)
  ensureExists: async (violationType: ViolationCode): Promise<void> => { ... },

  // 전체 초기화 (V01~V19)
  initializeAll: async (): Promise<void> => { ... },
}
```

#### `loader.ts` — Skill 로드 + 프롬프트 주입

```typescript
// 분석할 리스팅의 카테고리에 해당하는 Skill들을 로드
const loadRelevantSkills = async (
  suspectReasons: string[],
): Promise<string> => {
  // suspect_reasons에서 카테고리 추출
  // 해당 카테고리의 Skill 문서들 로드
  // 하나의 문자열로 합쳐서 반환 (시스템 프롬프트 주입용)
  // 토큰 제한: 최대 3개 Skill, 각 2000자 이내
}
```

### 5.4 Screenshot Verifier (`src/lib/ai/verify-screenshot.ts`)

```typescript
const verifyScreenshot = async (
  client: ClaudeClient,
  screenshotUrl: string,
  parsedData: {
    title: string
    price: string | null
    seller: string | null
    rating: string | null
  },
): Promise<ScreenshotVerification> => {
  // 1. screenshotUrl에서 이미지 fetch (Supabase Storage)
  // 2. Haiku Vision API 호출 (이미지 + parsedData JSON)
  // 3. JSON 파싱 → ScreenshotVerification 반환
  // 4. 불일치 시 corrections 포함
}
```

### 5.5 Suspect Filter (`src/lib/ai/suspect-filter.ts`)

```typescript
import { ALL_RESTRICTED_KEYWORDS, RESTRICTED_KEYWORDS } from '@/constants/restricted-keywords'

type SuspectCheckResult = {
  isSuspect: boolean
  reasons: string[]
  matchedKeywords: { category: string; keyword: string }[]
}

// 리스팅 텍스트에서 의심 키워드 매칭
const checkSuspectListing = (listing: {
  title: string
  description: string | null
  bullet_points: string[]
  seller_name: string | null
  brand: string | null
}): SuspectCheckResult => {
  // 기존 restricted-keywords.ts의 ALL_RESTRICTED_KEYWORDS 사용
  // title + description + bullet_points + brand 합쳐서 검색
  // 카테고리별 매칭 결과 반환
}
```

### 5.6 AI Analyzer (`src/lib/ai/analyze.ts`)

```typescript
import type { Listing } from '@/types/listings'
import type { AiAnalyzeResponse } from '@/types/api'

const analyzeListingViolation = async (
  client: ClaudeClient,
  listing: Listing,
  options: {
    skillContent: string
    trademarks: string[]
    patents?: Patent[]
    images?: { url: string; mediaType: string }[]
  },
): Promise<AiAnalyzeResponse> => {
  // 1. 시스템 프롬프트 조립 (base + violations + trademarks + skill)
  // 2. 분석 프롬프트 조립 (listing 데이터 + 이미지 + 특허)
  // 3. Sonnet 호출 (Prompt Caching ON)
  // 4. JSON 파싱 → AiAnalyzeResponse
  // 5. confidence threshold 체크 (최소 30%)
}
```

### 5.7 Draft Generator (`src/lib/ai/draft.ts`)

```typescript
import type { AiDraftResponse } from '@/types/api'

const generateDraft = async (
  client: ClaudeClient,
  analysis: AiAnalyzeResponse,
  listing: Listing,
  options: {
    skillContent: string
    template: string | null   // report_templates에서 조회
  },
): Promise<AiDraftResponse> => {
  // 1. 드래프트 프롬프트 조립 (분석 결과 + 리스팅 + 템플릿 + Skill)
  // 2. Sonnet 호출
  // 3. JSON 파싱 → AiDraftResponse
}
```

### 5.8 Re-write Handler (`src/lib/ai/rewrite.ts`)

```typescript
const rewriteDraft = async (
  client: ClaudeClient,
  report: Report,
  feedback: string,
  options: {
    skillContent: string
    listing: Listing
  },
): Promise<AiDraftResponse> => {
  // 1. 현재 드래프트 + 에디터 피드백 + Skill → Sonnet
  // 2. original_draft_body가 없으면 현재 draft_body를 original로 보존
  // 3. 재작성된 드래프트 반환
}
```

### 5.9 Opus Learner (`src/lib/ai/learn.ts`)

```typescript
const learnFromApproval = async (
  client: ClaudeClient,
  input: LearningInput,
): Promise<LearningResult> => {
  // 1. original_draft_body vs approved draft_body diff 계산
  // 2. diff가 의미 있는 수준인지 체크 (최소 10% 이상 변경)
  // 3. 현재 Skill 문서 로드
  // 4. Opus에 학습 프롬프트 전송 (diff + 피드백 + 현재 Skill)
  // 5. 응답에서 updated_skill_content 추출
  // 6. Skill 파일 업데이트 (version + 1)
  // 7. LearningResult 반환
}
```

### 5.10 Patent Similarity (`src/lib/ai/patent-similarity.ts`)

```typescript
const checkPatentSimilarity = async (
  client: ClaudeClient,
  listing: Listing,
  patents: Patent[],
): Promise<PatentSimilarityResult[]> => {
  // 1. 리스팅 이미지 + 기능 설명 vs 특허 이미지 + 키워드
  // 2. Sonnet Vision으로 시각적 유사도 비교 (디자인 특허)
  // 3. 텍스트 기반 기능 비교 (유틸리티 특허)
  // 4. 특허별 similarity_score (0~100) + reasoning 반환
}
```

### 5.11 Monday.com Sync (`src/lib/patents/monday-sync.ts`)

```typescript
type MondayPatentItem = {
  id: string
  name: string
  column_values: {
    patent_number: string
    country: string
    status: string
    expiry_date: string | null
    keywords: string
    image_urls: string
  }
}

const mondaySync = {
  // Monday.com GraphQL API로 특허 데이터 조회
  fetchPatents: async (apiKey: string, boardId: string): Promise<MondayPatentItem[]> => {
    const query = `
      query ($boardId: ID!) {
        boards(ids: [$boardId]) {
          items_page(limit: 500) {
            items {
              id
              name
              column_values { id text value }
            }
          }
        }
      }
    `
    // ...
  },

  // patents 테이블에 upsert (monday_item_id 기준)
  syncToDatabase: async (items: MondayPatentItem[]): Promise<MondaySyncResult> => {
    // Supabase upsert with onConflict: 'monday_item_id'
  },

  // 전체 동기화 (fetch + sync)
  runSync: async (): Promise<MondaySyncResult> => { ... },
}
```

### 5.12 AI Analysis Job Processor (`src/lib/ai/job-processor.ts`)

```typescript
// 전체 AI 분석 파이프라인 오케스트레이터
const processAiAnalysis = async (
  listingId: string,
  options: {
    includePatentCheck: boolean
    source: 'crawler' | 'extension'
  },
): Promise<AiAnalysisJobResult> => {
  const startTime = Date.now()

  // 1. 리스팅 조회 (Supabase)
  // 2. 스크린샷 검증 (screenshot_url 있으면)
  //    → 불일치 시 corrections 적용 + Google Chat 알림
  // 3. 의심 필터 체크
  //    → is_suspect: false → 저장만, return
  // 4. 관련 데이터 로드 (trademarks, patents, skills, templates)
  // 5. Sonnet 위반 분석
  // 6. violation_detected: false → return
  // 7. Sonnet 드래프트 생성
  // 8. reports INSERT (status: 'draft')
  //    → ai_analysis, ai_severity, ai_confidence_score 저장
  //    → ai_violation_type 저장
  //    → disagreement_flag 자동 계산 (Extension 경유 시)
  // 9. 특허 체크 (옵션, V03 관련)
  //    → report_patents INSERT
  // 10. Google Chat 알림 (notifyDraftReady)
  // 11. 결과 반환
}
```

---

## 6. Skill File Structure

### 6.1 Skill 파일 위치

```
skills/                         ← 프로젝트 루트
├── V01-trademark.md
├── V02-copyright.md
├── V03-patent.md
├── V04-counterfeit.md
├── V05-false-claims.md
├── V06-restricted-keywords.md
├── V07-inaccurate-info.md
├── V08-image-policy.md
├── V09-comparative-ads.md
├── V10-variation-policy.md
├── V11-review-manipulation.md
├── V12-review-hijacking.md
├── V13-price-manipulation.md
├── V14-reselling-violation.md
├── V15-bundling-violation.md
├── V16-certification-missing.md
├── V17-safety-standards.md
├── V18-warning-labels.md
└── V19-import-regulation.md
```

### 6.2 Skill 파일 형식

```markdown
---
violationType: V01
version: 1
lastUpdatedBy: admin
lastUpdatedAt: 2026-03-01T00:00:00Z
totalDrafts: 0
approveRate: 0
rewriteRate: 0
exampleCount: 0
---

# V01 — 상표권 침해 (Trademark Infringement)

## 판단 기준
- Spigen 상표명 또는 등록상표가 제목/설명/이미지에 무단 사용
- "compatible with"가 아닌 직접적 브랜드 사칭
- 상표 변형 사용 (spigem, sp1gen 등)

## 증거 수집 가이드
1. 제목에서 상표 사용 위치 캡처
2. 이미지에서 로고 사용 확인
3. 셀러 정보 (Spigen Inc 아닌 경우)

## 신고서 톤/스타일
- 정중하지만 단호한 톤
- 등록상표 번호 명시
- "unauthorized use" 표현 사용

## 에디터 선호 패턴
(Opus 학습으로 자동 업데이트됨)

## 예시
(승인된 신고서에서 자동 추가됨)
```

---

## 7. Error Handling

### 7.1 에러 분류

| 에러 유형 | 원인 | 재시도 | 처리 |
|----------|------|:------:|------|
| `AI_API_ERROR` | Anthropic API 오류 (5xx) | O | 3회 재시도, exponential backoff |
| `AI_RATE_LIMIT` | API rate limit (429) | O | retry-after 헤더 대기 |
| `AI_TOKEN_LIMIT` | 입력 토큰 초과 | X | 이미지 수 줄이기 / Skill 축약 |
| `AI_PARSE_ERROR` | JSON 응답 파싱 실패 | O | 1회 재시도 (temperature 0으로) |
| `SCREENSHOT_FETCH_ERROR` | 스크린샷 URL 접근 실패 | X | 검증 스킵, 파싱 데이터 사용 |
| `SKILL_NOT_FOUND` | Skill 파일 없음 | X | 기본 Skill로 폴백 |
| `MONDAY_API_ERROR` | Monday.com API 오류 | O | 3회 재시도 |
| `PATENT_NOT_FOUND` | 특허 데이터 없음 | X | 특허 체크 스킵 |
| `LISTING_NOT_FOUND` | 리스팅 ID 없음 | X | 404 반환 |

### 7.2 Claude API 재시도 정책

```typescript
const CLAUDE_RETRY_OPTIONS = {
  maxRetries: 3,
  baseDelay: 1000,      // 1초
  maxDelay: 30000,      // 30초
  retryOn: [429, 500, 502, 503, 529],
}
```

---

## 8. Security Considerations

- [x] Anthropic API 키 환경 변수 (`ANTHROPIC_API_KEY`)
- [x] Monday.com API 키 환경 변수 (`MONDAY_API_KEY`, `MONDAY_BOARD_ID`)
- [x] Skill 파일 서버 사이드 전용 (클라이언트 노출 금지)
- [x] AI 응답 JSON 파싱 시 XSS 방지 (draft_body sanitize)
- [x] 이미지 URL은 Supabase Storage 또는 Amazon CDN만 허용
- [x] Admin만 Skill 수동 편집 가능 (`PUT /api/ai/skills/[type]`)
- [x] AI 분석 API는 editor/admin만 접근 가능

---

## 9. Environment Variables

```bash
# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Monday.com 특허 동기화
MONDAY_API_KEY=...
MONDAY_BOARD_ID=...

# Google Chat (기존)
GOOGLE_CHAT_WEBHOOK_URL=...

# Supabase (기존)
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## 10. Implementation Order

### Phase A: 기반 모듈 (5 items)

| # | 파일 | 설명 |
|---|------|------|
| 1 | `src/types/ai.ts` | 신규 AI 타입 정의 |
| 2 | `src/lib/ai/client.ts` | Claude API 클라이언트 (Anthropic SDK) |
| 3 | `src/lib/ai/prompts/system.ts` | 공통 시스템 프롬프트 |
| 4 | `src/lib/ai/prompts/verify.ts` | 스크린샷 검증 프롬프트 |
| 5 | `src/lib/ai/verify-screenshot.ts` | 스크린샷 검증 모듈 (Haiku) |

### Phase B: 분석 + 드래프트 (5 items)

| # | 파일 | 설명 |
|---|------|------|
| 6 | `src/lib/ai/suspect-filter.ts` | 의심 리스팅 필터 |
| 7 | `src/lib/ai/prompts/analyze.ts` | 위반 분석 프롬프트 |
| 8 | `src/lib/ai/analyze.ts` | Sonnet 위반 분석 |
| 9 | `src/lib/ai/prompts/draft.ts` | 드래프트 생성 프롬프트 |
| 10 | `src/lib/ai/draft.ts` | 드래프트 생성 |

### Phase C: Skill 시스템 (4 items)

| # | 파일 | 설명 |
|---|------|------|
| 11 | `src/lib/ai/skills/manager.ts` | Skill 파일 CRUD |
| 12 | `src/lib/ai/skills/loader.ts` | Skill 로드 + 프롬프트 주입 |
| 13 | `skills/*.md` (19 files) | V01~V19 초기 Skill 파일 |
| 14 | `src/lib/ai/prompts/learn.ts` | Opus 학습 프롬프트 |

### Phase D: 학습 + 특허 (4 items)

| # | 파일 | 설명 |
|---|------|------|
| 15 | `src/lib/ai/learn.ts` | Opus 학습 모듈 |
| 16 | `src/lib/ai/rewrite.ts` | Re-write 핸들러 |
| 17 | `src/lib/patents/monday-sync.ts` | Monday.com GraphQL 동기화 |
| 18 | `src/lib/ai/patent-similarity.ts` | 특허 유사도 분석 |

### Phase E: API + 오케스트레이션 (8 items)

| # | 파일 | 설명 |
|---|------|------|
| 19 | `src/lib/ai/job-processor.ts` | AI 분석 파이프라인 오케스트레이터 |
| 20 | `src/app/api/ai/analyze/route.ts` | 분석 트리거 API |
| 21 | `src/app/api/ai/verify/route.ts` | 스크린샷 검증 API |
| 22 | `src/app/api/ai/rewrite/route.ts` | Re-write API |
| 23 | `src/app/api/ai/learn/route.ts` | 학습 트리거 API |
| 24 | `src/app/api/ai/skills/route.ts` | Skill 목록 API |
| 25 | `src/app/api/ai/skills/[type]/route.ts` | Skill CRUD API |
| 26 | `src/app/api/patents/sync/route.ts` | Monday.com 동기화 API |

**총 26개 구현 항목** (타입 1 + 모듈 18 + Skill 파일 1세트 + API 7)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-01 | Initial draft — AI Analysis Pipeline 상세 설계 (26 impl items) | Claude (AI) |
