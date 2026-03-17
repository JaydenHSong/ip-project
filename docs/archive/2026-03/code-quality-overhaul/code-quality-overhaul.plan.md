# Code Quality Overhaul — Plan

> **Feature**: 프론트엔드 코드 품질 전면 개선 (보안, 타입, 구조)
> **Created**: 2026-03-17
> **Updated**: 2026-03-17 (QC 검증 + CTO 리뷰 반영)
> **Phase**: Plan
> **Priority**: High
> **Scope**: Web (Next.js) 전체

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 검색 쿼리 Injection 취약점(8파일), `as unknown as` 더블캐스팅(15건), API Route ID 수동 파싱(38파일), 655줄 거대 컴포넌트 등 구조적 기술부채 |
| **Solution** | 6단계 점진적 개선 — 보안 패치 → 타입 정비 → 쿼리 분리 → API ID 표준화 → 컴포넌트 분할 → 코드 위생 |
| **Function UX Effect** | 보안 취약점 제거, 런타임 에러 감소, 유지보수성 향상으로 향후 기능 개발 속도 개선 |
| **Core Value** | 프로덕션 보안 강화 + 유지보수 가능한 코드베이스로 전환 |

---

## 1. Background

### 현재 상황
- 프로덕션 운영 중인 Next.js 16 앱 (118개 API 라우트, 50+ 컴포넌트)
- 빠른 기능 개발 중심으로 진행하면서 기술부채 누적
- 시니어 코드 리뷰 → QC 팩트체크 → CTO 판정을 거쳐 확정된 문제 목록

### 확정된 문제 목록 (QC 검증 완료)

| # | 심각도 | 문제 | 실측 영향 범위 |
|---|--------|------|---------------|
| 1 | **P0** | 검색 쿼리 Injection 취약점 | 8개 파일 |
| 2 | **P1** | `as unknown as` 타입 캐스팅 남용 | 10개 파일, 15건 |
| 3 | **P1** | Server Component 데이터 로직 비분리 | 4개 page.tsx |
| 4 | **P1** | API Route ID 수동 파싱 (`pathname.split`) | 38개 파일 |
| 5 | **P2** | ReportsContent 거대 컴포넌트 | 655줄 |
| 6 | **P3** | `console.error` 잔존 | 7개 파일, 11건 |
| 7 | **P3** | ReportDetailContent 타입 인라인 | 80줄 인라인 타입 |
| 8 | **P3** | CORS `*` (Extension API 전용) | middleware.ts `/api/ext/` 한정 |

> **삭제됨**: Dashboard 인증 누락 → `(protected)/layout.tsx`에서 이미 가드 확인 (False Positive)
> **승격됨**: API Route ID 파싱 P3 → P1 (38파일 영향, `withAuth` 시그니처 변경 cascade)
> **하향됨**: CORS `*` P2 → P3 (`/api/ext/` 전용 + `withServiceAuth` 별도 인증)

---

## 2. 해결 방향 (CTO 확정)

### Phase 1: 보안 패치 (P0) — 검색 Injection 수정

**대상 파일** (8개 — QC 검증 완료):
- `src/app/(protected)/reports/page.tsx`
- `src/app/(protected)/reports/completed/page.tsx`
- `src/app/(protected)/notices/page.tsx`
- `src/app/(protected)/patents/page.tsx`
- `src/app/api/reports/route.ts`
- `src/app/api/patents/route.ts`
- `src/app/api/listings/route.ts`
- `src/app/api/templates/route.ts`

**수정 방법**:
- 공통 유틸 함수 생성: `sanitizeSearchTerm(input: string): string`
- 위치: `src/lib/utils/sanitize.ts`
- 이스케이프 대상: `\` (최우선), `%`, `_`, `,`, `.`, `(`, `)`

### Phase 2: 타입 안전성 복구 (P1)

**대상**: `as unknown as` 사용 10개 파일 15건

**수정 방법**:
1. DB 응답 → 도메인 타입 변환 함수 작성 (mapper 패턴)
2. `as unknown as` → 명시적 변환 함수로 교체

**핵심 파일**: `reports/[id]/page.tsx` (6건), `campaigns/[id]/page.tsx` (1건)

### Phase 3: Server Component 쿼리 분리 (P1)

**대상**: 4개 page.tsx (reports, completed, notices, patents)

**수정 방법**:
- `src/lib/queries/` 디렉토리에 도메인별 쿼리 함수 분리
- Page 컴포넌트는 쿼리 함수 호출만 담당

### Phase 4: API Route ID 파싱 표준화 (P1) — CTO 신설

**대상**: 38개 API 라우트 파일

**수정 방법** (CTO 결정: 점진적 배치 마이그레이션):
1. `withAuth` 시그니처를 하위호환 유지하며 params 수용 확장
2. 배치별 마이그레이션:
   - Batch 1: `reports/[id]/*` (20+ 파일)
   - Batch 2: `campaigns/[id]/*` (5 파일)
   - Batch 3: 나머지 (listings, patents, notices, templates, users, ai, br-templates)
3. 각 배치를 별도 커밋으로 분리

### Phase 5: ReportsContent 컴포넌트 분할 (P2)

**대상**: `ReportsContent.tsx` (655줄 — QC 실측)

**분할 계획** (4~5개 단위):
1. `BulkActionBar.tsx` — Bulk 액션 UI
2. `ReportMobileCard.tsx` — 모바일 카드 렌더링
3. `ReportTableRow.tsx` — 데스크톱 테이블 행
4. `useBulkActions.ts` — 3개 Bulk fetch 패턴 통합 훅

### Phase 6: 코드 위생 (P3)

1. `console.error` 제거 — 7개 파일, 11건
2. ReportDetailContent 타입 정리 — 인라인 80줄 → `Pick<Report, ...>` 활용
3. CORS Origin 제한 — `/api/ext/` 전용, nice-to-have (Extension ID 환경변수)

---

## 3. 작업 순서 및 의존성 (CTO 확정)

```
Phase 1 (보안) ──── 독립, 최우선
    ↓
Phase 2 (타입) ──── Phase 1 완료 후
    ↓
Phase 3 (쿼리 분리) ─────┐ 병렬 가능
Phase 4 (API ID 표준화) ──┘
    ↓
Phase 5 (컴포넌트 분할) ── Phase 3 완료 후
    ↓
Phase 6 (코드 위생) ────── 마지막 정리
```

---

## 4. 영향 범위

### 수정 대상 파일 (QC 실측 기반)

| Phase | 신규 파일 | 수정 파일 | 비고 |
|-------|----------|----------|------|
| 1 | 1 (sanitize.ts) | 8 | |
| 2 | 1 (mappers/) | 10 | |
| 3 | 3 (queries/) | 4 (page.tsx) | |
| 4 | 0 | 38 + 1 (withAuth) | 최대 리스크 |
| 5 | 3~4 (분할) | 1 (ReportsContent) | |
| 6 | 0 | ~8 | |
| **합계** | **8~9** | **~70** | **0 삭제** |

### 위험 요소 (CTO 판정)

1. **Phase 4 (API ID 표준화)** — 38파일 마이그레이션, 최대 리스크. 배치 커밋 + Preview 검증 필수
2. **Phase 3 (쿼리 분리)** — 두 번째 큰 리팩토링, 필터/정렬 로직 이동 시 동작 변경 주의
3. **Phase 5 (컴포넌트 분할)** — 상태 흐름 변경 시 UI 깨질 가능성

### 테스트 방법

- 각 Phase 완료 후 `pnpm typecheck && pnpm lint && pnpm build` 필수
- Phase 1 후: 검색에 특수문자 (`%`, `,`, `.`, `\`) 입력 테스트
- Phase 3 후: Reports 목록/상세, 필터링, 정렬 전체 확인
- Phase 4 후: 각 배치 커밋마다 Preview 배포 + Extension API 호출 확인
- Phase 5 후: Bulk action (전체선택, 승인, 삭제) 동작 확인

---

## 5. Out of Scope

- DB 스키마 변경 (현재 구조 유지)
- 새 기능 추가 (순수 리팩토링)
- Crawler/Extension 코드 수정
- UI 디자인 변경
- 테스트 코드 작성 (별도 이슈)
