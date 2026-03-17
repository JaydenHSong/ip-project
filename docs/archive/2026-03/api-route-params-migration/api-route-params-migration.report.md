# API Route Params Migration — Completion Report

> **Feature**: 38개 API 라우트 `pathname.split('/')` → Next.js `params` 전환
> **Period**: 2026-03-17
> **Phase**: Completed
> **Match Rate**: 100%
> **Commit**: `313d072`

---

## Executive Summary

### 1.1 Overview

| 항목 | 내용 |
|------|------|
| Feature | api-route-params-migration |
| Origin | code-quality-overhaul Phase 4에서 분리 |
| 시작/완료 | 2026-03-17 (동일 세션) |
| 커밋 수 | 1 |

### 1.2 Results

| 지표 | 값 |
|------|-----|
| Match Rate | **100%** |
| 수정 파일 | 40 (미들웨어 2 + 라우트 38) |
| 마이그레이션 핸들러 | 55개 |
| `pathname.split` 잔존 | **0건** |
| 타입체크 에러 (신규) | **0건** |
| Preview 빌드 | 성공 |

### 1.3 Value Delivered

| 관점 | Before | After |
|------|--------|-------|
| **Problem** | 38파일 55핸들러에서 `pathname.split('/')`로 ID 수동 추출, 3가지 패턴 혼재 (`length-1`, `length-2`, `indexOf+1`) | 모든 핸들러가 `const { id } = params`로 통일 |
| **Solution** | `withAuth`/`withServiceAuth` 시그니처에 `routeContext` optional 추가, 배치 마이그레이션 | 미들웨어 하위호환 유지, 3배치로 안전하게 전환 |
| **Function UX Effect** | 기능 변경 없음 (순수 리팩토링) | 라우트 추가/변경 시 인덱스 엇갈림 버그 발생 확률 제거 |
| **Core Value** | API 라우트 안정성 + 코드 일관성 + Next.js 표준 패턴 준수 |  |

---

## 2. 마이그레이션 상세

### Batch 0: 미들웨어 시그니처 확장

| 파일 | 변경 |
|------|------|
| `src/lib/auth/middleware.ts` | `AuthContext`에 `params` 추가, 반환 함수에 `routeContext?` 추가 |
| `src/lib/auth/service-middleware.ts` | `ServiceAuthContext`에 `params` 추가, 동일 패턴 |

### Batch 1: reports/[id]/* — 22파일, 30핸들러

모든 `segments[...]` / `.split('/').pop()` / `.at(-2)` / `.indexOf()+1` 패턴 제거.
중첩 params `case-notes/[noteId]`는 `const { id, noteId } = params`로 처리.

### Batch 2: campaigns/[id]/* — 5파일, 7핸들러

`campaigns/[id]/route.ts`의 GET/PUT/DELETE 3핸들러 포함.

### Batch 3: 나머지 — 11파일, 18핸들러

listings, patents, notices, templates, br-templates, users, ai/jobs, crawler/campaigns 포함.
`withServiceAuth` 사용 라우트(`crawler/campaigns/[id]/result`) 포함.

---

## 3. 제거된 패턴 vs 도입된 패턴

### Before (3가지 혼재)

```typescript
// 패턴 1: 마지막 세그먼트
const segments = req.nextUrl.pathname.split('/')
const id = segments[segments.length - 1]

// 패턴 2: 뒤에서 두 번째
const id = segments[segments.length - 2]

// 패턴 3: 특정 키워드 기준
const id = segments[segments.indexOf('reports') + 1]
```

### After (1가지 통일)

```typescript
export const GET = withAuth(async (req, { user, params }) => {
  const { id } = params
  // ...
}, ['owner', 'admin'])
```

---

## 4. 리스크 관리

| 리스크 | 예상 | 실제 |
|--------|------|------|
| `withAuth` 시그니처 변경 cascade | High | `routeContext` optional로 **영향 없음** |
| 중첩 params 매핑 실수 | Low | `case-notes/[noteId]` 1건 정상 처리 |
| 타입체크 실패 | Medium | **0건** 에러 |
