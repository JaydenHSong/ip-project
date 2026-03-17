# Code Quality Overhaul — Design

> **Feature**: 프론트엔드 코드 품질 전면 개선 (보안, 타입, 구조)
> **Created**: 2026-03-17
> **Phase**: Design
> **Plan**: `docs/01-plan/features/code-quality-overhaul.plan.md`

---

## 1. Phase 1: 보안 패치 — sanitizeSearchTerm

### 1.1 신규 파일

**`src/lib/utils/sanitize.ts`**

```typescript
/**
 * Supabase PostgREST ilike 쿼리에 사용되는 검색어를 이스케이프.
 * PostgreSQL LIKE 특수문자 + PostgREST 필터 구문 파싱 문자를 처리.
 */
export const sanitizeSearchTerm = (input: string): string => {
  // 1. \ → \\ (PostgreSQL LIKE 이스케이프 문자, 반드시 최우선)
  // 2. % → \%  (LIKE 와일드카드)
  // 3. _ → \_  (LIKE 단일문자)
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
}
```

> 참고: PostgREST `.or()` 구문의 `,`, `.`, `(`, `)` 문자는 `ilike.%...%` 값 내부에서
> 구문 파싱에 영향을 주지 않음 (값 위치에서는 리터럴로 처리됨). LIKE 특수문자만 이스케이프 필요.

### 1.2 수정 대상 8개 파일

각 파일에서 `ilike.%${searchTerm}%` 또는 `ilike.%${search}%` 패턴을 찾아 `sanitizeSearchTerm()` 적용.

| # | 파일 | 변수명 | 수정 내용 |
|---|------|--------|----------|
| 1 | `src/app/(protected)/reports/page.tsx` | `searchTerm` | import + `const safe = sanitizeSearchTerm(searchTerm)` 후 `safe` 사용 |
| 2 | `src/app/(protected)/reports/completed/page.tsx` | `searchTerm` | 동일 |
| 3 | `src/app/(protected)/notices/page.tsx` | `params.search` | `const safe = sanitizeSearchTerm(params.search)` |
| 4 | `src/app/(protected)/patents/page.tsx` | `params.search` | 동일 |
| 5 | `src/app/api/reports/route.ts` | `search` | `const safe = sanitizeSearchTerm(search)` |
| 6 | `src/app/api/patents/route.ts` | `search` | 동일 |
| 7 | `src/app/api/listings/route.ts` | `search` | 동일 |
| 8 | `src/app/api/templates/route.ts` | `search` | 동일 |

**수정 패턴** (모든 파일 동일):
```typescript
// Before
.or(`asin.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`)

// After
import { sanitizeSearchTerm } from '@/lib/utils/sanitize'
const safe = sanitizeSearchTerm(searchTerm)
.or(`asin.ilike.%${safe}%,title.ilike.%${safe}%`)
```

### 1.3 검증

- `pnpm typecheck && pnpm lint && pnpm build`
- 검색에 `%`, `_`, `\`, `test_value`, `100%` 입력 시 에러 없이 동작 확인

---

## 2. Phase 2: 타입 안전성 복구 — mapper 패턴

### 2.1 신규 파일

**`src/lib/mappers/report.ts`**

```typescript
import type { ReportData } from '@/types/reports'  // 기존 타입 활용

/**
 * Supabase JOIN 응답을 ReportData로 안전하게 변환.
 * `as unknown as` 제거 목적.
 */
export function toReportData(row: Record<string, unknown>): ReportData {
  return {
    id: row.id as string,
    report_number: row.report_number as number,
    status: row.status as string,
    br_form_type: (row.br_form_type as string) ?? null,
    user_violation_type: row.user_violation_type as string,
    ai_violation_type: (row.ai_violation_type as string) ?? null,
    ai_confidence_score: (row.ai_confidence_score as number) ?? null,
    ai_severity: (row.ai_severity as string) ?? null,
    ai_analysis: row.ai_analysis as ReportData['ai_analysis'],
    // ... 나머지 필드 명시적 매핑
  }
}

export function toListingInfo(row: Record<string, unknown> | null): ListingInfo | null {
  if (!row) return null
  return {
    asin: row.asin as string,
    title: row.title as string,
    marketplace: row.marketplace as string,
    seller_name: (row.seller_name as string) ?? null,
    brand: (row.brand as string) ?? null,
    // ...
  }
}
```

### 2.2 수정 대상 (핵심 파일)

| # | 파일 | 현재 | 수정 후 |
|---|------|------|---------|
| 1 | `reports/[id]/page.tsx` (6건) | `data as unknown as ReportData` | `toReportData(data)` |
| 2 | `campaigns/[id]/page.tsx` (1건) | `as unknown as` | `toCampaignData(data)` |
| 3 | `api/reports/[id]/route.ts` | `data as Record<string, unknown>` | 직접 할당 |
| 4 | `api/reports/check-duplicate/route.ts` | 1건 | mapper 사용 |
| 5 | `api/monitoring/pending/route.ts` | 1건 | mapper 사용 |
| 6 | `api/dashboard/recent-reports/route.ts` | 1건 | mapper 사용 |
| 7 | 기타 4개 파일 | 각 1건 | mapper 또는 타입 가드 |

### 2.3 원칙

- 새 mapper를 만들 때 **기존 `types/` 타입을 재사용** (새 타입 생성 최소화)
- `Record<string, unknown>` → 명시적 필드 접근 (`row.id as string`)
- `as unknown as` 제거가 목표이지, 완벽한 런타임 검증은 scope 밖

---

## 3. Phase 3: Server Component 쿼리 분리

### 3.1 신규 파일

**`src/lib/queries/reports.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { sanitizeSearchTerm } from '@/lib/utils/sanitize'
import type { User } from '@/types/users'

type FetchReportsParams = {
  page: number
  status?: string
  br_form_type?: string
  br_case_status?: string
  smart_queue?: string
  search?: string
  date_from?: string
  date_to?: string
  sort_field?: string
  sort_dir?: string
  owner?: string
}

type FetchReportsResult = {
  reports: ReportRow[]
  totalPages: number
  totalCount: number
}

const SORT_MAP: Record<string, string> = {
  status: 'status',
  channel: 'listing_snapshot->>marketplace',
  asin: 'listing_snapshot->>asin',
  violation: 'br_form_type',
  seller: 'listing_snapshot->>seller_name',
  date: 'created_at',
  updated: 'updated_at',
  resolved: 'resolved_at',
}

export async function fetchReports(
  params: FetchReportsParams,
  user: User,
  limit = 20,
): Promise<FetchReportsResult> {
  const supabase = await createClient()
  const offset = ((params.page || 1) - 1) * limit

  // 현재 reports/page.tsx의 line 46-142 쿼리 로직을 이동
  // sanitizeSearchTerm 적용 포함
  // ...

  return { reports, totalPages, totalCount }
}
```

**`src/lib/queries/completed-reports.ts`** — `completed/page.tsx` 쿼리 이동
**`src/lib/queries/notices.ts`** — `notices/page.tsx` 쿼리 이동
**`src/lib/queries/patents.ts`** — `patents/page.tsx` 쿼리 이동

### 3.2 수정 대상

| # | Page 파일 | 현재 쿼리 줄 수 | 수정 후 |
|---|-----------|---------------|---------|
| 1 | `reports/page.tsx` | ~90줄 | ~10줄 (함수 호출만) |
| 2 | `reports/completed/page.tsx` | ~90줄 | ~10줄 |
| 3 | `notices/page.tsx` | ~40줄 | ~5줄 |
| 4 | `patents/page.tsx` | ~30줄 | ~5줄 |

### 3.3 원칙

- 쿼리 함수는 **Supabase 의존성을 캡슐화** (Page는 supabase를 모름)
- Demo mode 분기도 쿼리 함수 내부에서 처리
- `sanitizeSearchTerm`은 쿼리 함수 내부에서 적용 (Phase 1에서 page에 적용한 것을 이동)

---

## 4. Phase 4: API Route ID 파싱 표준화

### 4.1 현재 구조 분석

**`withAuth` 시그니처** (`src/lib/auth/middleware.ts`):
```typescript
type ApiHandler = (req: NextRequest, context: AuthContext) => Promise<NextResponse>

export const withAuth = (
  handler: ApiHandler,
  allowedRoles: Role[],
): ((req: NextRequest) => Promise<NextResponse>) => {
  return async (req: NextRequest) => {
    // ... auth 체크
    return handler(req, { user: dbUser as User })
  }
}
```

**현재 API 라우트들의 ID 추출 방식** (38파일 전부 동일):
```typescript
const segments = req.nextUrl.pathname.split('/')
const id = segments[segments.length - 1]  // 또는 segments[3] 등
```

### 4.2 수정 전략: Next.js params 전달

**Step 1: `withAuth` 시그니처 확장** (하위호환 유지)

```typescript
// src/lib/auth/middleware.ts

type AuthContext = {
  user: User
  params: Record<string, string>  // 추가
}

type ApiHandler = (
  req: NextRequest,
  context: AuthContext,
) => Promise<NextResponse>

export const withAuth = (
  handler: ApiHandler,
  allowedRoles: Role[],
): ((req: NextRequest, routeContext: { params: Promise<Record<string, string>> }) => Promise<NextResponse>) => {
  return async (req: NextRequest, routeContext: { params: Promise<Record<string, string>> }) => {
    const resolvedParams = await routeContext.params
    // ... 기존 auth 로직 그대로
    return handler(req, { user: dbUser as User, params: resolvedParams })
  }
}
```

> Next.js 16에서 `params`는 `Promise`이므로 `await` 필요.

**Step 2: 각 API 라우트 수정** (38파일)

```typescript
// Before
export const GET = withAuth(async (req) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 1]
  // ...
}, ['owner', 'admin'])

// After
export const GET = withAuth(async (req, { user, params }) => {
  const { id } = params
  // ...
}, ['owner', 'admin'])
```

**Step 3: `withServiceAuth`, `withDualAuth`도 동일하게 확장**

### 4.3 마이그레이션 배치 (CTO 결정)

| Batch | 파일 수 | 대상 | 커밋 단위 |
|-------|---------|------|----------|
| 0 | 3 | `withAuth` + `withServiceAuth` + `withDualAuth` 시그니처 변경 | 1 커밋 |
| 1 | 18 | `api/reports/[id]/*` | 1 커밋 |
| 2 | 5 | `api/campaigns/[id]/*` | 1 커밋 |
| 3 | 15 | 나머지 (listings, patents, notices, templates, users, ai, br-templates, crawler) | 1 커밋 |

### 4.4 특수 케이스

**중첩 params** (`api/reports/[id]/case-notes/[noteId]/route.ts`):
```typescript
// 현재: 2개 ID를 각각 split으로 추출
const segments = req.nextUrl.pathname.split('/')
const reportId = segments[3]
const noteId = segments[5]

// After: params에서 직접
const { id: reportId, noteId } = params
```

### 4.5 검증

- 각 Batch 커밋 후 `pnpm typecheck && pnpm build`
- Batch 1 (reports) 후 Preview 배포 → Report CRUD 전체 동작 확인
- Batch 완료 후 Extension API 호출 테스트

---

## 5. Phase 5: ReportsContent 컴포넌트 분할

### 5.1 현재 구조 (655줄)

| Line Range | 역할 | 줄 수 |
|------------|------|-------|
| 1-31 | imports | 31 |
| 32-89 | 타입 정의 + props | 58 |
| 90-165 | 필터/검색/URL 상태 | 76 |
| 166-211 | 선택/정렬/컬럼 로직 | 46 |
| 212-297 | Bulk action 핸들러 (3개) | 86 |
| 298-416 | JSX: 헤더 + 탭 + 필터 + BulkActionBar | 119 |
| 418-477 | JSX: 모바일 카드 리스트 | 60 |
| 480-587 | JSX: 데스크톱 테이블 | 108 |
| 588-655 | JSX: 페이지네이션 + 모달 | 68 |

### 5.2 분할 계획

**1. `src/hooks/useBulkActions.ts`** (신규)
- 현재 line 212-297의 3개 핸들러 통합
- 공통 fetch + toast + router.refresh 패턴

```typescript
type BulkActionResult = { success: number; failed: number; skipped?: number }

export function useBulkActions(selectedIds: Set<string>) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()
  const { addToast } = useToast()

  const execute = async (
    endpoint: string,
    body?: Record<string, unknown>,
  ): Promise<BulkActionResult | null> => {
    setLoading(endpoint)
    try {
      const res = await fetch(`/api/reports/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_ids: [...selectedIds], ...body }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? `${endpoint} failed`)
      }
      const result = await res.json()
      router.refresh()
      return result
    } catch (e) {
      addToast({ type: 'error', title: 'Action failed', message: e instanceof Error ? e.message : 'Unknown error' })
      return null
    } finally {
      setLoading(null)
    }
  }

  return {
    loading,
    approve: () => execute('bulk-approve'),
    submit: (action: string) => execute('bulk-submit', { action }),
    delete: () => execute('bulk-delete'),
    archive: () => execute('bulk-archive'),
  }
}
```

**2. `src/app/(protected)/reports/BulkActionBar.tsx`** (신규)
- 현재 line 364-416의 BulkActionBar JSX
- props: `selectedIds`, `selectedStatuses`, `canEdit`, `bulkActions`, `onDeselect`

**3. `src/app/(protected)/reports/ReportMobileCard.tsx`** (신규)
- 현재 line 427-476의 모바일 카드
- props: `report: ReportRow`

**4. `src/app/(protected)/reports/ReportTableRow.tsx`** (신규)
- 현재 line 521-581의 테이블 행
- props: `report`, `selectedIds`, `onToggleSelect`, `onPreview`, `sort` 등

### 5.3 분할 후 ReportsContent 예상 줄 수

| 현재 | 분할 후 |
|------|---------|
| 655줄 | ~280줄 (imports + 상태 + JSX 구조만) |

### 5.4 상태 흐름

```
ReportsContent (상태 소유자)
├── ScrollTabs (status filter)
├── BrCaseQueueBar
├── TableFilters
├── BulkActionBar ← useBulkActions 훅 결과 전달
├── ReportMobileCard[] ← map
├── ReportTableRow[] ← map
├── Pagination
├── NewReportModal
└── ReportPreviewPanel
```

---

## 6. Phase 6: 코드 위생

### 6.1 console.error 제거 (7파일 11건)

| # | 파일 | 현재 | 수정 |
|---|------|------|------|
| 1 | `reports/page.tsx` | `console.error('Reports query error:', error.message)` | 에러 시 빈 배열 반환 (이미 그렇게 동작) — console만 제거 |
| 2 | `reports/completed/page.tsx` | 동일 패턴 | console 제거 |
| 3 | `reports/archived/page.tsx` | 동일 패턴 | console 제거 |
| 4 | `campaigns/page.tsx` | 동일 패턴 | console 제거 |
| 5 | `audit-logs/page.tsx` | 동일 패턴 | console 제거 |
| 6 | `api/ext/fetch-result/route.ts` (2건) | Screenshot 업로드 에러 | 유지 (서버 API, 디버깅 필요) |
| 7 | `api/crawler/listings/batch/route.ts` (3건) | AI/Screenshot 에러 | 유지 (Crawler API, 디버깅 필요) |
| 8 | `api/crawler/br-monitor-result/route.ts` | warn — 중복 스킵 | 유지 (운영 모니터링) |

> **판단**: Protected page의 console.error 5건만 제거. API 라우트의 6건은 서버 사이드 로깅으로 유지 (프로덕션 디버깅에 필요).

### 6.2 ReportDetailContent 타입 정리

현재 `ReportDetailContent.tsx` line 34-110에서 80줄 인라인 타입.

**수정 방법**:
```typescript
// types/reports.ts에 추가
export type ReportDetailData = Pick<Report,
  'id' | 'report_number' | 'status' | 'br_form_type' | 'user_violation_type' |
  'ai_violation_type' | 'ai_confidence_score' | 'ai_severity' | 'ai_analysis' |
  // ... 필요한 필드
>

// ReportDetailContent.tsx
import type { ReportDetailData } from '@/types/reports'

type ReportDetailContentProps = {
  report: ReportDetailData
  listing: ListingInfo | null
  // ... 나머지 props
}
```

### 6.3 CORS (nice-to-have)

Extension ID가 확정되면 `middleware.ts`의 `Access-Control-Allow-Origin: '*'`를 `chrome-extension://<id>`로 변경. 현재는 `withServiceAuth`로 인증이 별도 보호되므로 긴급하지 않음.

---

## 7. 구현 순서 체크리스트

```
□ Phase 1: sanitize.ts 생성 → 8파일 적용 → typecheck/build
□ Phase 2: mappers/report.ts 생성 → 10파일 as unknown as 제거 → typecheck/build
□ Phase 3: queries/ 4파일 생성 → 4개 page.tsx 리팩토링 → typecheck/build → Preview 확인
□ Phase 4-Batch 0: withAuth 시그니처 확장 → typecheck
□ Phase 4-Batch 1: reports/[id]/* 18파일 → typecheck/build → Preview
□ Phase 4-Batch 2: campaigns/[id]/* 5파일 → typecheck/build
□ Phase 4-Batch 3: 나머지 15파일 → typecheck/build → Preview
□ Phase 5: useBulkActions 훅 → 3개 컴포넌트 분할 → ReportsContent 리팩토링 → typecheck/build
□ Phase 6: console.error 5건 제거 → 타입 정리 → typecheck/build
□ 최종: 전체 기능 확인 (Reports, Campaigns, Search, Bulk Actions, Extension API)
```

---

## 8. 영향 범위 요약 (QC 실측 기반)

| Phase | 신규 | 수정 | 리스크 |
|-------|------|------|--------|
| 1 | 1 | 8 | Low — 단순 함수 적용 |
| 2 | 1 | 10 | Medium — 타입 매핑 누락 가능 |
| 3 | 4 | 4 | Medium — 쿼리 로직 이동 |
| 4 | 0 | 39 (auth 1 + routes 38) | **High** — 배치 마이그레이션 |
| 5 | 4 | 1 | Medium — 상태 흐름 변경 |
| 6 | 0 | ~5 | Low — 삭제 + 타입 정리 |
| **합계** | **10** | **~67** | |
