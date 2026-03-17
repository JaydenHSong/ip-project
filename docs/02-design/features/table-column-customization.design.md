# Table Column Customization — Design Document

> **Feature**: BR Case ID 독립 컬럼 + 유저별 컬럼 표시/숨기기
> **Created**: 2026-03-17
> **Phase**: Design
> **Plan Reference**: `docs/01-plan/features/table-column-customization.plan.md`

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | BR Case ID가 Status 안에 묻혀 추적 불편, 유저마다 필요한 컬럼이 달라 불필요한 정보 차지 |
| **Solution** | BR Case ID 독립 컬럼 + ColumnVisibilityToggle + user_preferences DB 저장 |
| **Function UX Effect** | BR Case ID 정렬 가능, 유저별 맞춤 테이블 레이아웃, 기기 간 동기화 |
| **Core Value** | 케이스 추적 효율 + 개인화 워크스페이스 |

---

## D1. 컬럼 정의 상수

### 파일: `src/constants/table-columns.ts`

```typescript
type ColumnDef = {
  id: string
  labelKey: string          // i18n key
  locked: boolean           // true면 숨기기 불가
  defaultVisible: boolean
  defaultWidth: number
  minWidth: number
  sortField?: string        // SortableHeader field
}

// Reports Queue (ReportsContent.tsx) — 12컬럼
const REPORT_QUEUE_COLUMNS: ColumnDef[] = [
  { id: 'checkbox',   labelKey: '',                              locked: true,  defaultVisible: true,  defaultWidth: 40,  minWidth: 40 },
  { id: 'no',         labelKey: 'No.',                           locked: true,  defaultVisible: true,  defaultWidth: 56,  minWidth: 50 },
  { id: 'status',     labelKey: 'common.status',                 locked: true,  defaultVisible: true,  defaultWidth: 110, minWidth: 80,  sortField: 'status' },
  { id: 'br_case_id', labelKey: 'reports.table.brCaseId',        locked: false, defaultVisible: true,  defaultWidth: 110, minWidth: 80 },
  { id: 'channel',    labelKey: 'reports.table.channel',         locked: false, defaultVisible: true,  defaultWidth: 65,  minWidth: 40,  sortField: 'channel' },
  { id: 'asin',       labelKey: 'reports.asin',                  locked: false, defaultVisible: true,  defaultWidth: 140, minWidth: 100, sortField: 'asin' },
  { id: 'violation',  labelKey: 'reports.violation',             locked: false, defaultVisible: true,  defaultWidth: 150, minWidth: 100, sortField: 'violation' },
  { id: 'seller',     labelKey: 'reports.seller',                locked: false, defaultVisible: true,  defaultWidth: 220, minWidth: 100, sortField: 'seller' },
  { id: 'requester',  labelKey: 'reports.createdBy',             locked: false, defaultVisible: true,  defaultWidth: 110, minWidth: 80,  sortField: 'requester' },
  { id: 'date',       labelKey: 'common.date',                   locked: false, defaultVisible: true,  defaultWidth: 95,  minWidth: 80,  sortField: 'date' },
  { id: 'updated',    labelKey: 'reports.table.updated',         locked: false, defaultVisible: false, defaultWidth: 95,  minWidth: 80,  sortField: 'updated' },
  { id: 'resolved',   labelKey: 'reports.table.resolved',        locked: false, defaultVisible: false, defaultWidth: 115, minWidth: 80,  sortField: 'resolved' },
]

// Completed Reports — 동일 구조, checkbox는 canBulk 조건부
const COMPLETED_COLUMNS: ColumnDef[] = [ /* REPORT_QUEUE_COLUMNS과 동일 */ ]

// Archived Reports — 별도 구조 (현재 간단한 테이블)
const ARCHIVED_COLUMNS: ColumnDef[] = [
  { id: 'violation',   labelKey: 'reports.violation',            locked: true,  defaultVisible: true, defaultWidth: 150, minWidth: 100 },
  { id: 'asin',        labelKey: 'reports.asin',                 locked: true,  defaultVisible: true, defaultWidth: 150, minWidth: 100 },
  { id: 'title',       labelKey: 'reports.table.title',          locked: false, defaultVisible: true, defaultWidth: 250, minWidth: 150 },
  { id: 'reason',      labelKey: 'reports.table.reason',         locked: false, defaultVisible: true, defaultWidth: 200, minWidth: 100 },
  { id: 'archived_at', labelKey: 'reports.table.archivedAt',     locked: false, defaultVisible: true, defaultWidth: 120, minWidth: 80 },
  { id: 'action',      labelKey: 'common.action',               locked: true,  defaultVisible: true, defaultWidth: 80,  minWidth: 60 },
]

// 유틸: visible 컬럼 기반 widths/minWidths 배열 생성
function getVisibleColumnWidths(columns: ColumnDef[], hiddenIds: string[]): { defaultWidths: number[]; minWidths: number[] }
function getVisibleColumns(columns: ColumnDef[], hiddenIds: string[]): ColumnDef[]
```

---

## D2. useColumnVisibility 훅

### 파일: `src/hooks/useColumnVisibility.ts`

```typescript
type UseColumnVisibilityOptions = {
  columns: ColumnDef[]
  preferenceKey: string   // e.g. 'table_columns_reports_queue'
}

type UseColumnVisibilityReturn = {
  visibleColumns: ColumnDef[]
  hiddenIds: string[]
  isVisible: (id: string) => boolean
  toggleColumn: (id: string) => void
  resetToDefault: () => void
  isLoaded: boolean       // API에서 로드 완료 여부
}
```

### 동작 흐름

```
1. 초기 렌더: defaultVisible 기반으로 즉시 표시 (블로킹 없음)
2. useEffect: GET /api/user/preferences?key={preferenceKey} 호출
3. 응답 도착 → hiddenIds 업데이트 (optimistic → confirmed)
4. toggleColumn → 즉시 UI 반영 + 500ms debounce 후 PUT 호출
5. resetToDefault → 모든 컬럼 default로 복원 + PUT 호출
```

### Preference 저장 형식

```json
{
  "key": "table_columns_reports_queue",
  "value": { "version": 1, "hidden": ["updated", "resolved"] }
}
```

### useResizableColumns 연동

```
visibleColumns = getVisibleColumns(ALL_COLUMNS, hiddenIds)
{ defaultWidths, minWidths } = getVisibleColumnWidths(ALL_COLUMNS, hiddenIds)
storageKey = `reports-queue-v4-${simpleHash(visibleColumns.map(c => c.id).join(','))}`
```

storageKey에 visible 컬럼 조합 해시를 포함 → 컬럼 구성 변경 시 너비 자동 리셋.

---

## D3. ColumnVisibilityToggle 컴포넌트

### 파일: `src/components/ui/ColumnVisibilityToggle.tsx`

```
┌──────────────────────────────┐
│  ☰ Columns ▾                │  ← 버튼 (TableFilters 우측)
├──────────────────────────────┤
│  ☑ BR Case ID               │  ← 토글 가능
│  ☑ Channel                   │
│  ☑ ASIN                      │
│  ☑ Violation                 │
│  ☑ Seller                    │
│  ☑ Requester                 │
│  ☑ Date                      │
│  ☐ Updated                   │  ← 기본 숨김
│  ☐ Resolved                  │  ← 기본 숨김
│  ─────────────────────────── │
│  ↻ Reset to Default          │
└──────────────────────────────┘
```

### Props

```typescript
type ColumnVisibilityToggleProps = {
  columns: ColumnDef[]           // locked=false인 것만 표시
  hiddenIds: string[]
  onToggle: (id: string) => void
  onReset: () => void
}
```

### UI 구현

- `<button>` 클릭 시 popover 열기 (state 기반, Portal 불필요)
- 외부 클릭 시 닫기 (`useEffect` + `mousedown` 리스너)
- locked 컬럼은 목록에 표시하지 않음
- 체크박스는 `checked={!hiddenIds.includes(col.id)}`

---

## D4. ReportsContent.tsx 수정 사항

### 4.1 BR Case ID 독립 컬럼

**Status 컬럼 (변경 전)**:
```tsx
<td className="px-4 py-3.5">
  <div className="flex flex-col">
    <StatusBadge status={report.status} type="report" />
    {report.br_case_id && (
      <a href={...} className="mt-0.5 font-mono text-[10px]">BR#{report.br_case_id}</a>
    )}
  </div>
</td>
```

**변경 후**: Status에서 br_case_id 링크 제거, 새 컬럼 추가:
```tsx
{/* Status 컬럼 — br_case_id 제거 */}
<td><StatusBadge status={report.status} type="report" /></td>

{/* BR Case ID 독립 컬럼 (새로 추가) */}
<td className="px-4 py-3.5">
  {report.br_case_id && report.br_case_id !== 'submitted' ? (
    <a href={`https://brandregistry.amazon.com/cu/case-dashboard/view-case?caseID=${report.br_case_id}`}
       target="_blank" rel="noopener noreferrer"
       className="font-mono text-xs text-th-accent hover:underline"
       onClick={(e) => e.stopPropagation()}>
      BR#{report.br_case_id}
    </a>
  ) : '—'}
</td>
```

### 4.2 Visibility 적용

**colgroup**: visible 컬럼만 렌더링
```tsx
<colgroup>
  {visibleColumns.map((col, i) => (
    <col key={col.id} style={getColStyle(i)} />
  ))}
</colgroup>
```

**thead**: visible 컬럼만 렌더링 (id 기반 매핑)
```tsx
{visibleColumns.map((col, i) => (
  col.sortField
    ? <SortableHeader key={col.id} label={t(col.labelKey)} field={col.sortField} ...>
        <div {...getResizeHandleProps(i)} />
      </SortableHeader>
    : <th key={col.id} ...>{col.labelKey}<div {...getResizeHandleProps(i)} /></th>
))}
```

**tbody**: 각 row에서 visible 컬럼만 렌더링
```tsx
// 컬럼 ID → 셀 렌더 함수 매핑
const cellRenderers: Record<string, (report: ReportRow) => ReactNode> = {
  checkbox: (r) => <input type="checkbox" .../>,
  no: (r) => <span>{String(r.report_number).padStart(5, '0')}</span>,
  status: (r) => <StatusBadge status={r.status} type="report" />,
  br_case_id: (r) => r.br_case_id ? <a ...>BR#{r.br_case_id}</a> : '—',
  channel: (r) => getChannelCode(r.listings?.marketplace),
  // ... 나머지 컬럼
}

// 렌더링
{visibleColumns.map((col) => (
  <td key={col.id} className="px-4 py-3.5">
    {cellRenderers[col.id]?.(report)}
  </td>
))}
```

**colSpan**: empty state에서 `visibleColumns.length` 사용
```tsx
<td colSpan={visibleColumns.length}>No results</td>
```

### 4.3 TableFilters 영역에 Toggle 배치

```tsx
<div className="flex items-center gap-3">
  <TableFilters filters={filters} onFiltersChange={handleFiltersChange} showMarketplace={false} />
  <ColumnVisibilityToggle
    columns={REPORT_QUEUE_COLUMNS}
    hiddenIds={hiddenIds}
    onToggle={toggleColumn}
    onReset={resetToDefault}
  />
</div>
```

---

## D5. CompletedReportsContent.tsx 수정 사항

REPORT_QUEUE_COLUMNS과 동일한 컬럼 구조 사용 (COMPLETED_COLUMNS).
차이점: checkbox는 `canBulk` 조건부.
useColumnVisibility의 preferenceKey = `table_columns_reports_completed`.

---

## D6. ArchivedReportsContent.tsx 수정 사항

ARCHIVED_COLUMNS 사용 (별도 컬럼 구조).
useColumnVisibility의 preferenceKey = `table_columns_reports_archived`.

---

## D7. 구현 순서

| Step | 파일 | 내용 |
|------|------|------|
| 1 | `src/constants/table-columns.ts` | 컬럼 정의 + 유틸 함수 |
| 2 | `src/hooks/useColumnVisibility.ts` | visibility 상태 관리 + API 연동 |
| 3 | `src/components/ui/ColumnVisibilityToggle.tsx` | 드롭다운 UI |
| 4 | `src/app/(protected)/reports/ReportsContent.tsx` | BR Case ID 분리 + visibility 적용 |
| 5 | `src/app/(protected)/reports/completed/CompletedReportsContent.tsx` | visibility 적용 |
| 6 | `src/app/(protected)/reports/archived/ArchivedReportsContent.tsx` | visibility 적용 |
| 7 | typecheck + lint + build 검증 | — |

---

## D8. 영향 범위

| 구분 | 파일 |
|------|------|
| 신규 생성 (3) | `constants/table-columns.ts`, `hooks/useColumnVisibility.ts`, `components/ui/ColumnVisibilityToggle.tsx` |
| 수정 (3) | `ReportsContent.tsx`, `CompletedReportsContent.tsx`, `ArchivedReportsContent.tsx` |
| DB 변경 | 없음 (user_preferences 테이블 기존 활용) |
| API 변경 | 없음 (GET/PUT /api/user/preferences 기존 활용) |

---

## D9. 위험 요소

| 위험 | 대응 |
|------|------|
| useResizableColumns widths 배열 길이 불일치 | storageKey에 visible 컬럼 해시 포함 → 변경 시 자동 리셋 |
| colSpan 불일치 (empty row) | `visibleColumns.length` 동적 계산 |
| API 호출 과다 | 500ms debounce |
| 첫 로드 시 깜빡임 | defaultVisible 기반 즉시 렌더, API 응답 후 조용히 업데이트 |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-03-17 | Initial design |
