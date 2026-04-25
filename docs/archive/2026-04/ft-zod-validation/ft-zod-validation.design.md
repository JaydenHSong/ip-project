# ft-zod-validation Design Document

> **Architecture**: Option C — Pragmatic Balance
> **Project**: arc-ads (A.R.C. — AD Optimizer 모듈)
> **Date**: 2026-04-23
> **Status**: Draft
> **Module Isolation**: arc-ads ONLY (ip/crawler/shared 불간섭)
> **Plan**: [ft-zod-validation.plan.md](../../01-plan/features/ft-zod-validation.plan.md)

---

## Context Anchor (Plan에서 전파)

| Key | Value |
|-----|-------|
| **WHY** | ads 20 routes가 런타임 검증 0. 잘못된 payload가 DB까지 흘러 5xx/PGRST 에러. 선행 2 PDCA follow-up. |
| **WHO** | arc-ads 백엔드 개발자, 마케터/디렉터(즉시 피드백), 향후 client 폼 리팩터. |
| **RISK** | 기존 valid request가 엄격 schema로 400 받는 false-positive. → preview smoke 필수. Helper 모듈 격리 유지. |
| **SUCCESS** | SC-1~SC-8: zod 설치, helper, 20 routes Zod, 400 shape, Playwright, preview smoke, prod 무회귀, lint/build 클린. |
| **SCOPE** | `src/app/api/ads/**` 20 routes + `src/lib/api/validate-body.ts` + `src/modules/ads/**/schemas.ts`. |

---

## 1. Overview

### 1.1 Architecture Summary

**Option C — Pragmatic Balance**

```
┌─────────────────────────────────────────────────────────┐
│  src/app/api/ads/<feature>/route.ts                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  export const POST = withAuth(async (req) => {   │   │
│  │    const parsed = await parseBody(req, schema)   │ ←─── parseBody (basic, default)
│  │    if (!parsed.success) return parsed.response   │   │
│  │    const body = parsed.data  // typed           │   │
│  │    ...                                            │   │
│  │  }, ['admin', 'editor'])                         │   │
│  └──────────────────────────────────────────────────┘   │
│                     ↑                    ↑              │
│        imports      │                    │              │
└─────────────────────┼────────────────────┼──────────────┘
                      │                    │
          ┌───────────┴──────┐   ┌─────────┴───────────────┐
          │ src/lib/api/     │   │ src/modules/ads/        │
          │ validate-body.ts │   │ features/X/schemas.ts   │
          │  (generic, 1)    │   │  (feature-local, 11)    │
          └──────────────────┘   └─────────────────────────┘
          parseBody             createCampaignSchema
          validationErrorResp.  updateCampaignSchema
                                approveRecommendationSchema
                                ...
```

**핵심 원칙**:
1. `parseBody()` — default pattern (all 20 routes 사용)
2. `withValidatedBody()` — opt-in HOC (나중 사용을 위해 제공, 이번 PDCA에서 필수 아님)
3. Schemas는 **feature-local** (모듈 격리)
4. Helper는 **generic primitive** (src/lib/api/, ads 의존 0)
5. Error shape **표준화**: `{error: string, fieldErrors: Record<string, string[]>}` 400

### 1.2 Module Isolation Map

```
✅ src/lib/api/validate-body.ts   → depends on: zod, next/server (외부만)
✅ src/modules/ads/**/schemas.ts  → depends on: zod, 기존 ads types
✅ src/app/api/ads/**/route.ts    → depends on: validate-body, feature schemas
❌ 다른 모듈 (ip, crawler, shared) → 영향 0
❌ public.* 테이블 schema         → 변경 0
❌ withAuth 시그니처               → 변경 0 (withAuth 유지)
```

---

## 2. Components

### 2.1 validate-body.ts (신규 generic helper)

**Location**: `src/lib/api/validate-body.ts` (~70 LOC)

**Exports**:
```ts
export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse }

/** 기본: route 내부에서 수동 호출. 모든 20 routes 기본 사용. */
export async function parseBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
): Promise<ParseResult<T>>

/** 공유 400 응답. 예외적으로 route가 직접 호출할 때. */
export function validationErrorResponse(error: ZodError): NextResponse

/** 선택: HOC wrapper. 향후 route가 opt-in 가능. */
export function withValidatedBody<T, Args extends unknown[]>(
  schema: ZodSchema<T>,
  handler: (req: NextRequest, body: T, ...args: Args) => Promise<NextResponse>,
): (req: NextRequest, ...args: Args) => Promise<NextResponse>
```

**Internal flow**:
1. `await req.json()` — 실패시 `{error: 'Invalid JSON body'}` 400
2. `schema.safeParse(raw)` — 실패시 `{error: 'Validation failed', fieldErrors}` 400
3. 성공시 parsed data 반환 (TypeScript는 `z.infer<T>`)

### 2.2 Feature Schemas (신규 11 파일)

각 feature는 독립적인 `schemas.ts`:

**Pattern example** — `src/modules/ads/features/campaigns/schemas.ts`:
```ts
import { z } from 'zod'

// Shared primitives
export const profileIdSchema = z.string().uuid()
export const campaignTypeSchema = z.enum(['SP', 'SB', 'SD'])
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')

// Request schemas
export const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  profile_id: profileIdSchema,
  campaign_type: campaignTypeSchema,
  daily_budget: z.number().positive(),
  start_date: isoDateSchema,
  end_date: isoDateSchema.optional(),
  targeting_type: z.enum(['AUTO', 'MANUAL']).default('AUTO'),
})
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>

export const updateCampaignSchema = createCampaignSchema.partial()
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>

export const goalModeSchema = z.object({
  goal_mode: z.enum(['ACOS_FIRST', 'ROAS_FIRST', 'SPEND_FIRST', 'HYBRID']),
})
```

**핵심 rule**:
- 1 schema file per feature directory (campaigns, budgets, rules, keywords, recommendations, autopilot, optimization(dayparting), alerts, reports, amazon) = **11 files**
- 기존 `src/modules/ads/features/*/types.ts`의 request type은 `z.infer<>`로 치환 가능 (OR 유지 — loose 결합)
- `max-lines 250` 준수 (feature가 크면 sub-file로 split)

### 2.3 20 Routes Transformation

**Before** (unsafe):
```ts
export const POST = withAuth(async (req) => {
  const body = await req.json() as CreateCampaignRequest  // UNSAFE
  if (!body.name || !body.profile_id) {
    return NextResponse.json({error: 'Missing fields'}, {status: 400})
  }
  // ... insert to DB
}, ['admin', 'editor'])
```

**After** (Option C default):
```ts
// Design Ref: §2.3 Option C parseBody pattern
// Plan SC-3: Zod validation applied
import { parseBody } from '@/lib/api/validate-body'
import { createCampaignSchema } from '@/modules/ads/features/campaigns/schemas'

export const POST = withAuth(async (req) => {
  const parsed = await parseBody(req, createCampaignSchema)
  if (!parsed.success) return parsed.response
  const body = parsed.data  // typed as CreateCampaignInput, all validated
  // ... insert to DB (no manual null checks needed)
}, ['admin', 'editor'])
```

---

## 3. Data Model

### 3.1 No DB Changes

이번 PDCA는 **DB 스키마 변경 0건**. ads/public 테이블 구조 불변.

### 3.2 Request/Response Envelope

**Validation 실패 응답 (400)**:
```json
{
  "error": "Validation failed",
  "fieldErrors": {
    "daily_budget": ["Number must be greater than 0"],
    "campaign_name": ["Required"]
  }
}
```

**Invalid JSON 응답 (400)**:
```json
{
  "error": "Invalid JSON body",
  "fieldErrors": {}
}
```

**Success 응답 (200)**: 기존 envelope 유지 (route별 다양 — `{data: ...}`, `{id, ...}` 등)

---

## 4. API Contract

### 4.1 20 Routes × Input Schema 매핑

| # | Route | Method | Schema | File |
|---|-------|:------:|--------|------|
| 1 | `/api/ads/campaigns` | POST | `createCampaignSchema` | `modules/ads/features/campaigns/schemas.ts` |
| 2 | `/api/ads/campaigns/[id]` | PUT/PATCH | `updateCampaignSchema` | 同上 |
| 3 | `/api/ads/campaigns/[id]/goal-mode` | PATCH | `goalModeSchema` | 同上 |
| 4 | `/api/ads/budgets` | POST | `saveBudgetSchema` | `modules/ads/features/budgets/schemas.ts` |
| 5 | `/api/ads/rules` | POST | `createRuleSchema` | `modules/ads/features/rules/schemas.ts` |
| 6 | `/api/ads/rules/[id]` | PUT/PATCH | `updateRuleSchema` | 同上 |
| 7 | `/api/ads/rules/simulate` | POST | `simulateRuleSchema` | 同上 |
| 8 | `/api/ads/keywords` | POST | `createKeywordSchema` | `modules/ads/features/keywords/schemas.ts` |
| 9 | `/api/ads/keywords/[id]` | PUT/PATCH | `updateKeywordSchema` | 同上 |
| 10 | `/api/ads/recommendations/[id]/approve` | POST | `approveRecommendationSchema` | `modules/ads/features/recommendations/schemas.ts` |
| 11 | `/api/ads/recommendations/[id]/skip` | POST | `skipRecommendationSchema` | 同上 |
| 12 | `/api/ads/autopilot/run` | POST | `runAutopilotSchema` | `modules/ads/features/autopilot/schemas.ts` |
| 13 | `/api/ads/autopilot/[id]/settings` | PUT/PATCH | `updateAutopilotSettingsSchema` | 同上 |
| 14 | `/api/ads/autopilot/[id]/rollback` | POST | `rollbackAutopilotSchema` | 同上 |
| 15 | `/api/ads/dayparting/ai-schedule` | POST | `aiScheduleSchema` | `modules/ads/features/optimization/schemas.ts` |
| 16 | `/api/ads/dayparting/schedules` | PUT | `updateDaypartingSchema` | 同上 |
| 17 | `/api/ads/alerts/[id]/action` | POST | `alertActionSchema` | `modules/ads/features/alerts/schemas.ts` |
| 18 | `/api/ads/reports/export` | POST | `exportReportSchema` | `modules/ads/features/reports/schemas.ts` |
| 19 | `/api/ads/amazon/sync` | POST | `amazonSyncSchema` | `modules/ads/features/amazon/schemas.ts` |
| 20 | `/api/ads/amazon/profiles/[id]/connect` | POST | `connectProfileSchema` | 同上 |

### 4.2 Schema 파생 규칙

- 필수 필드: `z.string().min(1)`, `z.number().positive()`, etc.
- Optional: `.optional()` 명시
- Default: `.default(value)` 사용
- Enum: 기존 TS union을 `z.enum([...])` 로 치환
- UUID/ID: `z.string().uuid()` 또는 `z.string()` (기존 DB format 따라)
- ISO date: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` 또는 `z.string().datetime()`
- Nested: 기존 Type의 서브 객체도 Zod 스키마로 중첩

### 4.3 기존 타입 통합

**Option 1 (권장)**: Zod을 source of truth
```ts
export const createCampaignSchema = z.object({...})
export type CreateCampaignRequest = z.infer<typeof createCampaignSchema>
// 기존 CreateCampaignRequest type alias는 이 정의를 reexport
```

**Option 2 (loose)**: Zod과 기존 type 병행 (변환 레이어 없음)
- 빠른 마이그레이션 — 추후 리팩터로 일원화

이번 PDCA는 **Option 1** 기본, 복잡한 기존 타입 (e.g., `BudgetPacingDetail` 같은 계산 타입)은 건드리지 않음.

---

## 5. Detailed Logic

### 5.1 validate-body.ts 전체 구현

```ts
// src/lib/api/validate-body.ts
//
// Design Ref: ft-zod-validation §2.1 — Generic Zod primitive (ads-agnostic).
// Usable across all modules. This PDCA applies it to arc-ads 20 write routes.
//
// Purpose: replace `await req.json() as Type` unsafe casts with runtime validation.
// Returns 400 `{error, fieldErrors}` on validation failure.

import { ZodError, type ZodSchema } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse }

export async function parseBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
): Promise<ParseResult<T>> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid JSON body', fieldErrors: {} },
        { status: 400 },
      ),
    }
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    return { success: false, response: validationErrorResponse(result.error) }
  }
  return { success: true, data: result.data }
}

export function validationErrorResponse(error: ZodError): NextResponse {
  return NextResponse.json(
    {
      error: 'Validation failed',
      fieldErrors: error.flatten().fieldErrors,
    },
    { status: 400 },
  )
}

/** Opt-in HOC. Basic routes use parseBody; this is for future higher-level compositions. */
export function withValidatedBody<T, Args extends unknown[]>(
  schema: ZodSchema<T>,
  handler: (req: NextRequest, body: T, ...args: Args) => Promise<NextResponse>,
) {
  return async (req: NextRequest, ...args: Args): Promise<NextResponse> => {
    const parsed = await parseBody(req, schema)
    if (!parsed.success) return parsed.response
    return handler(req, parsed.data, ...args)
  }
}
```

### 5.2 Route 변환 flow

```
┌──────────────────────────────────────────────────┐
│ 1. import parseBody + feature schema             │
│ 2. withAuth 핸들러 내부 첫 줄:                   │
│    const parsed = await parseBody(req, schema)   │
│ 3. if (!parsed.success) return parsed.response   │
│ 4. 기존 `as Type` 삭제                          │
│ 5. 기존 null/type 체크 제거 (schema가 보장)     │
│ 6. body 사용은 그대로                           │
└──────────────────────────────────────────────────┘
```

### 5.3 기존 validation 로직 처리

일부 routes는 이미 수동 체크를 하고 있음:
```ts
if (!body.profile_id || typeof body.daily_budget !== 'number') {
  return NextResponse.json({error: '...'}, {status: 400})
}
```
- **이 로직은 제거** (Zod가 커버)
- **단, 비즈니스 로직 검증**(e.g., `if (body.daily_budget > userMaxBudget)` ) 은 유지

---

## 6. Error Handling

### 6.1 Error Shape 표준화

| Scenario | Status | Response |
|----------|:------:|----------|
| Invalid JSON | 400 | `{error: 'Invalid JSON body', fieldErrors: {}}` |
| Schema 위반 | 400 | `{error: 'Validation failed', fieldErrors: {field: [msg]}}` |
| Auth 실패 | 401/403 | (withAuth 기존 동작) |
| 비즈니스 로직 실패 | 400/409 | 기존 route 로직 유지 |
| Server error | 500 | 기존 catch 블록 유지 |

### 6.2 Client 호환성

- 기존 frontend는 `response.ok` 로 처리 → 400은 이미 실패 케이스, **기존 UX 유지**
- Zod fieldErrors는 **추가 정보** — 클라이언트가 사용 안해도 되지만 사용하면 field-level 피드백 가능

---

## 7. Security

### 7.1 Injection 표면 축소

- SQL injection: Zod이 string enum/uuid/regex 검증 → DB로 가는 unexpected 값 차단
- JSON prototype pollution: Zod은 known keys만 parse (strict 모드 optional)
- XSS: Zod이 문자열 길이 max 제한 (e.g., `.max(200)`)

### 7.2 Information Disclosure

- fieldErrors는 **내부 필드명** 노출 — OK (API 계약상 드러난 정보)
- Zod 에러 메시지는 **기본값 영어** — 민감 정보 노출 없음
- stack trace는 절대 포함 안 함

### 7.3 Rate Limiting

- 이번 PDCA는 OOS (별도 PDCA)
- Zod 실패도 4xx이므로 Vercel/Upstream rate limiting에 자연스럽게 카운트됨

---

## 8. Test Plan

### 8.1 L1 API Tests (Playwright)

**File**: `e2e/zod-validation.spec.ts`

각 20 routes에 대해 4종 테스트:
1. **Empty body** → 400 `{error: 'Validation failed', fieldErrors: {...at least 1 field...}}`
2. **Missing required field** → 400 `fieldErrors[field]` 포함
3. **Wrong type** (e.g., string where number) → 400 해당 field 에러
4. **Valid smoke** → 400이 아닌 응답 (401/403/200/409 OK) — schema가 통과했음을 의미

**총 assertions**: 20 × 4 = **80+ checks**

**Invalid JSON 케이스** (1회 공통):
```ts
test('invalid JSON → 400 Invalid JSON body', async ({request}) => {
  const res = await request.post('/api/ads/campaigns', {
    data: 'this-is-not-json',
    headers: {'Content-Type': 'application/json'},
  })
  expect(res.status()).toBe(400)
  const body = await res.json()
  expect(body.error).toBe('Invalid JSON body')
})
```

### 8.2 L2/L3 UI Tests

- 이번 PDCA는 **L1만** (API 중심)
- UI regression은 ft-optimization-ui-wiring의 `e2e/optimization-ui.spec.ts`가 커버 (변경 없음)

### 8.3 Preview Smoke

```bash
# After preview deploy
BASE_URL=https://arc-ads-git-<branch>-<org>.vercel.app \
  pnpm playwright test e2e/zod-validation.spec.ts

# Manual smoke — 주요 valid workflow가 400 받지 않는지
curl -X POST $BASE_URL/api/ads/campaigns \
  -H "Content-Type: application/json" \
  -d '{valid payload...}'
# → 400이면 schema가 너무 strict → 조정 필요
```

### 8.4 Prod Smoke (after deploy)

- 24h 관찰: Vercel Logs에서 `grep " 400 "` count가 배포 전 대비 급증하면 alarm
- Sentry (if exists): 400 응답 카테고리 새로 생겼는지 확인

---

## 9. Performance

| Metric | Baseline | Target | Notes |
|--------|----------|--------|-------|
| Validation overhead | 0 | < 5ms p99 | Zod safeParse는 JS VM 사이클만 — 무시 가능 |
| Bundle size | baseline | +12KB gzipped | Zod ^3 gzipped 12KB |
| Cold start | baseline | +0-5ms | Next.js tree-shaking으로 사용된 스키마만 포함 |

---

## 10. Risks & Mitigation

| Risk | Mitigation | 확인 방법 |
|------|------------|----------|
| False-positive 400 for valid requests | 스키마에 `.optional()`, `.default()` 보수적 사용. Preview smoke에서 기존 workflow 실행. | SC-6 |
| 기존 TS type과 Zod infer 불일치 | `z.infer<T>`를 type alias로 reexport. 20 routes 각각 타입 체크 통과 확인. | SC-7 |
| Schema 파일 250 LOC 초과 | Feature schemas가 크면 `schemas/create.ts`, `schemas/update.ts` 로 split. | NFR-04 |
| Zod 버전 브레이킹 업데이트 | `"zod": "^3.23.x"` 정확한 minor 고정 + lockfile 커밋. | package.json |
| `src/lib/api/` 내 generic helper가 다른 모듈 무분별 사용 | JSDoc "Generic primitive" 주석 + 이번 PDCA 동안 ads routes만 적용 규칙. | §1.2 Module Isolation |

---

## 11. Implementation Guide

### 11.1 Dependency

```bash
pnpm add zod@^3.23
```

### 11.2 Implementation Order

```
S1: validate-body.ts (dependency: zod)
  ↓
S2: schemas (independent per feature)
  ↓
S3: routes (depends on schemas + helper)
  ↓
S4: e2e tests (depends on routes)
  ↓
S5: preview deploy → smoke → prod deploy
```

### 11.3 Session Guide (for `/pdca do --scope`)

**Module Map**:

| Scope Key | Files Created | Files Modified | Est. Time |
|-----------|--------------|----------------|-----------|
| `helper` | `src/lib/api/validate-body.ts` | `package.json`, `pnpm-lock.yaml` | 30m |
| `campaigns` | `src/modules/ads/features/campaigns/schemas.ts` | 3 routes (campaigns, [id], goal-mode) | 1h |
| `budgets-rules-keywords` | 3 schema files | 5 routes | 1.5h |
| `recommendations-autopilot` | 2 schema files | 5 routes | 1.5h |
| `dayparting-alerts-reports` | 3 schema files | 4 routes | 1.5h |
| `amazon` | 1 schema file | 2 routes | 30m |
| `e2e` | `e2e/zod-validation.spec.ts` | — | 1.5h |
| `deploy` | — | (git push, vercel preview, smoke, prod) | 30m |

**Recommended Session Plan**:

```
Session 1:  /pdca do ft-zod-validation --scope helper
Session 2:  /pdca do ft-zod-validation --scope campaigns
Session 3:  /pdca do ft-zod-validation --scope budgets-rules-keywords
Session 4:  /pdca do ft-zod-validation --scope recommendations-autopilot
Session 5:  /pdca do ft-zod-validation --scope dayparting-alerts-reports
Session 6:  /pdca do ft-zod-validation --scope amazon
Session 7:  /pdca do ft-zod-validation --scope e2e
Session 8:  /pdca do ft-zod-validation --scope deploy
```

**Or 3-session sprint** (combined):

```
Sprint 1:  --scope helper,campaigns,budgets-rules-keywords   (~3h)
Sprint 2:  --scope recommendations-autopilot,dayparting-alerts-reports,amazon  (~3.5h)
Sprint 3:  --scope e2e,deploy                                 (~2h)
```

---

## 12. Rollback Plan

이번 PDCA의 모든 변경은 **격리 가능**:

1. **Helper revert**: `rm src/lib/api/validate-body.ts` — 영향 없음 (사용처가 revert되면)
2. **Schema revert**: `rm -rf src/modules/ads/features/*/schemas.ts` — 영향 없음
3. **Route revert**: `git revert <commit>` — route별 독립 revert 가능 (S2~S6 그룹별 커밋)
4. **Package revert**: `pnpm remove zod` — 모든 import 제거 후

**Blast radius**: arc-ads only. 다른 모듈에 영향 가는 경로 0.

---

## 13. Executive Summary (Mirror from Plan)

| Perspective | Content |
|-------------|---------|
| **Problem** | arc-ads 20개 write API가 `await req.json() as Type` unsafe cast. 선행 2 PDCA follow-up. |
| **Solution** | `parseBody()` primitive + feature-local schemas + `{error, fieldErrors}` 400 응답 (Option C Pragmatic Balance). |
| **Function/UX Effect** | 잘못된 요청 즉시 400, field-level 피드백 가능, 향후 react-hook-form 재사용. |
| **Core Value** | 보안/안정성 + 선행 PDCA 인프라 위 검증 레이어 완성 → arc-ads write 경로 production-ready. |
