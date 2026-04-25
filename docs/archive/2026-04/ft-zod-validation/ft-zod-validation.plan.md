# ft-zod-validation Planning Document

> **Summary**: Zod 런타임 검증을 arc-ads 모듈 20개 write API (POST/PUT/PATCH)에 일괄 도입하여 unsafe cast (`await req.json() as Type`) 패턴을 전면 대체한다.
>
> **Project**: arc-ads (A.R.C. — AD Optimizer 모듈)
> **Version**: Post ft-runtime-hardening + ft-optimization-ui-wiring (2건 follow-up 해소)
> **Author**: Jayden Song
> **Date**: 2026-04-23
> **Status**: Draft
> **Module Isolation**: arc-ads ONLY (ip/crawler 모듈 절대 불간섭)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | arc-ads의 20개 write API(POST/PUT/PATCH)가 `await req.json() as Type` unsafe cast를 쓴다. 잘못된 payload(누락 필드, 잘못된 타입, 범위 초과)가 DB 레이어에서 cryptic 에러 또는 silent 파손을 일으킨다. 선행 2개 PDCA에서 Medium follow-up으로 지목됨. |
| **Solution** | `zod` 설치 + `src/lib/api/validate-body.ts` generic helper(cron-handler 패턴 미러) + 20 routes에 Zod schema + 400 `{error, fieldErrors}` 응답. Playwright L1로 invalid/valid payload 회귀 자동화. |
| **Function/UX Effect** | 잘못된 요청 즉시 400 (DB 미도달), 클라이언트가 field별 에러 메시지 매핑 가능 → 향후 react-hook-form 도입 시 재사용. 개발자는 타입-런타임 일치 보장으로 디버깅 시간 단축. |
| **Core Value** | 보안 경계(SQL/JSON injection 표면 축소) + 선행 PDCA 인프라(AdsAdminContext, createCronHandler) 위에 검증 레이어 완성 → arc-ads 모듈의 write 경로 production-ready. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | ads 20 routes가 런타임 검증 0. 잘못된 payload가 DB까지 흘러 `invalid input syntax for type numeric: "abc"` 같은 5xx/PGRST 에러로 표출. 선행 PDCA 2건(runtime-hardening, optimization-ui-wiring)이 동일 follow-up으로 지목. |
| **WHO** | arc-ads 백엔드 개발자(write 경로 안전성), 마케터/디렉터(잘못된 입력 즉시 피드백), 향후 클라이언트 폼 리팩터(field-level 에러 UX). |
| **RISK** | 20 routes 일괄 변경 시 기존 정상 호출이 Zod schema 엄격성으로 400 받을 가능성(false positive). → Preview E2E에서 valid path 회귀 필수. 모듈 격리: `src/lib/api/validate-body.ts`가 다른 모듈에도 노출되지만 ads 의존 0 (generic primitive). |
| **SUCCESS** | SC-1~SC-8: zod 설치, validate-body helper 생성, 20 routes Zod 적용, 400 응답 shape 표준화, Playwright L1 통과, preview smoke 성공, prod 배포 무회귀, TypeScript/lint 클린. |
| **SCOPE** | `src/app/api/ads/**` 20 routes + `src/lib/api/validate-body.ts`(신규) + `src/modules/ads/*/schemas/*.ts`(신규). OOS: GET query 검증, response 검증, client-side react-hook-form 마이그레이션, 다른 모듈(ip/crawler). |

---

## 1. Overview

### 1.1 Purpose

arc-ads 모듈의 모든 write API가 런타임에 요청 payload를 검증하도록 하여:
1. 잘못된 입력을 DB 도달 전 400으로 차단
2. 클라이언트에 field-level 에러 피드백 제공
3. TypeScript 타입 ≡ 런타임 보장 확립 (`as Type` 제거)
4. 선행 PDCA 인프라(AdsAdminContext) 위에 입력 검증 레이어 완성

### 1.2 Background

**선행 PDCA 2건 지목**:
- `ft-runtime-hardening` followUps: `"ft-zod-validation: Zod 검증 전 POST/PUT (Medium)"`
- `ft-optimization-ui-wiring` followUps: `"ft-zod-validation (Medium, 원래 OOS): 전 POST/PUT Zod 검증"`

**현재 패턴 샘플** (20 routes 공통):
```ts
// src/app/api/ads/campaigns/[id]/route.ts:56
const body = await req.json() as UpdateCampaignRequest
// body.daily_budget가 "abc"라도 타입 체커는 통과 → DB에서 에러
```

**baseline 조사**:
- Ads API write routes: **20개** (`find src/app/api/ads -name route.ts | xargs grep -lE "await (request|req).json()"`)
- `zod` 의존성: **미설치** (package.json 확인)
- 기존 Zod 사용처: arc-ads 전체 **0건**
- `src/lib/api/cron-handler.ts`: ft-runtime-hardening에서 확립된 패턴 → `validate-body.ts`도 동일 구조로

### 1.3 Related Documents

- [ft-runtime-hardening report](docs/archive/2026-04/ft-runtime-hardening/ft-runtime-hardening.report.md)
- [ft-optimization-ui-wiring report](docs/archive/2026-04/ft-optimization-ui-wiring/ft-optimization-ui-wiring.report.md)
- [src/lib/api/cron-handler.ts](src/lib/api/cron-handler.ts) — reference pattern
- [CLAUDE.md Module Isolation rule](CLAUDE.md) — 모듈 격리 절대 규칙
- [docs/BOUNDARIES.md](docs/BOUNDARIES.md)

---

## 2. Scope

### 2.1 In Scope

**S1 — Dependency + Helper (신규 파일 1)**
- [ ] `pnpm add zod` (peer: Next.js 15/TS 5 호환)
- [ ] `src/lib/api/validate-body.ts` (신규)
  - Export: `parseBody<T>(req: NextRequest, schema: ZodSchema<T>): Promise<ParseResult<T>>`
  - Export: `validationErrorResponse(error: ZodError): NextResponse` — `{error, fieldErrors}` 400
  - Pure generic, no ads dependency

**S2 — Schema 정의 (ads 모듈 내부, 신규 파일 N개)**
- [ ] `src/modules/ads/features/campaigns/schemas.ts` — create/update/goal-mode
- [ ] `src/modules/ads/features/budgets/schemas.ts` — save budget
- [ ] `src/modules/ads/features/rules/schemas.ts` — create/update/simulate
- [ ] `src/modules/ads/features/keywords/schemas.ts` — create/update
- [ ] `src/modules/ads/features/recommendations/schemas.ts` — approve/skip
- [ ] `src/modules/ads/features/autopilot/schemas.ts` — run/settings/rollback
- [ ] `src/modules/ads/features/optimization/schemas.ts` — dayparting(2)
- [ ] `src/modules/ads/features/alerts/schemas.ts` — action
- [ ] `src/modules/ads/features/reports/schemas.ts` — export
- [ ] `src/modules/ads/features/amazon/schemas.ts` — sync, profile connect

**S3 — 20 Routes 적용 (수정만, 신규 X)**
| # | Route | Methods |
|---|-------|:-:|
| 1 | `src/app/api/ads/campaigns/route.ts` | POST |
| 2 | `src/app/api/ads/campaigns/[id]/route.ts` | PUT/PATCH |
| 3 | `src/app/api/ads/campaigns/[id]/goal-mode/route.ts` | PATCH |
| 4 | `src/app/api/ads/budgets/route.ts` | POST |
| 5 | `src/app/api/ads/rules/route.ts` | POST |
| 6 | `src/app/api/ads/rules/[id]/route.ts` | PUT/PATCH |
| 7 | `src/app/api/ads/rules/simulate/route.ts` | POST |
| 8 | `src/app/api/ads/keywords/route.ts` | POST |
| 9 | `src/app/api/ads/keywords/[id]/route.ts` | PUT/PATCH |
| 10 | `src/app/api/ads/recommendations/[id]/approve/route.ts` | POST |
| 11 | `src/app/api/ads/recommendations/[id]/skip/route.ts` | POST |
| 12 | `src/app/api/ads/autopilot/run/route.ts` | POST |
| 13 | `src/app/api/ads/autopilot/[id]/settings/route.ts` | PUT/PATCH |
| 14 | `src/app/api/ads/autopilot/[id]/rollback/route.ts` | POST |
| 15 | `src/app/api/ads/dayparting/ai-schedule/route.ts` | POST |
| 16 | `src/app/api/ads/dayparting/schedules/route.ts` | PUT |
| 17 | `src/app/api/ads/alerts/[id]/action/route.ts` | POST |
| 18 | `src/app/api/ads/reports/export/route.ts` | POST |
| 19 | `src/app/api/ads/amazon/sync/route.ts` | POST |
| 20 | `src/app/api/ads/amazon/profiles/[id]/connect/route.ts` | POST |

**S4 — E2E 테스트 (신규 파일 1)**
- [ ] `e2e/zod-validation.spec.ts` — L1 API smoke
  - Each route: empty body → 400, missing required field → 400, wrong type → 400
  - Valid body smoke: 200 or 401(auth) — 400이 아니면 schema 통과
  - Sample invalid payload list per route

**S5 — 선택적 업그레이드 (낮은 우선순위, scope에는 포함)**
- [ ] `withValidatedBody<T>(handler, schema)` higher-order wrapper — optional pattern, routes가 원하면 채택

### 2.2 Out of Scope (절대 불간섭)

- ❌ **다른 모듈**: `src/app/api/ip/**`, `src/app/api/crawler/**`, `src/app/api/bandwidth/**`, `src/app/api/feedback/**` 등
- ❌ **다른 모듈 로직**: `src/modules/ip/**`, `src/modules/shared/**` (이번 PDCA에서 수정 없음)
- ❌ **GET query string 검증** — URL searchParams 검증은 별도 PDCA(`ft-zod-query-validation`)
- ❌ **Response 검증** — outbound 타입 런타임 체크는 OOS
- ❌ **Client-side 폼 리팩터** — react-hook-form + @hookform/resolvers 도입은 OOS
- ❌ **Rate limiting** — 별도 PDCA
- ❌ **Cron route body** — cron은 Vercel이 body 없이 GET 호출이므로 S3 목록에서 제외 (이미 ft-runtime-hardening에서 createCronHandler로 처리됨)
- ❌ **stream/webhook route** — 외부(Amazon) 포맷 고정이라 별도 PDCA
- ❌ **Auth/RBAC** (`src/lib/auth/*`) — 현재 `withAuth` 유지
- ❌ **DB 스키마 변경** — `ads.*`, `public.*` 테이블 구조 불변
- ❌ **하드코딩 상수 → system_configs 이관** — `ft-config-migration`에서 처리

### 2.3 Module Isolation Guarantee

```
✅ ads/* → zod (외부 lib)
✅ ads/* → lib/api/validate-body (generic primitive, ads 의존 0)
✅ ads/* → modules/ads/**/schemas (모듈 내부)
❌ ads 변경이 ip/crawler 런타임 영향 경로: 없음
❌ public.* 테이블/쿼리 변경: 없음
❌ shared module signature 변경: 없음
```

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|:--------:|
| FR-01 | `zod` 의존성 설치 (dependencies, devDependencies 아님) | High |
| FR-02 | `src/lib/api/validate-body.ts` — `parseBody()` + `validationErrorResponse()` export | High |
| FR-03 | 20 routes 전부 `await req.json() as Type` 제거, Zod schema 사용 | High |
| FR-04 | Validation 실패 시 HTTP 400 + `{error: string, fieldErrors: Record<string, string[]>}` | High |
| FR-05 | Schema는 각 feature 내부 `schemas.ts` 파일에 위치 (모듈 격리) | High |
| FR-06 | Zod 스키마의 타입이 기존 request type(`CreateCampaignRequest` 등)과 동등성 유지 (`z.infer<T>` 사용 가능) | Medium |
| FR-07 | Route마다 Design Ref 주석 `// Plan SC-3: Zod validation applied` 추가 | Medium |
| FR-08 | Playwright L1 테스트 — invalid body 3종(empty/missing-field/wrong-type) + valid smoke | High |
| FR-09 | 기존 동작(auth guard, response 포맷)은 변경 없음 | High |

### 3.2 Non-Functional Requirements

| ID | Requirement | Priority |
|----|-------------|:--------:|
| NFR-01 | Validation 응답 지연 < 5ms (Zod parse는 마이크로초 단위) | Medium |
| NFR-02 | 번들 크기 증가 < 15KB (Zod gzipped ~12KB) | Low |
| NFR-03 | TypeScript strict 모드 호환 | High |
| NFR-04 | ESLint `max-lines=250` 준수 — schema 파일이 초과하면 feature별 분리 | High |
| NFR-05 | 모듈 격리 — helper는 lib/api에, schema는 modules/ads 내부 | High |
| NFR-06 | 기존 호출자(frontend)의 valid request가 계속 통과(false-positive 0) | Critical |

### 3.3 Success Criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| SC-1 | `package.json`에 `zod` 추가됨 | `pnpm ls zod` |
| SC-2 | `src/lib/api/validate-body.ts` 생성 + export 2개 | 파일 존재 + `grep -E "export (function\|const) (parseBody\|validationErrorResponse)"` |
| SC-3 | 20 routes 전부 Zod 사용 (unsafe cast 0건) | `grep -rlnE "await (req\|request)\.json\(\) as " src/app/api/ads \| wc -l` ≥ 0 → **0이어야 함** |
| SC-4 | 20 routes의 400 응답 shape 표준화 | Playwright test에서 response body key가 `error`, `fieldErrors` 모두 존재 |
| SC-5 | Playwright L1 통과 (20 routes × 3 invalid + 1 valid smoke = 80 assertions 이상) | `pnpm playwright test e2e/zod-validation.spec.ts` passed |
| SC-6 | Preview 배포 smoke 성공 (기존 frontend valid request가 400 받지 않음) | `curl` preview URL로 주요 페이지 valid body 호출 → 400 0건 |
| SC-7 | `pnpm typecheck && pnpm lint && pnpm build` 클린 | terminal exit 0 |
| SC-8 | Prod 배포 후 24h 기존 write 트래픽 에러율 변동 없음 | Vercel Logs `grep " 400 "` count 24h 비교 |

---

## 4. Key Decisions

### 4.1 Why Zod (not io-ts / Yup / Joi / Valibot)?

- ✅ **TypeScript-first**: `z.infer<T>` 한 소스로 타입+런타임
- ✅ **Next.js/Vercel 생태계 표준** (드림팀: tRPC, Remix, Vercel AI SDK 등)
- ✅ **번들 크기 적당** (12KB gzipped) — Valibot이 더 작지만 생태계 작음
- ❌ io-ts는 API 난해, Yup은 TS 통합 약함, Joi는 브라우저 제한

### 4.2 Schema 배치 결정: feature 내부 vs 중앙 집중

**선택: Feature 내부** (`src/modules/ads/features/{feature}/schemas.ts`)
- 이유: CLAUDE.md "Module Isolation" + 기존 `queries.ts`, `types.ts` 패턴 일관성
- 대안(중앙 `src/modules/ads/schemas/`)은 feature 간 순환 의존 위험

### 4.3 Error Shape: `{error, fieldErrors}` 확정

```json
{
  "error": "Validation failed",
  "fieldErrors": {
    "daily_budget": ["Number must be greater than 0"],
    "campaign_name": ["Required"]
  }
}
```
- Zod `flatten().fieldErrors` 직접 매핑
- react-hook-form `<input>` name → error 매핑 호환

### 4.4 Helper 위치: `src/lib/api/` (공용 primitive)

- ft-runtime-hardening `cron-handler.ts`와 동일 위치
- Pure generic — 다른 모듈이 나중에 채택해도 ads 영향 없음
- **모듈 격리 확인**: helper는 Zod만 의존, ads 타입/테이블 참조 0

### 4.5 HOC wrapper(`withValidatedBody`) 채택 여부

- **기본**: `parseBody()` 함수 호출 방식 (현재 route 구조 최소 변경)
- **선택**: `withValidatedBody(handler, schema)` wrapper — 일부 라우트가 채택 가능 (Low priority)

---

## 5. Technical Approach

### 5.1 Helper API (validate-body.ts)

```ts
// src/lib/api/validate-body.ts (generic, ~60 LOC)
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
```

### 5.2 Route 변환 예시

**Before** (`src/app/api/ads/campaigns/route.ts:63`):
```ts
const body = await req.json() as CreateCampaignRequest
// body.daily_budget가 "abc"여도 통과
```

**After**:
```ts
import { parseBody } from '@/lib/api/validate-body'
import { createCampaignSchema } from '@/modules/ads/features/campaigns/schemas'

// Plan SC-3: Zod validation applied
const parsed = await parseBody(req, createCampaignSchema)
if (!parsed.success) return parsed.response
const body = parsed.data // typed as z.infer<typeof createCampaignSchema>
```

### 5.3 Schema 정의 예시

```ts
// src/modules/ads/features/campaigns/schemas.ts
import { z } from 'zod'

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  profile_id: z.string().uuid(),
  campaign_type: z.enum(['SP', 'SB', 'SD']),
  daily_budget: z.number().positive(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ...
})
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
```

### 5.4 Testing Strategy

- **L1 API (Playwright)**: 20 routes × [empty body, missing-field, wrong-type, valid smoke] = 80+ 검증
- **Preview smoke**: `BASE_URL=<preview> pnpm playwright test e2e/zod-validation.spec.ts`
- **Prod 배포 후 24h**: Vercel Logs에서 400 응답 추세 관찰 (기존 호출자 회귀 방지)

---

## 6. Implementation Plan

### 6.1 Session Plan (8 sessions, 약 1-2일)

| Session | Scope | Files | Estimated Time |
|---------|-------|-------|----------------|
| S1 | `pnpm add zod` + `validate-body.ts` 작성 | +1 new, package.json | 30m |
| S2 | Campaigns(4 routes) + schemas.ts | +1 schema, 4 routes | 1h |
| S3 | Budgets + Rules + Keywords (5 routes) | +3 schema, 5 routes | 1.5h |
| S4 | Recommendations + Autopilot (5 routes) | +2 schema, 5 routes | 1.5h |
| S5 | Dayparting + Alerts + Reports (4 routes) | +3 schema, 4 routes | 1.5h |
| S6 | Amazon (2 routes) | +1 schema, 2 routes | 30m |
| S7 | Playwright L1 테스트 + valid smoke | +1 new test | 1.5h |
| S8 | Preview deploy + smoke + prod deploy | no code | 30m |

**Total**: ~8.5h 실제 작업, 20 routes + 11 schemas + 1 helper + 1 test

### 6.2 Dependencies

- 외부: `zod@^3` (peer-free, Next.js 15 / TS 5 호환 확인)
- 내부: 선행 PDCA 없음 (ft-runtime-hardening은 완료됨)

---

## 7. Rollback Plan

| Trigger | Action |
|---------|--------|
| SC-6 실패 (preview에서 valid request 400) | 해당 route의 schema loosen (`.optional()`, `z.any()` 부분 허용) 후 재배포 |
| Prod 배포 후 400 에러율 증가 | `git revert <merge-commit>` — 모든 변경이 isolated (helper + schemas만 추가, 기존 핸들러 로직 변경 최소) |
| `zod` 번들 크기 초과 | `devDependencies`로 이동은 불가 (런타임 의존). 대안: `valibot`으로 교체 PDCA 분기 |
| Critical bug in helper | `validate-body.ts` 내부에서 early-return `{success:true, data: raw as T}` 토글 flag — hot-patch 가능 |

Rollback blast radius: **arc-ads 모듈만**. 타 모듈에 import 되지 않으므로 revert 격리 완벽.

---

## 8. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|------------|
| R-1: 기존 valid request가 Zod 엄격성으로 400 받음 (false positive) | Medium | High | SC-6 preview smoke 필수. 스키마는 기존 type + 실제 payload 샘플 교차 검증. `.optional()`·`.default()` 보수적 사용. |
| R-2: 20 routes 동시 변경 → PR 리뷰 난이도 | Medium | Medium | S2~S6로 라우트 그룹별 커밋 분리. 각 그룹 독립적 revert 가능. |
| R-3: Schema ↔ TypeScript Request 타입 동기 누락 | Medium | Medium | `z.infer<T>` 사용을 권장. 기존 `types.ts`의 request type은 `export type X = z.infer<typeof xSchema>`로 치환. |
| R-4: Playwright e2e 실행 환경 미비 | Low | Medium | ft-optimization-ui-wiring에서 이미 playwright 설정됨 (`e2e/*.spec.ts` + `playwright.config.ts`). |
| R-5: `src/lib/api/validate-body.ts`가 다른 모듈 개발자에게 혼동 | Low | Low | Helper JSDoc에 "Generic Zod primitive — usable across modules" 명시. |
| R-6: Zod 버전 업그레이드 브레이킹 변경 | Low | Low | `zod@^3` 고정, package-lock 커밋. |

---

## 9. Appendix

### 9.1 20 Routes Inventory (baseline 조사)

```bash
$ find src/app/api/ads -name route.ts -exec grep -lE "await (request|req)\.json\(\)" {} \; | sort
src/app/api/ads/alerts/[id]/action/route.ts
src/app/api/ads/amazon/profiles/[id]/connect/route.ts
src/app/api/ads/amazon/sync/route.ts
src/app/api/ads/autopilot/[id]/rollback/route.ts
src/app/api/ads/autopilot/[id]/settings/route.ts
src/app/api/ads/autopilot/run/route.ts
src/app/api/ads/budgets/route.ts
src/app/api/ads/campaigns/[id]/goal-mode/route.ts
src/app/api/ads/campaigns/[id]/route.ts
src/app/api/ads/campaigns/route.ts
src/app/api/ads/dayparting/ai-schedule/route.ts
src/app/api/ads/dayparting/schedules/route.ts
src/app/api/ads/keywords/[id]/route.ts
src/app/api/ads/keywords/route.ts
src/app/api/ads/recommendations/[id]/approve/route.ts
src/app/api/ads/recommendations/[id]/skip/route.ts
src/app/api/ads/reports/export/route.ts
src/app/api/ads/rules/[id]/route.ts
src/app/api/ads/rules/route.ts
src/app/api/ads/rules/simulate/route.ts
```

### 9.2 예상 신규 파일 12개

> Note (post-implementation): `budgets`는 기존 `budget-planning` feature 폴더에 schemas.ts를 추가하는 것으로 통합 — 신규 폴더 생성 없음. 따라서 schema 파일 10개 (당초 11개 예상에서 -1).

```
src/lib/api/validate-body.ts                                (1)
src/modules/ads/features/campaigns/schemas.ts               (2)
src/modules/ads/features/budget-planning/schemas.ts         (3) ← 기존 폴더 사용
src/modules/ads/features/rules/schemas.ts                   (4)
src/modules/ads/features/keywords/schemas.ts                (5)
src/modules/ads/features/recommendations/schemas.ts         (6)
src/modules/ads/features/autopilot/schemas.ts               (7)
src/modules/ads/features/optimization/schemas.ts            (8)
src/modules/ads/features/alerts/schemas.ts                  (9)
src/modules/ads/features/reports/schemas.ts                 (10)
src/modules/ads/features/amazon/schemas.ts                  (11)
e2e/zod-validation.spec.ts                                  (12, gitignored)
docs/02-design/features/ft-zod-validation.design.md         (Design phase 산출물)
```

### 9.3 예상 수정 파일 22개

- 20 route files (`src/app/api/ads/**/route.ts`)
- `package.json` + `pnpm-lock.yaml`

**총 변경 규모 추정**: +800 LOC(신규) / +200/-100(기존 20 routes의 cast→parse 변환), 12 new files / 22 modified.

---

## 10. Follow-ups (OOS but tracked)

- **ft-zod-query-validation** (Medium): GET 라우트 searchParams Zod 검증
- **ft-zod-response-validation** (Low): outbound response shape 런타임 검증
- **ft-client-form-rhf-migration** (Medium): react-hook-form + `@hookform/resolvers/zod` 도입 (schemas 재사용)
- **ft-webhook-validation** (Medium): `src/app/api/ads/stream/webhook/route.ts` — Amazon 포맷 별도 검증
- **ft-rate-limiting** (Medium): write route 429 레이어
- **Other-module adoption**: ip/crawler 모듈도 동일 패턴 도입 (각 모듈 별도 PDCA)
