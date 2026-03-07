# Session Brief: AI Self-Optimization Pipeline

## Status: PENDING
## Assigned Session:
## Completed At:

---

## Goal
AI가 자동으로 자기 프롬프트를 개선하는 피드백 루프 구축.
사람이 확정한 위반 판단 데이터를 기반으로, 정확도 분석 → 프롬프트 개선 → 적용까지 자동화.

## Priority: MEDIUM (데이터 충분히 쌓인 후 효과 극대화)

---

## 현재 구조 분석

### 이미 있는 것
| 파일 | 역할 |
|------|------|
| `src/lib/ai/learn.ts` | Opus Teacher — 에디터의 드래프트 수정을 분석해 Skill 문서 업데이트 |
| `src/lib/ai/prompts/system.ts` | Sonnet 시스템 프롬프트 빌더 (Skill 문서 삽입) |
| `crawler/src/ai/prompts.ts` | 크롤러 AI 프롬프트 (하드코딩) |
| `crawler/src/ai/violation-scanner.ts` | Haiku 위반 스캔 |
| DB 필드 | `ai_violation_type`, `confirmed_violation_type`, `disagreement_flag`, `ai_confidence_score` |

### 없는 것 (이번에 만들 것)
1. 정확도 분석 API / 집계 로직
2. 프롬프트 DB 저장 + 버전 관리
3. 자동 프롬프트 최적화 Job
4. 크롤러 프롬프트의 동적 로딩
5. 정확도 대시보드 위젯

---

## Phase 1: 정확도 분석 기반 구축

### Task 1-1: DB 테이블 생성

```sql
-- AI 프롬프트 버전 관리
CREATE TABLE ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_type TEXT NOT NULL,          -- 'system', 'analyze', 'draft', 'crawler-violation-scan', 'crawler-thumbnail-scan'
  version INT NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  accuracy_score NUMERIC(5,2),        -- 적용 후 측정된 정확도
  sample_count INT DEFAULT 0,         -- 정확도 측정에 사용된 샘플 수
  created_by TEXT NOT NULL,           -- 'opus-auto' | 'manual' | user_id
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'         -- 변경 사유, 개선 포인트 등
);

-- 복합 유니크 인덱스
CREATE UNIQUE INDEX idx_ai_prompts_type_version ON ai_prompts(prompt_type, version);
-- 활성 프롬프트 빠른 조회
CREATE INDEX idx_ai_prompts_active ON ai_prompts(prompt_type) WHERE is_active = true;

-- AI 정확도 로그 (주간 집계)
CREATE TABLE ai_accuracy_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  prompt_type TEXT NOT NULL,
  prompt_version INT NOT NULL,
  total_analyzed INT NOT NULL DEFAULT 0,
  total_confirmed INT NOT NULL DEFAULT 0,     -- 사람이 확정한 건
  correct_count INT NOT NULL DEFAULT 0,       -- AI 판단 == 확정
  wrong_count INT NOT NULL DEFAULT 0,         -- AI 판단 != 확정
  accuracy_pct NUMERIC(5,2),
  confusion_matrix JSONB DEFAULT '{}',        -- {predicted: {actual: count}}
  top_errors JSONB DEFAULT '[]',              -- 자주 틀리는 패턴
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

파일: `supabase/migrations/022_ai_prompts.sql`

### Task 1-2: 정확도 집계 API

**파일**: `src/app/api/ai/accuracy/route.ts`

```typescript
// GET /api/ai/accuracy?period=7d|30d|90d
//
// 로직:
// 1. reports에서 confirmed_violation_type이 있는 건 조회
// 2. ai_violation_type vs confirmed_violation_type 비교
// 3. 위반 유형별 정확도, confusion matrix 계산
// 4. disagreement_flag 분석
//
// 응답:
// {
//   overall_accuracy: 84.2,
//   total_confirmed: 523,
//   by_violation_type: {
//     "V01": { accuracy: 91.3, total: 120, correct: 110, common_misclass: "V14" },
//     "V08": { accuracy: 78.5, total: 65, correct: 51, common_misclass: "V10" },
//   },
//   confidence_calibration: [
//     { range: "90-100", accuracy: 95.2, count: 200 },
//     { range: "70-89", accuracy: 82.1, count: 180 },
//     { range: "50-69", accuracy: 61.3, count: 100 },
//     { range: "30-49", accuracy: 38.7, count: 43 },
//   ],
//   top_errors: [
//     { predicted: "V01", actual: "V14", count: 8, example_ids: [...] },
//   ]
// }
```

### Task 1-3: 정확도 대시보드 위젯

**파일**: `src/app/(protected)/dashboard/widgets/AiAccuracyWidget.tsx`

위젯 내용:
- 전체 정확도 숫자 (큰 글씨)
- 위반 유형별 정확도 막대 그래프
- confidence vs 실제 정확도 산점도
- "자주 틀리는 패턴" Top 3

`widget-config.ts`에 추가:
```typescript
{ id: 'ai-accuracy', title: 'AI Accuracy', size: 'medium', minRole: 'admin', order: 10 }
```

---

## Phase 2: 프롬프트 동적 로딩

### Task 2-1: 프롬프트 매니저

**파일**: `src/lib/ai/prompt-manager.ts`

```typescript
// 프롬프트를 DB에서 로딩 (캐시 포함)
//
// const promptManager = {
//   getActive(type: PromptType): Promise<{ content: string; version: number }>
//   save(type: PromptType, content: string, createdBy: string): Promise<{ version: number }>
//   activate(type: PromptType, version: number): Promise<void>
//   rollback(type: PromptType): Promise<void>  // 이전 버전으로 복구
//   getHistory(type: PromptType): Promise<PromptVersion[]>
// }
//
// 캐시: 5분 TTL로 메모리 캐시 (매 호출마다 DB 안 치게)
// Fallback: DB 못 읽으면 코드의 하드코딩 프롬프트 사용
```

### Task 2-2: 기존 프롬프트 코드 → DB 마이그레이션

현재 하드코딩된 프롬프트들을 DB 초기 데이터로 삽입:

| prompt_type | 소스 파일 | 비고 |
|-------------|----------|------|
| `system` | `src/lib/ai/prompts/system.ts` SYSTEM_PROMPT_BASE | Sonnet 시스템 프롬프트 |
| `analyze` | `src/lib/ai/prompts/analyze.ts` | 위반 분석 프롬프트 |
| `draft` | `src/lib/ai/prompts/draft.ts` | 드래프트 생성 프롬프트 |
| `crawler-violation-scan` | `crawler/src/ai/prompts.ts` VIOLATION_SCAN_PROMPT | 크롤러 위반 스캔 |
| `crawler-thumbnail-scan` | `crawler/src/ai/prompts.ts` THUMBNAIL_SCAN_PROMPT | 크롤러 썸네일 스캔 |

**중요**: 기존 코드는 DB fallback으로 유지. DB 읽기 실패 시 하드코딩 사용.

### Task 2-3: AI 호출 코드에서 promptManager 사용

**수정 파일**:
- `src/lib/ai/prompts/system.ts` → `promptManager.getActive('system')` 사용
- `src/lib/ai/analyze.ts` → `promptManager.getActive('analyze')` 사용
- `crawler/src/ai/violation-scanner.ts` → `promptManager.getActive('crawler-violation-scan')` 사용

```typescript
// Before (하드코딩)
const systemPrompt = buildSystemPrompt({ trademarks, skillContent })

// After (DB 동적 로딩 + fallback)
const promptData = await promptManager.getActive('system')
const systemPrompt = promptData.content
  .replace('{{VIOLATION_TYPES}}', violationTypesStr)
  .replace('{{TRADEMARKS}}', trademarksStr)
  .replace('{{SKILL_CONTENT}}', skillContent)
```

---

## Phase 3: 자동 프롬프트 최적화

### Task 3-1: 최적화 Job

**파일**: `src/lib/ai/prompt-optimizer.ts`

```typescript
// 주 1회 실행 (BullMQ cron 또는 Vercel Cron)
//
// 실행 흐름:
// 1. 지난 주 정확도 데이터 집계 (Task 1-2의 로직 재사용)
// 2. 현재 활성 프롬프트 로딩
// 3. Opus 호출:
//    - Input: 현재 프롬프트 + 정확도 데이터 + confusion matrix + top errors
//    - Output: 개선된 프롬프트 + 변경 사유
// 4. 새 프롬프트 버전 DB 저장 (is_active = false)
// 5. 안전장치 적용 후 활성화
//
// Opus 프롬프트:
// """
// You are the Prompt Optimizer for Sentinel AI.
//
// ## Current Prompt (version {N}):
// {current_prompt}
//
// ## Accuracy Report (last 7 days):
// - Overall: {accuracy}%
// - Confusion Matrix: {matrix}
// - Top Errors: {errors}
//
// ## Task:
// Analyze the error patterns and improve the prompt to reduce misclassifications.
// Focus on the top error patterns first.
// Keep the same JSON output format — only improve instructions and guidelines.
//
// Respond with:
// {
//   "improved_prompt": "...",
//   "changes": ["change 1", "change 2"],
//   "expected_improvement": "which error patterns this should fix"
// }
// """
```

### Task 3-2: 안전장치

```typescript
// prompt-optimizer.ts 내부

const SAFETY_RULES = {
  // 1. 최소 샘플 수 — 데이터 부족하면 최적화 스킵
  MIN_SAMPLES: 50,

  // 2. 정확도 하락 감지 — 새 프롬프트 적용 후 정확도 떨어지면 자동 롤백
  ROLLBACK_THRESHOLD: -5, // 5%p 이상 하락 시

  // 3. A/B 테스트 기간 — 새 프롬프트를 30% 트래픽에만 적용
  AB_TEST_RATIO: 0.3,
  AB_TEST_DAYS: 7,

  // 4. 최대 자동 변경 횟수 — 주당 1회 제한
  MAX_WEEKLY_UPDATES: 1,

  // 5. 프롬프트 diff 크기 제한 — 한번에 너무 많이 바꾸지 않기
  MAX_CHANGE_RATIO: 0.3, // 30% 이상 변경 시 Admin 승인 필요
}
```

### Task 3-3: Cron Job 등록

**방법 A**: Vercel Cron (Web 서버)
```json
// vercel.json
{
  "crons": [{
    "path": "/api/ai/optimize",
    "schedule": "0 3 * * 1"  // 매주 월요일 03:00 UTC
  }]
}
```

**방법 B**: BullMQ (Crawler 서버)
```typescript
// crawler/src/scheduler/jobs.ts에 추가
queue.add('prompt-optimize', {}, {
  repeat: { pattern: '0 3 * * 1' }
})
```

권장: **방법 A** (Vercel Cron) — Web 서버에서 DB 접근이 더 직접적

### Task 3-4: Admin 알림

프롬프트가 자동 업데이트되면:
- Admin에게 알림 (NotificationBell 활용)
- 변경 내용 요약 + 정확도 변화 표시
- "롤백" 버튼 제공

---

## Phase 4: 설정 UI

### Task 4-1: 프롬프트 관리 페이지

**파일**: `src/app/(protected)/settings/tabs/AiPromptTab.tsx`

설정 > AI Prompts 탭 추가 (Admin/Owner only):

- 프롬프트 유형별 현재 버전 + 정확도 표시
- 버전 히스토리 (변경 사유, 정확도 추이)
- 수동 편집 기능 (비상시)
- 롤백 버튼
- 자동 최적화 ON/OFF 토글
- A/B 테스트 상태 표시

---

## 기존 학습 시스템과의 관계

현재 `learn.ts`의 Opus Teacher는 **드래프트 품질** 학습 (에디터 수정 → Skill 문서 업데이트).

이번에 만드는 건 **판단 정확도** 최적화:

```
learn.ts (기존)     → 드래프트 글쓰기 품질 개선 (Skill 문서)
prompt-optimizer.ts → 위반 판단 정확도 개선 (프롬프트)
```

두 시스템은 독립적으로 동작하며, 각각 다른 AI 능력을 개선:
- Skill 문서 = "어떤 증거를 어떤 어조로 쓸지" (글쓰기)
- 프롬프트 = "어떤 것이 위반인지 아닌지" (판단)

---

## Implementation Order

```
Phase 1 (1주) → 정확도 측정 기반 + 대시보드
Phase 2 (1주) → 프롬프트 DB화 + 동적 로딩
Phase 3 (1주) → 자동 최적화 Job + 안전장치
Phase 4 (3일) → 설정 UI
```

Phase 1만으로도 "AI가 어디서 틀리는지" 가시화되어 수동 개선에 큰 도움.
Phase 3까지 가면 완전 자동화.

---

## Validation

1. `pnpm typecheck` PASS
2. 정확도 API가 올바른 수치 반환하는지 (수동 계산과 대조)
3. 프롬프트 DB 로딩 실패 시 fallback 작동 확인
4. 자동 최적화 후 프롬프트가 JSON 포맷 유지하는지
5. 롤백이 즉시 이전 버전으로 복구되는지
6. A/B 테스트 비율이 정확한지
