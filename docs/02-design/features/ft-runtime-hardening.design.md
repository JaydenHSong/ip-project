# ft-runtime-hardening Design Document

> **Summary**: Clean Architecture 기반 런타임 인프라 하드닝 — `AdsAdminContext` 단일 진입점과 `createCronHandler` 공용 팩토리를 도입해 4대 반복 결함을 타입 레벨에서 차단
>
> **Project**: arc-ads
> **Author**: Jayden Song
> **Date**: 2026-04-21
> **Status**: Ready for Implementation
> **Architecture**: Option B — Clean Architecture

---

## Context Anchor

(from Plan)

| Key | Value |
|-----|-------|
| **WHY** | 5개 스코프 평균 66% Match Rate, 23 Critical. 4대 패턴이 전 모듈에 퍼져 있어 피처별보다 인프라 단일 PDCA가 효과적 |
| **WHO** | arc-ads 개발자 + Spigen 마케터/디렉터/CEO |
| **RISK** | R-6 B1/B2 완료 후에도 upstream cron 데이터 자체가 empty라 48h 관찰 필수. 추가로 Option B 선택으로 기존 정상 코드까지 수정되는 blast radius 리스크 |
| **SUCCESS** | SC-1~SC-7 (10 route / 4 cron / schedule / CEO brands≥1 / Director team≥1 / E2E pass / 24h cron cycle) |
| **SCOPE** | B1+B2+B3+B4 only. Zod/system_configs/UI wiring은 별도 PDCA |

---

## 1. Overview

### 1.1 Selected Architecture — Option B (Clean Architecture)

사용자 선택 이유 추정: 재발 방지력 최우선. 4대 결함이 **개별 수정으로는 반복 발생할 가능성 높음**을 5개 스코프 검증에서 확인.

**핵심 결정**:
- `AdsAdminContext` 타입을 만들어 **"ads 모듈에서 DB 접근할 때는 반드시 이 컨텍스트를 통해야 한다"는 규약을 타입으로 강제**
- 4개 cron route 공통 패턴(`CRON_SECRET` 검증 + handler 실행 + error envelope)을 `createCronHandler` factory로 추출하여 **verb 불일치 재발 원천 차단** (GET/POST 자동 re-export)
- Dashboard helper의 cross-schema 접근은 **두 클라이언트를 묶은 Context 파라미터 한 개**로 해결 (개별 파라미터 아님)

### 1.2 Non-Goals (이 Design에서 다루지 않음)

- Zod validation 전면 도입 → `ft-zod-validation`
- `system_configs` 이관 → `ft-config-migration`
- UI 배선 누락 fix → scope별 별도 PDCA
- ESLint rule로 `createAdminClient()` 직접 사용 금지 → 후속 (Option B의 장기 효과 강화용)

---

## 2. Architecture Overview

### 2.1 Layered Structure

```
┌──────────────────────────────────────────────────────┐
│ API Route Layer (entry points)                        │
│  - src/app/api/ads/**/route.ts                        │
│  - src/app/api/ads/cron/**/route.ts                   │
└───────────────┬───────────────────────────────────────┘
                │ inject
┌───────────────▼───────────────────────────────────────┐
│ Shared Infrastructure (NEW)                           │
│  - src/lib/supabase/ads-context.ts   [AdsAdminContext]│
│  - src/lib/api/cron-handler.ts       [createCronHandler]│
└───────────────┬───────────────────────────────────────┘
                │ uses
┌───────────────▼───────────────────────────────────────┐
│ Base Supabase Clients (existing, unchanged)           │
│  - src/lib/supabase/admin.ts                          │
│    ├─ createAdminClient()        (public schema)      │
│    └─ createAdsAdminClient()     (ads schema)         │
│  - src/lib/supabase/table-names.ts                    │
│    ├─ adsTable(name: AdsTableName)                    │
│    └─ publicTable(name: PublicTableName)              │
└───────────────────────────────────────────────────────┘
                ▲ consumed by
┌───────────────┴───────────────────────────────────────┐
│ Service/Engine Layer (ads module internals)           │
│  - src/modules/ads/cron/*.ts                          │
│  - src/modules/ads/engine/autopilot/*.ts              │
│  - src/modules/ads/features/dashboard/queries/*.ts    │
│  - src/modules/ads/features/**/queries.ts             │
└───────────────────────────────────────────────────────┘
```

### 2.2 Core Abstractions

#### 2.2.1 `AdsAdminContext` (src/lib/supabase/ads-context.ts — NEW)

```typescript
// Design Ref: §2.2.1 — 단일 진입점으로 cross-schema 접근 강제
import { createAdminClient, createAdsAdminClient } from './admin';
import { adsTable, publicTable, type AdsTableName, type PublicTableName } from './table-names';

export type AdsAdminContext = {
  /** ads 스키마 전용 클라이언트 (campaigns, keywords, automation_log, report_snapshots, ...) */
  ads: ReturnType<typeof createAdsAdminClient>;
  /** public 스키마 전용 클라이언트 (brand_markets, org_units, system_configs, users, ...) */
  public: ReturnType<typeof createAdminClient>;
  /** 컴파일 타임 ads 테이블명 typo 가드 */
  adsTable: typeof adsTable;
  /** 컴파일 타임 public 테이블명 typo 가드 */
  publicTable: typeof publicTable;
};

export function createAdsAdminContext(): AdsAdminContext {
  return {
    ads: createAdsAdminClient(),
    public: createAdminClient(),
    adsTable,
    publicTable,
  };
}
```

**사용 패턴**:
```typescript
// ❌ Before (buggy — 10 routes)
const db = createAdminClient();
await db.from('ads.ai_reviews').select();   // literal "ads.ai_reviews" in public schema → 404

// ❌ Before (acceptable but inconsistent — scattered across codebase)
const db = createAdsAdminClient();
await db.from('ai_reviews').select();

// ✅ After (Option B — single entry point)
const ctx = createAdsAdminContext();
await ctx.ads.from(ctx.adsTable('ai_reviews')).select();
await ctx.public.from(ctx.publicTable('brand_markets')).select();  // 크로스 스키마도 같은 컨텍스트에서
```

#### 2.2.2 `createCronHandler` (src/lib/api/cron-handler.ts — NEW)

```typescript
// Design Ref: §2.2.2 — cron verb 불일치 재발 원천 차단
import { NextRequest, NextResponse } from 'next/server';
import { createAdsAdminContext, type AdsAdminContext } from '@/lib/supabase/ads-context';

export type CronHandlerResult<T> = {
  data: T;
  summary?: string;
};

export type CronHandler<T> = (
  ctx: AdsAdminContext,
  req: NextRequest,
) => Promise<CronHandlerResult<T>>;

export type CronHandlerOptions = {
  /** 태그용. 에러 메시지에 포함됨 */
  name: string;
  /** Vercel Function maxDuration (seconds) */
  maxDuration?: number;
};

export function createCronHandler<T>(
  handler: CronHandler<T>,
  options: CronHandlerOptions,
) {
  const impl = async (req: NextRequest) => {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid CRON_SECRET' } },
        { status: 401 },
      );
    }

    try {
      const ctx = createAdsAdminContext();
      const { data, summary } = await handler(ctx, req);
      return NextResponse.json({
        success: true,
        data,
        ...(summary && { summary }),
        _meta: { name: options.name, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        {
          error: {
            code: 'CRON_ERROR',
            message: `[${options.name}] ${message}`,
          },
        },
        { status: 500 },
      );
    }
  };

  return { GET: impl, POST: impl };
}
```

**사용 패턴**:
```typescript
// ✅ After — 4 cron routes all look like this
import { createCronHandler } from '@/lib/api/cron-handler';
import { runAutoPilotCron } from '@/modules/ads/cron/autopilot-run';

const handler = createCronHandler(
  async (ctx) => runAutoPilotCron(ctx),
  { name: 'autopilot-run', maxDuration: 300 },
);

export const { GET, POST } = handler;
export const maxDuration = 300;
```

**핵심 효과**:
- **Verb 실수 불가능**: `createCronHandler`는 `GET`과 `POST` 둘 다 export. 개발자가 명시적으로 한쪽만 export 하려 해도 타입이 factory 리턴을 강제함
- **Auth 실수 불가능**: `CRON_SECRET` 검증이 factory 내부에서 자동. route 레벨에서 누락 불가
- **Error envelope 통일**: 모든 cron이 동일한 `{error: {code, message}}` 형식 반환

---

## 3. File-by-File Implementation Plan

### 3.1 New Files (2개)

| # | 파일 | LOC 예상 | 책임 |
|---|------|---------|------|
| 1 | `src/lib/supabase/ads-context.ts` | ~35 | `AdsAdminContext` 타입 + 팩토리 |
| 2 | `src/lib/api/cron-handler.ts` | ~60 | `createCronHandler` 팩토리 |

### 3.2 Modified Files (B1 — 10 buggy routes)

| # | 파일 | 변경 내용 |
|---|------|----------|
| 1 | `src/app/api/ads/campaigns/[id]/goal-mode/route.ts` | `createAdminClient` → `createAdsAdminContext`; `.from('ads.campaigns')` → `ctx.ads.from(ctx.adsTable('campaigns'))` |
| 2 | `src/app/api/ads/autopilot/ai-reviews/route.ts` | 동일 패턴; `ads.ai_reviews` → `ctx.ads.from(ctx.adsTable('ai_reviews'))` |
| 3 | `src/app/api/ads/autopilot/[id]/settings/route.ts` | 동일 + `brand_market_id` 스코프 가드 추가 유지 (I-2 방어는 out-of-scope지만 회귀 막기 위해 코드 변경 시 보존) |
| 4 | `src/app/api/ads/recommendations/[id]/approve/route.ts` | `ads.keyword_recommendations`, `ads.campaigns` → ctx.ads 변환 |
| 5 | `src/app/api/ads/reports/snapshots/route.ts` | `ads.report_snapshots` → ctx.ads; granularity 필터 제거 (존재 않는 컬럼) — B1 스코프에서 같이 처리 |
| 6 | `src/app/api/ads/reports/export/route.ts` | 동일; CSV 생성 로직은 유지 |
| 7 | `src/app/api/ads/cron/autopilot-run/route.ts` | §3.3 참조 (createCronHandler로 통합) |
| 8 | `src/app/api/ads/cron/keyword-pipeline/route.ts` | §3.3 참조 |
| 9 | `src/app/api/ads/cron/ai-weekly-review/route.ts` | §3.3 참조 |
| 10 | `src/app/api/ads/cron/sync-reports/route.ts` | §3.3 참조 |

### 3.3 Modified Files (B2 — 4 cron routes to createCronHandler)

위 7-10번과 동일 파일. cron route 4개는 **createCronHandler를 통해 `AdsAdminContext` + `GET/POST` + auth가 한 번에 해결**되므로 B1과 B2가 같은 수정에서 동시에 커버됨.

각 cron route 수정 후 모양:

```typescript
// src/app/api/ads/cron/autopilot-run/route.ts
import { createCronHandler } from '@/lib/api/cron-handler';
import { runAutoPilotCron } from '@/modules/ads/cron/autopilot-run';

export const { GET, POST } = createCronHandler(
  async (ctx) => {
    const result = await runAutoPilotCron(ctx);
    return { data: result, summary: `Processed ${result.campaignsProcessed} campaigns` };
  },
  { name: 'autopilot-run', maxDuration: 300 },
);

export const maxDuration = 300;
```

### 3.4 Modified Files (Engine Layer — service/engine modules receive ctx)

| # | 파일 | 변경 내용 |
|---|------|----------|
| 1 | `src/modules/ads/cron/autopilot-run.ts` | 시그니처 `runAutoPilotCron(ctx: AdsAdminContext)` 로 변경. 내부 `createAdminClient()` 호출 제거 |
| 2 | `src/modules/ads/cron/keyword-pipeline-run.ts` | 동일 |
| 3 | `src/modules/ads/cron/ai-weekly-review.ts` | 동일 |
| 4 | `src/modules/ads/cron/sync-reports.ts` | 동일 |
| 5 | `src/modules/ads/engine/autopilot/orchestrator.ts` | `db: SupabaseClient` 파라미터 → `ctx: AdsAdminContext`. 내부 `.from('campaigns')` → `ctx.ads.from(ctx.adsTable('campaigns'))` |
| 6 | `src/modules/ads/engine/autopilot/keyword-pipeline.ts` | 동일 |
| 7 | `src/modules/ads/engine/autopilot/retail-signal.ts` | (자동화 엔진에서 DB 접근이 있으면) ctx 주입. 없으면 무변경 |
| 8 | `src/modules/ads/api/services/sync/sync-reports.ts` | ctx 주입. I-5 conflict key 완전 수정은 out-of-scope — 하지만 ctx 전환은 필수 |

### 3.5 Modified Files (B3 — vercel.json)

| # | 파일 | 변경 |
|---|------|------|
| 1 | `vercel.json` | autopilot-run: `*/30 * * * *` → `0 * * * *` |

### 3.6 Modified Files (B4 — Dashboard 3 helpers)

| # | 파일 | 변경 내용 |
|---|------|----------|
| 1 | `src/modules/ads/features/dashboard/queries/get-ceo-dashboard.ts` | 시그니처 `getCeoDashboard(ctx: AdsAdminContext, orgUnitId: string)`. `brand_markets` → `ctx.public.from(ctx.publicTable('brand_markets'))`. 나머지 ads 테이블은 `ctx.ads.from(ctx.adsTable('...'))` |
| 2 | `src/modules/ads/features/dashboard/queries/get-director-dashboard.ts` | 동일 + `org_units`는 public client로 |
| 3 | `src/modules/ads/features/dashboard/queries/compute-prev-period.ts` | 시그니처에 ctx 추가; BM 필터는 out-of-scope (I-7은 별도 PDCA) |
| 4 | `src/app/api/ads/dashboard/ceo/route.ts` | helper 호출 시 ctx 주입 |
| 5 | `src/app/api/ads/dashboard/director/route.ts` | 동일 |
| 6 | `src/app/api/ads/dashboard/marketer/route.ts` | 현재 정상이지만 일관성 위해 ctx로 마이그레이션 (Option B 선택에 따른 연쇄 migration) |

### 3.7 Other ads API routes — consistency migration (Option B 선택에 따른)

현재 정상 작동하지만 패턴 일관성을 위해 `AdsAdminContext`로 migrate 필요한 route들. **이 migration은 로직 변경 없음 — 클라이언트 획득 방식만 변경**.

| # | 파일 | 현재 사용 | 이유 |
|---|------|----------|------|
| 1 | `src/app/api/ads/campaigns/route.ts` | `createAdsAdminClient()` | 인접 파일과 혼재 방지 |
| 2 | `src/app/api/ads/campaigns/[id]/route.ts` | 동일 | 동일 |
| 3 | `src/app/api/ads/campaigns/next-code/route.ts` | 동일 | 동일 |
| 4 | `src/app/api/ads/recommendations/route.ts` | 동일 | `/approve` 와 인접 |
| 5 | `src/app/api/ads/recommendations/[id]/skip/route.ts` | 동일 | 동일 |
| 6 | `src/app/api/ads/optimization/budget-pacing/[id]/route.ts` | 동일 | 동일 |
| 7 | `src/app/api/ads/optimization/keyword-stats/[id]/route.ts` | 동일 | 동일 |
| 8 | `src/app/api/ads/autopilot/route.ts` | 동일 | `/ai-reviews`, `/settings` 와 인접 |
| 9 | `src/app/api/ads/autopilot/[id]/route.ts` | 동일 | 동일 |
| 10 | `src/app/api/ads/autopilot/[id]/rollback/route.ts` | 동일 | 동일 |
| 11 | `src/app/api/ads/autopilot/run/route.ts` | 동일 | cron 경로와 동일 로직 트리거 |
| 12 | `src/app/api/ads/amazon/sync-reports/route.ts` | 동일 | sync-reports cron과 동일 로직 |
| 13 | `src/app/api/ads/reports/spend-intelligence/route.ts` | 동일 | /reports/* 통일 |

**결과**: 총 수정 파일 = 2 (신규) + 10 (buggy) + 8 (engine) + 1 (vercel.json) + 6 (dashboard) + 13 (consistency) + 1 (E2E test) = **41 파일**.

⚠️ Plan에서 예상한 ~18 파일보다 크게 늘어남. Option B 선택의 trade-off.

### 3.8 New E2E Test (1 파일)

| # | 파일 | 내용 |
|---|------|------|
| 1 | `tests/e2e/runtime-hardening.spec.ts` | L1 API smoke (10 broken routes) + L2 UI dashboard render + L2 cron endpoint GET status |

---

## 4. API Contract — Unchanged

모든 API route는 **response shape 변경 없음**. 이 Design은 내부 구현만 바꿈. 클라이언트 코드 수정 불필요.

**예외**: 4개 cron route의 response envelope이 통일됨:

| Cron | Before | After |
|------|--------|-------|
| autopilot-run | `{success, data}` (inconsistent) | `{success, data, _meta}` (createCronHandler 표준) |
| keyword-pipeline | 동일 | 동일 |
| ai-weekly-review | 동일 | 동일 |
| sync-reports | `{success, message, data}` | `{success, data, summary, _meta}` — `message` 필드가 `summary`로 renamed |

cron response를 parse하는 클라이언트는 없음 (Vercel Cron scheduler만 호출). 영향 없음.

---

## 5. Data Flow — Dashboard Example

### 5.1 Before (buggy)

```
User (owner session)
  → GET /api/ads/dashboard/ceo
    → ceo/route.ts
      → createAdminClient()  [public client]
      → query user_org_units  ✅ OK (public table)
      → getCeoDashboard(orgUnitId, bmIds)
        → createAdsAdminClient()  [ads client]
        → query brand_markets  ❌ table literal "brand_markets" not in ads schema → empty[]
        → cascading empty: brands=[], acos_heatmap=[], roas_trend_30d=[]
      ← data.brands=[] empty
    ← 200 { data: { brands: [], ... } }
  ← CEO dashboard renders "No brand data available"
```

### 5.2 After (fixed)

```
User (owner session)
  → GET /api/ads/dashboard/ceo
    → ceo/route.ts
      → createAdsAdminContext()  [context]
      → ctx.public.from(ctx.publicTable('user_org_units'))  ✅ OK
      → getCeoDashboard(ctx, orgUnitId)
        → ctx.public.from(ctx.publicTable('brand_markets'))  ✅ OK
        → ctx.ads.from(ctx.adsTable('report_snapshots'))  ✅ OK (if cron populated)
      ← data.brands=[real]
    ← 200 { data: { brands: [real], ... } }
  ← CEO dashboard renders real KPIs
```

---

## 6. Error Handling

### 6.1 AdsAdminContext

- 내부 supabase client 생성 실패 시 (env var 누락) → `createSupabaseClient`가 throw. `createCronHandler` + route try/catch에서 캐치.
- Context 인스턴스는 **request-scoped**. 재사용하지 않음 (connection pooling은 Supabase 클라이언트가 관리).

### 6.2 createCronHandler

| Condition | Response |
|-----------|----------|
| `CRON_SECRET` 불일치 | 401 `{error: {code: 'UNAUTHORIZED', message: 'Invalid CRON_SECRET'}}` |
| handler throw (sync or async) | 500 `{error: {code: 'CRON_ERROR', message: '[name] ...'}}` |
| handler returns successfully | 200 `{success: true, data, summary?, _meta}` |

### 6.3 Route-level handlers (10 broken routes after fix)

- 기존 error handling 로직 유지. ctx 획득은 throw 가능성 낮음 (env var 항상 존재).
- Dashboard 경로는 `user_org_units` 없을 때의 fallback 로직(`orgUnitId = user.id`) 이번 PDCA에서는 유지 — I-6은 별도 follow-up.

---

## 7. Security Considerations

### 7.1 Admin client double usage (R-2 리스크)

`AdsAdminContext`는 항상 **두 개의 service-role 클라이언트를 포함**. 두 클라이언트 모두 RLS 우회. 이는 의도된 설계지만, 다음을 명심:

- **route 레벨 auth guard** (`withAuth(handler, roles)`) 필수. `AdsAdminContext`는 role 체크하지 않음.
- **tenant isolation 책임은 호출자에게**. 각 query에 `brand_market_id`, `org_unit_id` 등의 스코프 필터를 명시적으로 붙여야 함.
- 이 PDCA는 I-2 (Autopilot settings cross-brand mutation)나 I-7 (Dashboard automation_log cross-org leak) 같은 tenant isolation 이슈를 **직접 수정하지 않음**. 단, migration 시 기존 필터 로직은 보존.

### 7.2 CRON_SECRET

- 기존 handlers에 있는 `CRON_SECRET` 검증 로직이 `createCronHandler`로 이전됨.
- Vercel Cron이 `Authorization: Bearer <CRON_SECRET>` 헤더로 호출.
- Preview 환경도 동일 SECRET 사용. Env 변수는 Vercel 콘솔에서 관리.

### 7.3 Zod validation

- **이 Design의 out-of-scope**. 기존 request validation 로직(수동 if-checks)은 migration 시 보존.
- follow-up PDCA `ft-zod-validation`에서 `createAdsAdminContext` 위에 `createValidatedHandler()` 같은 factory를 쌓을 예정 (Option B가 이 확장을 쉽게 만듦).

---

## 8. Test Plan

### 8.1 Manual smoke (preview 배포 직후)

```bash
# Health check — all 4 crons
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://arc-ads-git-ft-runtime-hardening.vercel.app/api/ads/cron/autopilot-run
# expect: 200 {success: true, data: {...}, _meta: {name: 'autopilot-run', ...}}

# 10 broken routes — verify no PGRST205
for route in \
  "/api/ads/autopilot/ai-reviews?profile_id=$PID" \
  "/api/ads/reports/snapshots?brand_market_id=$BM" \
  ; do
  curl -s -b $COOKIE "https://preview.../$route" | jq '.error.code // "ok"'
done
# expect: no PGRST205, no "relation does not exist"
```

### 8.2 Playwright E2E (`tests/e2e/runtime-hardening.spec.ts`)

```typescript
// L1 API smoke
test('cron GET returns 200 with CRON_SECRET', async ({ request }) => {
  const res = await request.get('/api/ads/cron/autopilot-run', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body._meta.name).toBe('autopilot-run');
});

test('cron GET rejects without CRON_SECRET', async ({ request }) => {
  const res = await request.get('/api/ads/cron/sync-reports');
  expect(res.status()).toBe(401);
});

test('goal-mode PATCH does not return PGRST205', async ({ request }) => {
  const res = await request.patch(
    '/api/ads/campaigns/00000000-0000-0000-0000-000000000001/goal-mode',
    { data: { goal_mode: 'growth' } },
  );
  const body = await res.json();
  expect(body.error?.code).not.toBe('PGRST205');
  // 404 or 403 is acceptable (campaign doesn't exist); schema bug would be 500
});

// L2 UI
test('CEO dashboard renders brand cards', async ({ page }) => {
  await page.goto('/ads/dashboard');
  await expect(page.getByTestId('brand-pulse-card').first()).toBeVisible();
  // SC-4: at least 1 brand card rendered
});

test('Director dashboard shows team performance', async ({ page }) => {
  await page.goto('/ads/dashboard?view=director');
  await expect(page.getByText(/Team Performance/i)).toBeVisible();
  // SC-5: team_performance section has ≥1 row
  const rows = await page.locator('[data-testid="team-perf-row"]').count();
  expect(rows).toBeGreaterThanOrEqual(1);
});
```

### 8.3 Observation (preview 24-48h)

- `sync-reports` cron 30분 주기 → preview DB `ads.report_snapshots`에 새 row (`max(report_date) = today-1`) 확인
- `autopilot-run` cron 1시간 주기 → `ads.automation_log`에 `source = 'autopilot_formula'` 또는 `'autopilot_ai'` row 추가 확인
- 3번째 날 아침 확인 → 문제 없으면 prod 배포

---

## 9. Rollback Strategy

### 9.1 Single revert

모든 변경이 **단일 PR**로 묶여 있으면 `git revert <PR-merge-sha>` 한 번으로 원복 가능. **권장**.

### 9.2 Per-session revert (partial rollback)

Session별 커밋이 독립적이면 특정 session만 revert 가능. 단, 후속 session이 선행 session에 의존하면 체인 깨짐. 예:
- S2 (cron routes migration)가 S1 (AdsAdminContext 도입)에 의존 → S1 revert하면 S2도 같이 revert 필요

### 9.3 Emergency data rollback

`vercel.json` schedule이 hourly로 바뀐 후 Amazon API 과호출 발견 시:
- Vercel 콘솔에서 cron 수동 disable
- no-writeback 정책이 유지되므로 실제 고객 피해 없음 (feedback_no_writeback.md)

---

## 10. Success Verification

| SC | Test | Evidence |
|----|------|----------|
| SC-1 | Grep check — `git grep "\.from('ads\."` returns 0 matches in `src/app/api/ads/**` | 0 matches |
| SC-1 | Grep check — `git grep "createAdminClient()" src/app/api/ads/` returns 0 matches (all migrated to context) | 0 matches |
| SC-2 | Playwright test "cron GET returns 200" passes for all 4 crons | Test green |
| SC-3 | `cat vercel.json \| jq '.crons[] \| select(.path == "/api/ads/cron/autopilot-run") \| .schedule'` returns `"0 * * * *"` | Exact match |
| SC-4 | Playwright test "CEO dashboard renders brand cards" passes | Test green |
| SC-5 | Playwright test "Director dashboard shows team performance" passes | Test green |
| SC-6 | `pnpm playwright test tests/e2e/runtime-hardening.spec.ts` exits 0 | All tests pass |
| SC-7 | 24h 후 Supabase에서 `SELECT max(report_date) FROM ads.report_snapshots` 결과가 `now() - 1 day` 이상 | Fresh row |

---

## 11. Implementation Guide

### 11.1 Overview

총 8 세션 (Option B 선택으로 Plan의 6 세션에서 늘어남). 선행 세션이 완료되어야 후행 세션이 의미를 가짐.

### 11.2 Dependencies

```
S1 (infra) ────┬──► S2 (B1 buggy routes) ──┬──► S5 (E2E test)
               │                           │
               ├──► S3 (B2 cron migration) ┤
               │                           │
               ├──► S4 (B4 dashboard)      ┘
               │
               └──► S6 (B3 vercel.json — independent)
                                           │
                                           ▼
                                    S7 (preview deploy)
                                           │
                                           ▼ (24-48h observation)
                                    S8 (prod deploy)
```

### 11.3 Session Guide (Module Map)

| Session | scope key | 내용 | 예상 시간 | 파일 수 |
|---------|-----------|------|----------|---------|
| **S1** | `infra` | `AdsAdminContext` + `createCronHandler` 신규 파일 2개 + table-names.ts 확인 | 45min | 2 new |
| **S2** | `buggy-routes` | B1 10 route 마이그레이션. goal-mode / ai-reviews / settings / approve / snapshots / export | 1h 30min | 6 modified |
| **S3** | `cron` | B2 4 cron route + 4 cron 엔진 모듈 마이그레이션 (autopilot-run, keyword-pipeline, ai-weekly-review, sync-reports) | 1h | 8 modified |
| **S4** | `dashboard` | B4 3 helper + 3 route(CEO/Director/Marketer) 마이그레이션 | 1h | 6 modified |
| **S5** | `consistency` | §3.7 기타 13개 ads API route consistency migration | 1h | 13 modified |
| **S6** | `config` | B3 vercel.json schedule 수정 | 5min | 1 modified |
| **S7** | `e2e` | `tests/e2e/runtime-hardening.spec.ts` 작성 + 로컬 실행 | 1h 30min | 1 new |
| **S8** | `deploy` | Preview 배포 → 24-48h 관찰 → Prod 배포 | 관찰 대기 + 30min | — |

**최소 실행 순서**: S1 → S2 → S3 → S4 → S6 → S7 (S5는 S2-S4 사이 언제든 가능, S5 건너뛰어도 기능적으로는 OK이지만 Option B 선택 의도에 반함)

### 11.4 Command Examples

```bash
# Session 1
/pdca do ft-runtime-hardening --scope infra

# Session 2
/pdca do ft-runtime-hardening --scope buggy-routes

# Session 3
/pdca do ft-runtime-hardening --scope cron

# All remaining
/pdca do ft-runtime-hardening --scope dashboard,consistency,config,e2e
```

### 11.5 Pre-Do Checklist

- [ ] `pnpm typecheck && pnpm lint` current green
- [ ] `git status` clean
- [ ] `.env` has `CRON_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Feature branch `feat/ft-runtime-hardening` created

---

## 12. Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-21 | Initial Design with Option B (Clean Architecture). 41 파일 변경 예상 (Plan의 18 파일 예상에서 Option B 선택에 따라 증가) | Jayden Song |
