# AI 분석 엔진 완성 Design Document

> **Summary**: 6개 Gap 상세 설계 — 모니터링 Haiku Vision, 스크린샷 URL, BullMQ, 템플릿 매칭, AI UI, 환경변수
>
> **Project**: Sentinel
> **Author**: Claude (PDCA)
> **Date**: 2026-03-02
> **Status**: Draft
> **Plan Ref**: `docs/01-plan/features/ai-analysis.plan.md`

---

## 1. Gap 1: `/api/ai/monitor` Haiku Vision 구현

### 1.1 현재 상태

`src/app/api/ai/monitor/route.ts` (85행)
- 41행: `// TODO: 실제 Claude Haiku API 호출 구현`
- diff 기반 간소화 로직만 존재 (스크린샷 이미지 미사용)

### 1.2 설계

기존 `verifyScreenshot()` 패턴을 참조하여 Haiku Vision 호출 추가.

```typescript
// src/lib/ai/monitor-compare.ts (NEW)

import { MODEL_ROLES, type ClaudeClient } from '@/types/ai'
import type { SnapshotDiff, AiMarking } from '@/types/monitoring'

type MonitorCompareInput = {
  initialScreenshotUrl: string | null
  currentScreenshotUrl: string | null
  diff: SnapshotDiff
  violationType: string
}

type MonitorCompareResult = {
  remark: string
  markingData: AiMarking[]
  resolutionSuggestion: 'resolved' | 'unresolved' | 'continue'
  changeSummary: string
}

const compareScreenshots = async (
  client: ClaudeClient,
  input: MonitorCompareInput,
): Promise<MonitorCompareResult> => {
  // 스크린샷 둘 다 없으면 기존 diff 로직 fallback
  if (!input.initialScreenshotUrl || !input.currentScreenshotUrl) {
    return fallbackDiffAnalysis(input.diff)
  }

  // 이미지 fetch → base64 변환
  const [initialImage, currentImage] = await Promise.all([
    fetchImageAsBase64(input.initialScreenshotUrl),
    fetchImageAsBase64(input.currentScreenshotUrl),
  ])

  // fetch 실패 시 fallback
  if (!initialImage || !currentImage) {
    return fallbackDiffAnalysis(input.diff)
  }

  // Haiku Vision 호출
  const response = await client.callWithImages({
    model: MODEL_ROLES.monitor,       // claude-haiku-4-5
    systemPrompt: buildMonitorCompareSystemPrompt(),
    messages: [{
      role: 'user',
      content: buildMonitorCompareUserPrompt(input.diff, input.violationType),
    }],
    maxTokens: 1024,
    temperature: 0.1,
    images: [initialImage, currentImage],
  })

  return parseMonitorResponse(response.content)
}
```

### 1.3 프롬프트 설계

```typescript
// src/lib/ai/prompts/monitor-compare.ts (NEW)

const MONITOR_COMPARE_SYSTEM = `You are a monitoring AI for Sentinel brand protection.
Compare two Amazon listing screenshots (BEFORE and AFTER) to detect changes.

Focus on:
1. Has the violation been addressed? (removed/modified)
2. What specific elements changed? (title, images, price, seller info)
3. Are there any NEW violations?

Respond in JSON format only.`

const MONITOR_COMPARE_USER = `## Screenshots
Image 1: INITIAL screenshot (when violation was first reported)
Image 2: CURRENT screenshot (latest check)

## Known Data Changes
{{diffSummary}}

## Violation Type
{{violationType}}

## Response Format
{
  "remark": "Detailed analysis...",
  "marking_data": [
    { "x": 0, "y": 0, "width": 0, "height": 0, "label": "...", "severity": "high|medium|low" }
  ],
  "resolution_suggestion": "resolved|unresolved|continue",
  "change_summary": "Brief summary"
}`
```

### 1.4 API 라우트 수정

```typescript
// src/app/api/ai/monitor/route.ts — 수정사항

// 추가 import
import { createClaudeClient } from '@/lib/ai/client'
import { compareScreenshots } from '@/lib/ai/monitor-compare'

// POST 핸들러 내부 수정 (41행~)
const apiKey = process.env.ANTHROPIC_API_KEY
if (apiKey && body.initial_screenshot_url && body.current_screenshot_url) {
  // Haiku Vision 호출
  const client = createClaudeClient(apiKey)
  const result = await compareScreenshots(client, {
    initialScreenshotUrl: body.initial_screenshot_url,
    currentScreenshotUrl: body.current_screenshot_url,
    diff: diff,
    violationType: body.violation_type ?? 'unknown',
  })
  return NextResponse.json(result)
}

// API Key 없거나 스크린샷 없으면 기존 diff 로직 유지 (fallback)
```

---

## 2. Gap 2: 스크린샷 URL 연동

### 2.1 현재 상태

`src/lib/ai/job-processor.ts` 83행:
```typescript
screenshotUrl: null, // TODO: Supabase Storage URL
```

`src/app/api/ai/analyze/route.ts`에서 `processAiAnalysis()` 호출 시 `screenshotUrl: null`.

### 2.2 설계

리스팅의 `raw_data` 또는 별도 `screenshot_url` 필드에서 URL을 가져온다.

```typescript
// src/app/api/ai/analyze/route.ts — 수정

// 리스팅 조회 후
const listing = listingData as Listing

// 스크린샷 URL 결정
// 1. listings 테이블에 screenshot_url 컬럼이 있으면 직접 사용
// 2. raw_data에 screenshot_url이 있으면 사용
// 3. 없으면 null (스크린샷 검증 스킵)
const screenshotUrl = listing.screenshot_url
  ?? (listing.raw_data as Record<string, unknown>)?.screenshot_url as string
  ?? null

const result = await processAiAnalysis({
  client,
  listing,
  trademarks: trademarkNames,
  patents,
  template,
  screenshotUrl,  // ← null 대신 실제 URL
  supabaseInsertReport: async (data) => { ... },
  supabaseInsertReportPatent: async (data) => { ... },
})
```

### 2.3 DB 마이그레이션

```sql
-- supabase/migrations/005_add_screenshot_url.sql

ALTER TABLE listings
  ADD COLUMN screenshot_url TEXT;

COMMENT ON COLUMN listings.screenshot_url IS
  'Supabase Storage URL for evidence screenshot captured during crawling';
```

---

## 3. Gap 3: BullMQ 비동기 잡 큐

### 3.1 현재 상태

`/api/ai/analyze` → 직접 `processAiAnalysis()` 호출 (동기, 요청 대기).
AI 분석 5~15초 소요 → API 타임아웃 위험.

### 3.2 설계

```typescript
// src/lib/ai/queue.ts (NEW)

import { Queue, Worker, type Job } from 'bullmq'
import type { AiAnalysisJobData, AiAnalysisJobResult } from '@/types/ai'

const QUEUE_NAME = 'ai-analysis'

const getRedisConnection = () => {
  const url = process.env.REDIS_URL
  if (!url) return null
  return { connection: { url } }
}

// 큐 생성 (Redis 없으면 null)
const createAiQueue = (): Queue<AiAnalysisJobData> | null => {
  const redis = getRedisConnection()
  if (!redis) return null

  return new Queue(QUEUE_NAME, {
    ...redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  })
}

// 워커 생성
const createAiWorker = (): Worker<AiAnalysisJobData, AiAnalysisJobResult> | null => {
  const redis = getRedisConnection()
  if (!redis) return null

  return new Worker(QUEUE_NAME, async (job: Job<AiAnalysisJobData>) => {
    // processAiAnalysis() 호출
    // ... (기존 job-processor.ts 활용)
  }, {
    ...redis,
    concurrency: 1, // 초기 동시성 1개
    limiter: { max: 10, duration: 60000 }, // 분당 10건
  })
}

export { createAiQueue, createAiWorker }
```

### 3.3 API 라우트 수정

```typescript
// src/app/api/ai/analyze/route.ts — 수정

import { createAiQueue } from '@/lib/ai/queue'

// BullMQ 큐 있으면 비동기, 없으면 동기 fallback
const queue = createAiQueue()

if (queue) {
  // 비동기 모드: 잡 큐잉 후 즉시 응답
  const job = await queue.add('analyze', {
    listingId: body.listing_id,
    // ... job data
  })

  return NextResponse.json({
    queued: true,
    job_id: job.id,
    message: 'AI analysis queued',
  })
}

// 동기 fallback (Redis 없을 때)
const result = await processAiAnalysis({ ... })
```

### 3.4 잡 상태 조회 API

```typescript
// src/app/api/ai/jobs/[id]/route.ts (NEW)

// GET /api/ai/jobs/:id — 잡 상태 조회
// Returns: { status, progress, result? }
```

---

## 4. Gap 4: 위반유형별 템플릿 매칭

### 4.1 현재 상태

```typescript
// src/app/api/ai/analyze/route.ts 68~73행
const { data: templates } = await supabase
  .from('report_templates')
  .select('template_body, violation_type')
  .limit(1)  // ← 첫 번째만

const template = templates?.[0]?.template_body ?? null
```

### 4.2 설계

```typescript
// src/lib/ai/templates/matcher.ts (NEW)

import { createClient } from '@/lib/supabase/server'

const findBestTemplate = async (
  violationType: string | null,
  subType: string | null = null,
): Promise<string | null> => {
  const supabase = await createClient()

  // 1차: 정확한 위반유형 + 서브타입 매칭
  if (violationType && subType) {
    const { data } = await supabase
      .from('report_templates')
      .select('template_body')
      .eq('violation_type', violationType)
      .eq('sub_type', subType)
      .eq('is_active', true)
      .single()

    if (data) return data.template_body
  }

  // 2차: 위반유형만 매칭
  if (violationType) {
    const { data } = await supabase
      .from('report_templates')
      .select('template_body')
      .eq('violation_type', violationType)
      .is('sub_type', null)
      .eq('is_active', true)
      .single()

    if (data) return data.template_body
  }

  // 3차: 기본 템플릿 (없으면 null)
  return null
}

export { findBestTemplate }
```

### 4.3 analyze 라우트 수정

```typescript
// 분석 결과에서 primary violation type 추출 후 템플릿 매칭
// 2-pass: 먼저 분석 → 위반유형 확인 → 맞춤 템플릿 → 드래프트

// 또는 suspect_reasons 기반으로 추정 후 템플릿 로드
import { findBestTemplate } from '@/lib/ai/templates/matcher'

const template = await findBestTemplate(
  listing.suspect_reasons?.[0] ?? null,
)
```

---

## 5. Gap 5: AI Analysis UI 탭

### 5.1 현재 상태

Report 상세 SlidePanel에 AI 분석 결과 표시 공간 없음.
`reports` 테이블에 `ai_analysis` JSONB, `ai_severity`, `ai_confidence_score` 필드는 이미 존재.

### 5.2 UI 설계

```
┌─────────────────────────── Report #R-2026-001 ──────────────────────────┐
│ [Report] [Files] [AI Analysis] [Activity Log]                          │
│─────────────────────────────────────────────────────────────────────────│
│                                                                         │
│  🤖 AI Analysis Results                                                │
│  ─────────────────────                                                  │
│                                                                         │
│  Violation Type:  V01 Trademark Infringement                            │
│  Confidence:      ████████████░░ 92%                                   │
│  Severity:        🔴 High                                              │
│                                                                         │
│  📋 Analysis Summary                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ The listing title contains "Spigen" trademark without          │   │
│  │ authorization. Seller "TechDeals" is not an authorized...      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  📑 Evidence                                                           │
│  • Title: "Spigen" in position 1 (trademark_in_title)                  │
│  • Seller: Not in authorized seller list                                │
│  • Price: 40% below MSRP ($12.99 vs $21.99)                           │
│                                                                         │
│  📜 Policy References                                                  │
│  • Amazon Brand Registry Policy §3.2                                    │
│  • Amazon Product Detail Page Rules (G200390640)                        │
│                                                                         │
│  ⚠️ Disagreement                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ User:  V05 Counterfeit                                         │   │
│  │ AI:    V01 Trademark          ← AI chose this                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.3 컴포넌트 설계

```typescript
// src/components/features/AiAnalysisTab.tsx (NEW)

type AiAnalysisTabProps = {
  aiAnalysis: {
    violation_detected: boolean
    confidence: number
    reasons: string[]
    evidence: { type: string; location: string; description: string }[]
  } | null
  aiViolationType: string | null
  aiSeverity: string | null
  aiConfidenceScore: number | null
  userViolationType: string
  disagreementFlag: boolean
}

// - Confidence 바 (프로그레스 바 + 퍼센트)
// - Severity 배지 (High=빨강, Medium=노랑, Low=초록)
// - Evidence 목록 (아이콘 + 설명)
// - Policy References 링크
// - Disagreement 비교 카드 (user vs ai)
```

---

## 6. Gap 6: 환경변수 정리

### 6.1 .env.local.example 추가

```env
# AI Analysis (필수 — Claude API)
ANTHROPIC_API_KEY=sk-ant-api03-xxx

# Job Queue (선택 — 없으면 동기 모드)
REDIS_URL=redis://localhost:6379

# Notifications (선택 — Google Chat)
GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/xxx
```

---

## 7. 구현 순서

| 순서 | Gap | 의존성 | 수정 파일 |
|------|-----|--------|----------|
| 1 | Gap 6: 환경변수 | 없음 | `.env.local.example` |
| 2 | Gap 4: 템플릿 매칭 | 없음 | `src/lib/ai/templates/matcher.ts` (NEW), `src/app/api/ai/analyze/route.ts` |
| 3 | Gap 2: 스크린샷 URL | 없음 | `src/app/api/ai/analyze/route.ts`, `supabase/migrations/005_*.sql` |
| 4 | Gap 1: Haiku Vision | Gap 2 | `src/lib/ai/monitor-compare.ts` (NEW), `src/lib/ai/prompts/monitor-compare.ts` (NEW), `src/app/api/ai/monitor/route.ts` |
| 5 | Gap 5: AI UI | 없음 | `src/components/features/AiAnalysisTab.tsx` (NEW), Report 상세 수정 |
| 6 | Gap 3: BullMQ | Gap 2 | `src/lib/ai/queue.ts` (NEW), `src/app/api/ai/analyze/route.ts`, `src/app/api/ai/jobs/[id]/route.ts` (NEW) |

---

## 8. 데모 데이터

기존 `src/lib/demo/data.ts`의 DEMO_REPORTS에 이미 `ai_violation_type`, `ai_confidence_score` 필드가 있으므로 `ai_analysis` JSONB 데모 데이터만 추가:

```typescript
ai_analysis: {
  violation_detected: true,
  confidence: 92,
  reasons: ['trademark_in_title', 'unauthorized_seller'],
  evidence: [
    { type: 'text', location: 'Title word #1', description: 'Contains "Spigen" trademark' },
    { type: 'keyword', location: 'Seller profile', description: 'Not in authorized seller list' },
  ],
}
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-02 | Initial design — 6 gaps detailed | Claude (PDCA) |
