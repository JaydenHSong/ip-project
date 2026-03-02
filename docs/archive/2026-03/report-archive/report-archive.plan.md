# Report Archive + Grid Sorting/Filtering Planning Document

> **Summary**: 신고 강제 Archive 기능 + 리포트 그리드 솔팅/필터링 개선
>
> **Project**: Sentinel
> **Author**: Claude (PDCA)
> **Date**: 2026-03-02
> **Status**: Draft
> **Version**: 0.1

---

## 1. Overview

### 1.1 Purpose

두 가지 요구사항을 하나의 피처로 통합한다:

**A. Report Archive**: 모니터링 상태에서 장기간 머무는 케이스를 강제로 Archive하여 워크플로우를 정리. 사이드 메뉴에 "Archived Reports" 추가.

**B. Grid Sorting/Filtering**: Report Queue, Completed Reports 테이블에 컬럼 클릭 솔팅 + 고급 필터링 기능 추가. 현재는 status 탭 필터만 있고, 정렬 기능이 전혀 없음.

### 1.2 Background

- 모니터링 리포트가 무기한 `monitoring` / `unresolved` 상태에 머물 수 있음
- 경쟁사가 리스팅을 삭제하지 않는 한 계속 모니터링 대상으로 남음
- 강제 Archive로 "더 이상 추적하지 않음" 처리가 필요
- 현재 리포트 목록은 생성일 내림차순 고정 — 위반 유형, AI 스코어, 날짜 등으로 정렬 불가
- 검색/필터링이 status 탭 외에 없음 — ASIN, 판매자, 위반 유형별 필터 필요

### 1.3 Related Documents

- Feature IDs: 신규 (Archive는 기존 F15 대시보드 연관, 솔팅/필터링은 UX 개선)
- 관련 기능: F16 (리포트 타임라인), Follow-up Monitoring

---

## 2. Scope

### 2.1 In Scope

**Archive**:
- [x] `archived` status 추가 (ReportStatus에 추가)
- [x] Report Detail에서 "Force Archive" 버튼 (monitoring/unresolved/resolved 상태에서)
- [x] Archive 시 `archived_at` 타임스탬프 기록
- [x] Archive 사유 입력 (Modal)
- [x] Sidebar에 "Archived Reports" 메뉴 추가
- [x] `/reports/archived` 페이지 (Archive된 리포트 목록)
- [x] Archive된 리포트는 모니터링 스케줄에서 제외
- [x] Unarchive (복원) 기능

**Grid Sorting**:
- [x] Report Queue 테이블 — 컬럼 헤더 클릭으로 정렬 (asc/desc 토글)
- [x] Completed Reports 테이블 — 동일
- [x] Archived Reports 테이블 — 동일
- [x] 정렬 가능 컬럼: Violation, ASIN, AI Score, Status, Date
- [x] 정렬 화살표 아이콘 표시 (▲ ▼)

**Grid Filtering**:
- [x] 검색 입력 (ASIN, Title, Seller 검색)
- [x] 위반 유형 드롭다운 필터 (V01~V19)
- [x] Marketplace 필터 (US, JP, UK 등)

### 2.2 Out of Scope

- 벌크 Archive (여러 건 일괄 처리) — v2
- Archive 자동화 (90일 이상 unresolved → 자동 Archive) — v2
- 엑셀/CSV 내보내기 — v2
- 서버사이드 정렬/페이지네이션 — 현재 Demo mode에서 클라이언트 정렬

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| FR-01 | `archived` status 추가 + Archive API | High | User |
| FR-02 | Report Detail에 "Force Archive" 버튼 | High | User |
| FR-03 | Archive 사유 입력 Modal | High | UX |
| FR-04 | Sidebar "Archived Reports" 메뉴 | High | User |
| FR-05 | `/reports/archived` 목록 페이지 | High | User |
| FR-06 | Unarchive (복원) 기능 | Medium | User |
| FR-07 | 테이블 컬럼 솔팅 (Violation, ASIN, AI, Status, Date) | High | User |
| FR-08 | 솔팅 방향 토글 (asc ↔ desc) + 화살표 아이콘 | High | UX |
| FR-09 | ASIN 검색 (기본) + Title/Seller 통합 검색 | High | User |
| FR-10 | 위반 유형 드롭다운 필터 | Medium | User |
| FR-11 | Marketplace 드롭다운 필터 | Low | UX |

### 3.2 Non-Functional Requirements

| Category | Criteria |
|----------|----------|
| Performance | 클라이언트 솔팅 (Demo mode) — 200건 이하에서 즉시 반응 |
| UX | 솔팅 클릭 시 페이지 새로고침 없이 즉시 반영 |
| 접근성 | 솔팅 버튼에 aria-sort 속성, 필터에 aria-label |

---

## 4. Success Criteria

- [x] "Force Archive" 버튼으로 모니터링 케이스 Archive 가능
- [x] 사이드바에 "Archived Reports" 메뉴 표시
- [x] Archive 목록에서 Unarchive 가능
- [x] Report Queue, Completed, Archived 테이블에서 컬럼 헤더 클릭 정렬 동작
- [x] 검색 + 위반 유형 필터 동작
- [x] pnpm typecheck + pnpm build 성공
- [x] Gap Analysis Match Rate >= 90%

---

## 5. Architecture Considerations

### 5.1 Archive Status 전략

**선택: `archived` status + `archived_at` 필드**

```
monitoring/unresolved/resolved → "Force Archive" → archived
                                                    ↓
                                               "Unarchive" → 이전 상태로 복원
```

- `REPORT_STATUSES`에 `'archived'` 추가
- Report 타입에 `archived_at`, `archive_reason` 필드 추가
- Archive API: `POST /api/reports/[id]/archive`
- Unarchive API: `POST /api/reports/[id]/unarchive`

### 5.2 Grid Sorting 전략

**선택: 클라이언트 사이드 솔팅 (Demo mode 우선)**

```
ReportsContent
  └─ useSortableTable(reports, defaultSort)
       ├─ sortField: 'created_at' | 'violation_type' | 'ai_confidence_score' | ...
       ├─ sortDir: 'asc' | 'desc'
       ├─ toggle(field) → field 동일하면 dir 토글, 다르면 desc 기본
       └─ sortedData: 정렬된 배열 반환
```

재사용 가능한 `useSortableTable` 커스텀 훅으로 구현.

### 5.3 Grid Filtering 전략

검색 + 드롭다운 필터를 `useFilterableTable` 커스텀 훅으로:

```
useFilterableTable(reports, filters)
  ├─ searchQuery: string
  ├─ violationFilter: ViolationCode | ''
  ├─ marketplaceFilter: string | ''
  └─ filteredData: 필터링된 배열 반환
```

### 5.4 SortableHeader 공통 컴포넌트

```typescript
// src/components/ui/SortableHeader.tsx
type SortableHeaderProps = {
  label: string
  field: string
  currentField: string
  currentDir: 'asc' | 'desc'
  onSort: (field: string) => void
}
```

테이블 `<th>` 대체 — 클릭 가능한 헤더 + 정렬 화살표.

---

## 6. Implementation Strategy

### Phase A: Types + Archive API (~80 LoC)
1. `src/types/reports.ts` — `archived` status 추가, archive 필드
2. `src/app/api/reports/[id]/archive/route.ts` — Archive API
3. `src/app/api/reports/[id]/unarchive/route.ts` — Unarchive API
4. Demo data에 Archive 케이스 추가

### Phase B: Sidebar + Archive 페이지 (~150 LoC)
5. `src/components/layout/Sidebar.tsx` — "Archived Reports" 메뉴 추가
6. `src/app/(protected)/reports/archived/page.tsx` — Server Component
7. `src/app/(protected)/reports/archived/ArchivedReportsContent.tsx` — Client Component

### Phase C: Archive 액션 버튼 (~50 LoC)
8. `src/app/(protected)/reports/[id]/ReportActions.tsx` — "Force Archive" 버튼 + Modal

### Phase D: Sortable/Filterable Grid (~200 LoC)
9. `src/hooks/useSortableTable.ts` — 솔팅 커스텀 훅
10. `src/hooks/useFilterableTable.ts` — 필터링 커스텀 훅
11. `src/components/ui/SortableHeader.tsx` — 정렬 가능 헤더 컴포넌트
12. `src/components/ui/TableFilters.tsx` — 검색 + 드롭다운 필터 바

### Phase E: Grid 적용 + i18n (~150 LoC)
13. `src/app/(protected)/reports/ReportsContent.tsx` — 솔팅/필터 적용
14. `src/app/(protected)/reports/completed/CompletedReportsContent.tsx` — 솔팅/필터 적용
15. `src/lib/i18n/locales/en.ts` — 번역 키
16. `src/lib/i18n/locales/ko.ts` — 번역 키

**총 예상**: ~630 LoC

---

## 7. Existing Infrastructure

### 7.1 현재 리포트 그리드 (ReportsContent)
- Status 탭 필터만 있음 (URL param: `?status=draft`)
- Disagreement 필터 있음 (URL param: `?disagreement=true`)
- 정렬 없음 — Supabase/Demo에서 받은 순서 그대로 표시
- 모바일: 카드 리스트, 데스크탑: 테이블

### 7.2 현재 상태 체계
- 11개 status: draft, pending_review, approved, rejected, cancelled, submitted, monitoring, resolved, unresolved, resubmitted, escalated
- `archived` 없음 → 추가 필요

### 7.3 사이드바
- `MAIN_NAV` 배열에 항목 추가하면 됨
- lucide-react의 `Archive` 아이콘 사용

---

## 8. Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Archive 후 복원 요구 | Low | Unarchive 기능으로 이전 상태 복원 |
| 클라이언트 솔팅 성능 (대량 데이터) | Medium | 200건 이하 Demo mode에서는 문제 없음. 향후 서버 솔팅 확장 |
| 솔팅 상태 URL 비동기 | Low | URL searchParams로 솔팅 상태 유지 또는 client state만 |

---

## 9. Next Steps

1. [ ] `/pdca design report-archive` — 상세 설계 문서
2. [ ] 설계 후 구현 시작
3. [ ] Gap Analysis >= 90%

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-02 | Initial draft | Claude (PDCA) |
