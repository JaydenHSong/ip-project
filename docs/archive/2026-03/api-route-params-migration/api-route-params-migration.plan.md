# API Route Params Migration — Plan

> **Feature**: 38개 API 라우트의 `pathname.split('/')` → Next.js `params` 전환
> **Created**: 2026-03-17
> **Phase**: Plan
> **Priority**: P1
> **Origin**: `code-quality-overhaul` Phase 4에서 분리

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 38개 API 라우트에서 `pathname.split('/')`로 ID를 수동 추출 — 중첩 라우트 추가 시 인덱스 엇갈림 위험, 일부 파일에서 `segments.length - 1` vs `segments.length - 2` vs `segments.indexOf('reports') + 1` 등 3가지 패턴 혼재 |
| **Solution** | `withAuth` 시그니처에 Next.js route `params`를 전달하도록 확장, 38개 라우트에서 `params.id` 직접 사용으로 전환 |
| **Function UX Effect** | 기능 변경 없음 (순수 리팩토링) — 라우트 추가/변경 시 파싱 버그 발생 확률 제거 |
| **Core Value** | API 라우트 안정성 향상 + 코드 일관성 확보 |

---

## 1. Background

### 현재 상태 (실측)

**ID 추출 패턴 3가지 혼재**:

| 패턴 | 사용 예 | 파일 수 | 위험도 |
|------|---------|---------|--------|
| `segments[segments.length - 1]` | `reports/[id]/route.ts` | ~15 | 하위 라우트 추가 시 깨짐 |
| `segments[segments.length - 2]` | `reports/[id]/approve/route.ts` | ~18 | 정상 작동하나 fragile |
| `segments.indexOf('reports') + 1` | `reports/[id]/case-thread/route.ts` | ~5 | 가장 안전하나 하드코딩 |

**영향 범위**: 38개 파일, 약 55건의 split 호출

**미들웨어 3종**:
- `withAuth` (주력) — `src/lib/auth/middleware.ts`
- `withServiceAuth` (Crawler) — `src/lib/auth/service-middleware.ts`
- `withDualAuth` (Crawler+User) — `src/lib/auth/dual-middleware.ts`

### Next.js 16 표준 방식

```typescript
// Next.js App Router 표준
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
}
```

---

## 2. 해결 방향

### 2.1 withAuth 시그니처 확장

```typescript
// Before
type ApiHandler = (req: NextRequest, context: AuthContext) => Promise<NextResponse>
export const withAuth = (handler: ApiHandler, allowedRoles: Role[])
  : ((req: NextRequest) => Promise<NextResponse>)

// After — routeContext 추가
export const withAuth = (handler: ApiHandler, allowedRoles: Role[])
  : ((req: NextRequest, routeContext?: { params: Promise<Record<string, string>> }) => Promise<NextResponse>)
```

- `routeContext`를 optional로 받아 하위호환 유지
- `await routeContext?.params`로 resolve 후 `AuthContext.params`에 포함
- `withServiceAuth`, `withDualAuth`도 동일하게 확장

### 2.2 API 라우트 수정 패턴

```typescript
// Before
export const GET = withAuth(async (req, { user }) => {
  const segments = req.nextUrl.pathname.split('/')
  const id = segments[segments.length - 2]
  // ...
}, ['owner', 'admin'])

// After
export const GET = withAuth(async (req, { user, params }) => {
  const { id } = params
  // ...
}, ['owner', 'admin'])
```

### 2.3 배치 마이그레이션 (CTO 결정)

| Batch | 대상 | 파일 수 | 커밋 단위 |
|-------|------|---------|----------|
| **0** | `withAuth` + `withServiceAuth` + `withDualAuth` 시그니처 변경 | 3 | 1 커밋 |
| **1** | `api/reports/[id]/*` | ~20 | 1 커밋 |
| **2** | `api/campaigns/[id]/*` | 5 | 1 커밋 |
| **3** | 나머지 (`listings`, `patents`, `notices`, `templates`, `users`, `ai`, `br-templates`, `crawler`) | ~13 | 1 커밋 |

### 2.4 특수 케이스

**중첩 params** (`reports/[id]/case-notes/[noteId]/route.ts`):
```typescript
// Before
const noteId = segments[segments.length - 1]
const id = segments[segments.indexOf('reports') + 1]

// After
const { id, noteId } = params
```

**params 없는 라우트** (목록 API — `reports/route.ts`, `campaigns/route.ts` 등):
- `routeContext`가 optional이므로 변경 불필요
- `params`는 빈 객체 `{}`

---

## 3. 작업 순서

```
Batch 0: 미들웨어 시그니처 확장 (하위호환)
    ↓
Batch 1: reports/[id]/* 20파일
    ↓ typecheck + build
Batch 2: campaigns/[id]/* 5파일
    ↓ typecheck + build
Batch 3: 나머지 13파일
    ↓ typecheck + build + Preview 배포
```

---

## 4. 위험 요소

| 리스크 | 영향 | 완화 |
|--------|------|------|
| `withAuth` 시그니처 변경이 모든 라우트에 영향 | High | optional params로 하위호환 유지 |
| Next.js 16에서 `params`가 `Promise` | Medium | `await routeContext?.params ?? {}` 처리 |
| 중첩 params 매핑 실수 | Low | `case-notes/[noteId]` 1건만 해당 |

### 테스트 방법

- 각 Batch 후 `pnpm typecheck && pnpm build` (또는 `npx tsc --noEmit`)
- Batch 1 후: Report CRUD (생성, 조회, 수정, 승인, 반려, 케이스관리) 전체 확인
- Batch 2 후: Campaign CRUD 확인
- 최종: Preview 배포 → Extension API 호출 확인

---

## 5. Out of Scope

- 미들웨어 로직 변경 (인증/권한 로직은 그대로)
- API 응답 포맷 변경
- 새 API 라우트 추가
- `withServiceAuth` 사용 라우트의 서비스 토큰 인증 변경
