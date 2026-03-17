# API Route Params Migration — Design

> **Feature**: 38개 API 라우트 `pathname.split('/')` → Next.js `params` 전환
> **Created**: 2026-03-17
> **Phase**: Design
> **Plan**: `docs/01-plan/features/api-route-params-migration.plan.md`

---

## 1. 미들웨어 시그니처 변경

### 1.1 withAuth (37개 라우트 사용)

**파일**: `src/lib/auth/middleware.ts`

```typescript
// Before
type AuthContext = {
  user: User
}

type ApiHandler = (
  req: NextRequest,
  context: AuthContext,
) => Promise<NextResponse>

export const withAuth = (
  handler: ApiHandler,
  allowedRoles: Role[],
): ((req: NextRequest) => Promise<NextResponse>) => {
  return async (req: NextRequest) => {
    // ... auth 로직
    return handler(req, { user: dbUser as User })
  }
}

// After
type AuthContext = {
  user: User
  params: Record<string, string>
}

type ApiHandler = (
  req: NextRequest,
  context: AuthContext,
) => Promise<NextResponse>

export const withAuth = (
  handler: ApiHandler,
  allowedRoles: Role[],
): ((req: NextRequest, routeContext?: { params: Promise<Record<string, string>> }) => Promise<NextResponse>) => {
  return async (req: NextRequest, routeContext?: { params: Promise<Record<string, string>> }) => {
    const params = await routeContext?.params ?? {}
    // ... 기존 auth 로직 그대로
    return handler(req, { user: dbUser as User, params })
  }
}
```

**핵심**: 반환 타입의 두 번째 인자 `routeContext`를 optional로 받아 하위호환 유지. params가 없는 라우트(목록 API)는 변경 불필요.

### 1.2 withServiceAuth (1개 라우트 사용: `crawler/campaigns/[id]/result`)

**파일**: `src/lib/auth/service-middleware.ts`

```typescript
// After
type ServiceAuthContext = {
  service: 'crawler'
  params: Record<string, string>
}

export const withServiceAuth = (
  handler: ServiceApiHandler,
): ((req: NextRequest, routeContext?: { params: Promise<Record<string, string>> }) => Promise<NextResponse>) => {
  return async (req: NextRequest, routeContext?: { params: Promise<Record<string, string>> }) => {
    const params = await routeContext?.params ?? {}
    // ... 기존 토큰 체크 그대로
    return handler(req, { service: 'crawler', params })
  }
}
```

### 1.3 withDualAuth — 변경 불필요

`withDualAuth` 사용 라우트 중 `pathname.split`을 쓰는 파일이 없으므로 이번 스코프에서 제외.

---

## 2. API 라우트 수정 — 파일별 매핑

### Batch 1: reports/[id]/* (20파일)

| # | 파일 | 현재 추출 방식 | After |
|---|------|---------------|-------|
| 1 | `reports/[id]/route.ts` (GET/PATCH/DELETE) | `segments[segments.length - 1]` x3 | `params.id` |
| 2 | `reports/[id]/approve/route.ts` | `segments[segments.length - 2]` | `params.id` |
| 3 | `reports/[id]/reject/route.ts` | `segments[segments.length - 2]` | `params.id` |
| 4 | `reports/[id]/cancel/route.ts` | `segments[segments.length - 2]` | `params.id` |
| 5 | `reports/[id]/cancel-submit/route.ts` | `segments[segments.length - 2]` | `params.id` |
| 6 | `reports/[id]/clone/route.ts` | `segments[segments.length - 2]` | `params.id` |
| 7 | `reports/[id]/resolve/route.ts` | `segments[segments.length - 2]` | `params.id` |
| 8 | `reports/[id]/save-draft/route.ts` | `segments[segments.length - 2]` | `params.id` |
| 9 | `reports/[id]/submit-review/route.ts` | split 패턴 | `params.id` |
| 10 | `reports/[id]/start-monitoring/route.ts` | split 패턴 | `params.id` |
| 11 | `reports/[id]/force-resubmit/route.ts` | split 패턴 | `params.id` |
| 12 | `reports/[id]/related/route.ts` | split 패턴 | `params.id` |
| 13 | `reports/[id]/snapshots/route.ts` | split 패턴 | `params.id` |
| 14 | `reports/[id]/screenshot/route.ts` (GET/POST/DELETE) | `.at(-2)` x3 | `params.id` |
| 15 | `reports/[id]/refresh-listing/route.ts` | `segments[segments.length - 2]` | `params.id` |
| 16 | `reports/[id]/case-id/route.ts` | `segments[segments.length - 2]` | `params.id` |
| 17 | `reports/[id]/case-close/route.ts` | `indexOf('reports') + 1` | `params.id` |
| 18 | `reports/[id]/case-thread/route.ts` | `indexOf('reports') + 1` | `params.id` |
| 19 | `reports/[id]/case-events/route.ts` | `indexOf('reports') + 1` | `params.id` |
| 20 | `reports/[id]/case-notes/route.ts` | `indexOf('reports') + 1` | `params.id` |
| 21 | `reports/[id]/case-reply/route.ts` | `indexOf('reports') + 1` | `params.id` |
| 22 | `reports/[id]/case-notes/[noteId]/route.ts` (GET/DELETE) | `indexOf + length-1` x2 | `params.id` + `params.noteId` |

### Batch 2: campaigns/[id]/* (5파일)

| # | 파일 | After |
|---|------|-------|
| 1 | `campaigns/[id]/route.ts` (GET/PUT/DELETE) | `params.id` |
| 2 | `campaigns/[id]/pause/route.ts` | `params.id` |
| 3 | `campaigns/[id]/resume/route.ts` | `params.id` |
| 4 | `campaigns/[id]/force-run/route.ts` | `params.id` |
| 5 | `campaigns/[id]/export/route.ts` | `params.id` |

### Batch 3: 나머지 (11파일)

| # | 파일 | After |
|---|------|-------|
| 1 | `listings/[id]/route.ts` | `params.id` |
| 2 | `listings/[id]/fetch-status/route.ts` | `params.id` |
| 3 | `patents/[id]/route.ts` | `params.id` |
| 4 | `notices/[id]/route.ts` | `params.id` |
| 5 | `notices/[id]/read/route.ts` | `params.id` |
| 6 | `templates/[id]/route.ts` | `params.id` |
| 7 | `templates/[id]/use/route.ts` | `params.id` |
| 8 | `br-templates/[id]/route.ts` (GET/PUT/DELETE) | `params.id` |
| 9 | `users/[id]/route.ts` | `params.id` |
| 10 | `ai/jobs/[id]/route.ts` | `params.id` |
| 11 | `crawler/campaigns/[id]/result/route.ts` (withServiceAuth) | `params.id` |

---

## 3. 수정 패턴 (코드 예시)

### 3.1 단일 param 라우트 (대부분)

```typescript
// Before
export const GET = withAuth(async (req, { user }) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 2]
  // ...
}, ['owner', 'admin'])

// After — req 뒤에 params 추가
export const GET = withAuth(async (req, { user, params }) => {
  const { id } = params
  // ...
}, ['owner', 'admin'])
```

### 3.2 중첩 params (`case-notes/[noteId]`)

```typescript
// Before
const segments = req.nextUrl.pathname.split('/')
const noteId = segments[segments.length - 1]
const id = segments[segments.indexOf('reports') + 1]

// After
const { id, noteId } = params
```

### 3.3 여러 HTTP method가 있는 파일 (route.ts)

```typescript
// reports/[id]/route.ts — GET, PATCH, DELETE 각각에서
// 동일하게 { user, params } 디스트럭처링

export const GET = withAuth(async (req, { user, params }) => {
  const { id } = params
  // ...
}, [...])

export const PATCH = withAuth(async (req, { user, params }) => {
  const { id } = params
  // ...
}, [...])
```

### 3.4 삭제할 코드

각 파일에서 다음 패턴 제거:
```typescript
// 삭제 대상 (2~3줄)
const segments = req.nextUrl.pathname.split('/')
const id = segments[segments.length - 2]
```
또는:
```typescript
const id = req.nextUrl.pathname.split('/').pop()
```
또는:
```typescript
const url = req.nextUrl
const id = url.pathname.split('/').pop()!
```

---

## 4. 구현 순서 체크리스트

```
□ Batch 0: withAuth 시그니처 확장 + withServiceAuth 확장 → typecheck
□ Batch 1: reports/[id]/* 22파일 → typecheck
□ Batch 2: campaigns/[id]/* 5파일 → typecheck
□ Batch 3: 나머지 11파일 → typecheck + build
□ 최종: Preview 배포 → Report CRUD + Campaign CRUD + Extension API 확인
```

---

## 5. 영향 범위 요약

| 항목 | 수량 |
|------|------|
| 수정 파일 | 40 (미들웨어 2 + 라우트 38) |
| 신규 파일 | 0 |
| 삭제 코드 | ~80줄 (split 패턴 제거) |
| 추가 코드 | ~40줄 (params 디스트럭처링) |
| 순 감소 | ~40줄 |
