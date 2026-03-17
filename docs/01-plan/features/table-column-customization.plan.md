# Table Column Customization Planning Document

> **Summary**: BR Case ID 독립 컬럼 분리 + 유저별 컬럼 표시/숨기기 토글 + DB 저장
>
> **Project**: Sentinel
> **Version**: 0.9.0-beta
> **Author**: CTO Lead (PDCA Team)
> **Date**: 2026-03-17
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | BR Case ID가 Status 컬럼 안에 작은 텍스트로 묻혀 있어 케이스 추적이 불편하고, 유저마다 필요한 컬럼이 달라 불필요한 정보가 화면을 차지한다 |
| **Solution** | BR Case ID를 독립 컬럼으로 분리하고, Column Visibility Toggle 드롭다운을 TableFilters 영역에 추가하여 유저별 컬럼 표시/숨기기를 구현한다 |
| **Function/UX Effect** | BR Case ID가 한눈에 보이고 정렬 가능해짐. 각 유저가 자신에게 필요한 컬럼만 표시하여 테이블 밀도를 최적화할 수 있음 |
| **Core Value** | 브랜드 보호 팀의 케이스 추적 효율 향상 + 개인화된 워크스페이스로 작업 생산성 증가 |

---

## 1. Overview

### 1.1 Purpose

Reports 테이블 3개 페이지(Queue, Completed, Archived)에서:
1. BR Case ID를 Status 컬럼 하위에서 분리하여 독립적인 정렬/필터 가능한 컬럼으로 승격
2. 유저가 테이블 컬럼을 자유롭게 표시/숨기기 할 수 있는 Column Visibility Toggle 제공
3. 설정을 DB(user_preferences)에 저장하여 브라우저/기기 간 동기화

### 1.2 Background

- 현재 BR Case ID는 StatusBadge 아래에 `text-[10px]` 크기로 렌더링되어 시각적으로 묻힘
- 팀원 역할별(Admin vs Editor vs Viewer)로 필요한 컬럼이 다름 -- Admin은 Requester 필요, Viewer는 불필요
- 현재 컬럼 너비는 localStorage에 저장(useResizableColumns)되지만, 컬럼 표시 여부 설정은 없음
- user_preferences 테이블과 API(/api/user/preferences)가 이미 존재하며 Dashboard 레이아웃에 활용 중

### 1.3 Related Documents

- Existing: `docs/01-plan/features/table-column-fix.plan.md` (이전 컬럼 관련 작업)
- API: `src/app/api/user/preferences/route.ts` (GET/PUT 구현 완료)
- Hook: `src/hooks/useResizableColumns.ts` (컬럼 너비 관리)

---

## 2. Scope

### 2.1 In Scope

- [x] BR Case ID를 Status 컬럼에서 분리하여 독립 컬럼으로 추가 (3개 테이블)
- [x] ColumnVisibilityToggle UI 컴포넌트 생성 (체크박스 드롭다운)
- [x] useColumnVisibility 커스텀 훅 생성 (상태 관리 + API 연동)
- [x] Reports Queue (ReportsContent.tsx) 적용
- [x] Completed Reports (CompletedReportsContent.tsx) 적용 -- non-archived 뷰만
- [x] Archived Reports (ArchivedReportsContent.tsx) 적용 -- 별도 컬럼 구조
- [x] user_preferences DB 저장/로드 (preference_key: `table_columns_{page}`)
- [x] 컬럼 숨김 시 useResizableColumns와 연동 (widths 배열 동기화)

### 2.2 Out of Scope

- 컬럼 순서 변경(Drag & Drop reorder) -- 별도 피처로 분리
- 모바일 카드 뷰의 필드 커스터마이제이션
- 컬럼 설정 프리셋(팀 공유 레이아웃)
- Archived 탭(CompletedReportsContent의 isArchived 뷰)은 별도 컬럼 구조이므로 제외

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | BR Case ID를 Status 컬럼에서 분리하여 독립 컬럼으로 표시 (Status 옆) | High | Pending |
| FR-02 | BR Case ID 컬럼은 SortableHeader로 정렬 가능 | Medium | Pending |
| FR-03 | ColumnVisibilityToggle 드롭다운을 TableFilters 영역 우측에 배치 | High | Pending |
| FR-04 | 체크박스 목록으로 각 컬럼 표시/숨기기 토글 | High | Pending |
| FR-05 | 특정 컬럼은 숨기기 불가 (Checkbox, No., Status는 항상 표시) | High | Pending |
| FR-06 | 유저 설정을 user_preferences 테이블에 자동 저장 (debounced) | High | Pending |
| FR-07 | 페이지 로드 시 저장된 설정을 복원 | High | Pending |
| FR-08 | "Reset to Default" 버튼으로 초기 상태 복원 | Medium | Pending |
| FR-09 | 숨긴 컬럼의 colgroup/col, thead th, tbody td 모두 렌더링하지 않음 | High | Pending |
| FR-10 | 3개 테이블 페이지에 각각 독립적인 컬럼 설정 저장 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 설정 로드/저장이 테이블 렌더링을 블로킹하지 않음 | 초기 로드 시 default 표시 후 설정 적용 |
| UX | 토글 변경 즉시 반영 (optimistic update) | 시각적 확인 |
| Persistence | 브라우저 새로고침/다른 기기에서 동일 설정 유지 | DB 저장 확인 |
| Compatibility | useResizableColumns와 충돌 없음 | 숨긴 컬럼은 widths 배열에서 제외 |

---

## 4. Technical Design Overview

### 4.1 Column Definition Map

각 테이블 페이지별 컬럼 정의를 상수로 관리:

```
// constants/table-columns.ts

Reports Queue 컬럼:
  checkbox (locked), no (locked), status (locked), br_case_id, channel,
  asin, violation, seller, requester, date, updated, resolved

Completed 컬럼:
  checkbox (locked, admin only), no (locked), status (locked), br_case_id,
  channel, asin, violation, seller, requester, date, updated, resolved

Archived 컬럼 (별도 구조):
  violation (locked), asin (locked), title, reason, archived_at, action
```

### 4.2 New Components & Hooks

| Item | Path | Role |
|------|------|------|
| `ColumnVisibilityToggle` | `src/components/ui/ColumnVisibilityToggle.tsx` | 드롭다운 UI (체크박스 목록 + Reset) |
| `useColumnVisibility` | `src/hooks/useColumnVisibility.ts` | 상태관리 + API 저장/로드 + default 관리 |
| Column definitions | `src/constants/table-columns.ts` | 컬럼 ID/label/locked/defaultVisible 정의 |

### 4.3 Preference Storage Schema

```json
{
  "key": "table_columns_reports_queue",
  "value": {
    "version": 1,
    "hidden": ["requester", "updated", "resolved"]
  }
}
```

페이지별 키:
- `table_columns_reports_queue`
- `table_columns_reports_completed`
- `table_columns_reports_archived`

### 4.4 Integration with useResizableColumns

현재 useResizableColumns는 고정 인덱스 기반 widths 배열을 사용.
컬럼 숨기기 시 visible 컬럼만으로 widths/minWidths 배열을 재구성하여 전달.

```
visibleColumns = allColumns.filter(col => !hidden.includes(col.id))
defaultWidths = visibleColumns.map(col => col.defaultWidth)
minWidths = visibleColumns.map(col => col.minWidth)
storageKey = `reports-queue-v4-${hash(visibleColumnIds)}`
```

storageKey에 visible 컬럼 조합 해시를 포함하여, 컬럼 조합이 바뀌면 너비가 리셋됨.

### 4.5 BR Case ID Column Details

- 현재: Status 컬럼 `<td>` 안에 `<a>` 태그로 `BR#{case_id}` 표시 (10px 크기)
- 변경: Status 다음 독립 컬럼, `SortableHeader` 적용
- 표시: `BR#{case_id}` 링크 (클릭 시 Amazon BR Dashboard로 이동)
- 빈 값: `—` 표시
- 기본 너비: 110px, 최소: 80px

---

## 5. Success Criteria

### 5.1 Definition of Done

- [ ] BR Case ID가 모든 3개 테이블에서 독립 컬럼으로 표시됨
- [ ] ColumnVisibilityToggle이 TableFilters 영역에 표시됨
- [ ] 컬럼 토글 시 즉시 테이블에 반영됨
- [ ] 페이지 새로고침 후 설정이 유지됨
- [ ] 다른 브라우저/기기에서 동일 설정 로드됨
- [ ] locked 컬럼(checkbox, no, status)은 숨기기 불가
- [ ] Reset 버튼으로 초기 상태 복원 가능
- [ ] typecheck, lint, build 통과

### 5.2 Quality Criteria

- [ ] Zero TypeScript errors
- [ ] Zero lint errors
- [ ] Build succeeds (pnpm build)
- [ ] 3개 테이블 페이지 모두 동작 확인

---

## 6. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| useResizableColumns widths 배열과 visible 컬럼 불일치 | High | Medium | storageKey에 컬럼 조합 해시 포함하여 자동 리셋 |
| colSpan 불일치 (empty state row) | Medium | High | visibleColumns.length 기반으로 colSpan 동적 계산 |
| API 호출 과다 (매 토글마다 PUT) | Low | Medium | 500ms debounce 적용 |
| CompletedReportsContent의 isArchived 조건부 렌더링 복잡도 | Medium | Medium | Archived 뷰는 이번 스코프에서 제외, non-archived 뷰만 적용 |
| localStorage(widths)와 DB(visibility) 저장소 이원화 혼란 | Low | Low | widths는 기존대로 localStorage, visibility만 DB -- 역할이 다름 |

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | - |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend, SaaS MVPs | O |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems | - |

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| State management | Context / Hook / Zustand | Custom Hook | 페이지별 독립 상태, 전역 store 불필요 |
| Persistence | localStorage / DB / Both | DB (user_preferences) | 크로스 디바이스 동기화 요구사항 |
| Column definition | Inline / Constants file | Constants file | 3개 테이블에서 재사용, DRY 원칙 |
| UI Pattern | Popover / Drawer / Dialog | Popover (dropdown) | 빠른 접근, 적은 컬럼 수(10개 이하) |

### 7.3 Existing Infrastructure Reuse

| Infrastructure | Path | Reuse Method |
|----------------|------|--------------|
| user_preferences API | `src/app/api/user/preferences/route.ts` | GET/PUT 그대로 사용 |
| TableFilters component | `src/components/ui/TableFilters.tsx` | 옆에 ColumnVisibilityToggle 배치 |
| useResizableColumns hook | `src/hooks/useResizableColumns.ts` | visible 컬럼 기반 widths 재계산 |
| DashboardContent 패턴 | `src/app/(protected)/dashboard/DashboardContent.tsx` | preferences fetch/save 패턴 참조 |

---

## 8. Implementation Order

| Step | Task | Files | Estimated |
|------|------|-------|-----------|
| 1 | 컬럼 정의 상수 파일 생성 | `constants/table-columns.ts` | Small |
| 2 | useColumnVisibility 훅 생성 | `hooks/useColumnVisibility.ts` | Medium |
| 3 | ColumnVisibilityToggle 컴포넌트 생성 | `components/ui/ColumnVisibilityToggle.tsx` | Medium |
| 4 | ReportsContent.tsx에 BR Case ID 독립 컬럼 + visibility 적용 | `reports/ReportsContent.tsx` | Medium |
| 5 | CompletedReportsContent.tsx에 적용 | `reports/completed/CompletedReportsContent.tsx` | Medium |
| 6 | ArchivedReportsContent.tsx에 적용 | `reports/archived/ArchivedReportsContent.tsx` | Small |
| 7 | 통합 테스트 (typecheck + lint + build) | - | Small |

---

## 9. Next Steps

1. [ ] Plan 승인 (유저 확인)
2. [ ] Design 문서 작성 (`table-column-customization.design.md`)
3. [ ] Implementation (Do phase)
4. [ ] Gap Analysis (Check phase)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-17 | Initial draft | CTO Lead |
