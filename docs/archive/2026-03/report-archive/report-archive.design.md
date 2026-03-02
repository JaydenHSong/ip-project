# Report Archive + Grid Sorting/Filtering Design Document

> **Summary**: 신고 강제 Archive + 테이블 솔팅/필터링/ASIN 검색 상세 설계
>
> **Project**: Sentinel
> **Author**: Claude (PDCA)
> **Date**: 2026-03-02
> **Status**: Draft
> **Version**: 0.1
> **Plan Reference**: `docs/01-plan/features/report-archive.plan.md`

---

## 1. Architecture Overview

### 1.1 Component Architecture

```
[Archive Feature]
  ├─ Sidebar.tsx — "Archived Reports" 메뉴 추가
  ├─ ReportActions.tsx — "Force Archive" 버튼 + Archive Modal
  ├─ /reports/archived/page.tsx — Server Component
  └─ /reports/archived/ArchivedReportsContent.tsx — Client Component

[Sorting/Filtering Feature]
  ├─ hooks/useSortableTable.ts — 정렬 로직
  ├─ hooks/useFilterableTable.ts — 필터링 로직
  ├─ components/ui/SortableHeader.tsx — 클릭 가능 <th>
  ├─ components/ui/TableFilters.tsx — 검색바 + 드롭다운
  ├─ ReportsContent.tsx — 솔팅/필터 통합
  ├─ CompletedReportsContent.tsx — 솔팅/필터 통합
  └─ ArchivedReportsContent.tsx — 솔팅/필터 내장
```

---

## 2. Data Models

### 2.1 Report Type 변경

```typescript
// src/types/reports.ts — 변경사항

export const REPORT_STATUSES = [
  'draft', 'pending_review', 'approved', 'rejected', 'cancelled',
  'submitted', 'monitoring', 'resolved', 'unresolved',
  'resubmitted', 'escalated',
  'archived',  // ← 추가
] as const

// Report 타입에 필드 추가 (기존 필드 아래)
// archived_at: string | null
// archive_reason: string | null
// pre_archive_status: ReportStatus | null  // unarchive 시 복원용
```

### 2.2 Sorting Types

```typescript
// src/types/table.ts — 신규

export type SortDirection = 'asc' | 'desc'

export type SortState<T extends string = string> = {
  field: T
  direction: SortDirection
}
```

### 2.3 Filter Types

```typescript
// src/types/table.ts에 추가

export type TableFilters = {
  search: string              // ASIN/Title/Seller 통합 검색
  violationType: string       // '' | 'V01' | ... | 'V19'
  marketplace: string         // '' | 'US' | 'JP' | ...
}
```

---

## 3. Component Specifications

### 3.1 SortableHeader

**파일**: `src/components/ui/SortableHeader.tsx`

```typescript
type SortableHeaderProps = {
  label: string
  field: string
  currentSort: SortState
  onSort: (field: string) => void
  className?: string
}
```

**렌더링**:
```html
<th>
  <button onClick={() => onSort(field)} className="flex items-center gap-1">
    {label}
    {currentSort.field === field ? (
      currentSort.direction === 'asc' ? <ChevronUp /> : <ChevronDown />
    ) : (
      <ChevronsUpDown className="opacity-30" />  <!-- 비활성 표시 -->
    )}
  </button>
</th>
```

- 현재 정렬 컬럼: 파란색 화살표
- 비정렬 컬럼: 회색 ⇅ (양방향 화살표)
- 같은 컬럼 재클릭: asc ↔ desc 토글
- 다른 컬럼 클릭: 해당 컬럼 desc로 시작

### 3.2 TableFilters

**파일**: `src/components/ui/TableFilters.tsx`

```typescript
type TableFiltersProps = {
  filters: TableFilters
  onFiltersChange: (filters: TableFilters) => void
  showViolationType?: boolean   // default true
  showMarketplace?: boolean     // default true
}
```

**레이아웃**:
```
┌─────────────────────────────────────────────────────────┐
│ [🔍 Search ASIN...          ] [Violation ▾] [Market ▾] │
└─────────────────────────────────────────────────────────┘
```

- 검색: `<Input>` placeholder="Search ASIN..." + 돋보기 아이콘
- ASIN 검색이 기본 — placeholder에 ASIN 강조
- 검색은 ASIN, Title, Seller를 동시에 매칭 (OR 검색)
- 위반 유형: `<select>` All / V01~V19
- Marketplace: `<select>` All / US / JP / UK / DE / ...
- 모바일에서는 검색바 전체 너비 + 필터 드롭다운 아래줄

### 3.3 useSortableTable Hook

**파일**: `src/hooks/useSortableTable.ts`

```typescript
const useSortableTable = <T>(
  data: T[],
  defaultSort: SortState,
  getSortValue: (item: T, field: string) => string | number | null,
): {
  sortedData: T[]
  sort: SortState
  toggleSort: (field: string) => void
}
```

**정렬 로직**:
- `string`: localeCompare
- `number`: 숫자 비교
- `null`: 항상 마지막
- 안정 정렬 (같은 값이면 원래 순서 유지)

### 3.4 useFilterableTable Hook

**파일**: `src/hooks/useFilterableTable.ts`

```typescript
const useFilterableTable = <T>(
  data: T[],
  filters: TableFilters,
  getSearchableText: (item: T) => string,
  getViolationType: (item: T) => string,
  getMarketplace: (item: T) => string,
): T[]
```

**필터 로직**:
- `search`: `getSearchableText(item).toLowerCase().includes(search.toLowerCase())`
- `violationType`: 정확히 일치 (`item.violationType === filter`)
- `marketplace`: 정확히 일치
- 모든 필터 AND 조합

### 3.5 ReportActions — Archive 버튼 추가

**파일**: `src/app/(protected)/reports/[id]/ReportActions.tsx` — 수정

추가 상태:
```typescript
const [showArchiveModal, setShowArchiveModal] = useState(false)
const [archiveReason, setArchiveReason] = useState('')
```

버튼 조건:
```typescript
{['monitoring', 'unresolved', 'resolved'].includes(status) && (
  <Button variant="outline" size="sm" onClick={() => setShowArchiveModal(true)}>
    {t('reports.detail.forceArchive')}
  </Button>
)}

{status === 'archived' && (
  <Button variant="outline" size="sm" onClick={handleUnarchive}>
    {t('reports.detail.unarchive')}
  </Button>
)}
```

Archive Modal:
```html
<Modal title="Force Archive">
  <p>이 리포트를 Archive하면 모니터링이 중단됩니다.</p>
  <Textarea label="Archive 사유" value={archiveReason} ... />
  <Button onClick={handleArchive}>Archive</Button>
</Modal>
```

### 3.6 Sidebar — Archived Reports 메뉴

**파일**: `src/components/layout/Sidebar.tsx`

```typescript
import { Archive } from 'lucide-react'

const MAIN_NAV: NavItem[] = [
  { labelKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { labelKey: 'nav.campaigns', href: '/campaigns', icon: Search },
  { labelKey: 'nav.reportQueue', href: '/reports', icon: FileWarning },
  { labelKey: 'nav.completedReports', href: '/reports/completed', icon: CheckCircle2 },
  { labelKey: 'nav.archivedReports', href: '/reports/archived', icon: Archive },  // ← 추가
  { labelKey: 'nav.patents', href: '/patents', icon: BookOpen, milestone: 2 },
]
```

### 3.7 ArchivedReportsContent

**파일**: `src/app/(protected)/reports/archived/ArchivedReportsContent.tsx`

CompletedReportsContent와 동일한 패턴, 차이점:
- "Unarchive" 버튼이 각 행에 표시
- `archive_reason` 컬럼 추가
- `archived_at` 날짜 표시
- SortableHeader + TableFilters 내장

**테이블 컬럼**:
| Violation | ASIN | Title | Archive Reason | Archived At | Action |
|-----------|------|-------|----------------|-------------|--------|

### 3.8 Archived Reports Page

**파일**: `src/app/(protected)/reports/archived/page.tsx`

```typescript
// Server Component
// Demo mode: DEMO_REPORTS.filter(r => r.status === 'archived')
// Supabase: SELECT * FROM reports WHERE status = 'archived' ORDER BY archived_at DESC
```

---

## 4. API Design

### 4.1 Archive Report

**엔드포인트**: `POST /api/reports/[id]/archive`

**Request Body**:
```json
{
  "archive_reason": "모니터링 60일 경과, 변화 없음"
}
```

**로직**:
1. 현재 status가 `monitoring`, `unresolved`, `resolved` 중 하나인지 확인
2. `pre_archive_status` = 현재 status 저장
3. status → `archived`
4. `archived_at` = now
5. `archive_reason` = request body

**Response**: `{ success: true }`

**Demo Mode**: router.refresh() (상태 변경 모의)

### 4.2 Unarchive Report

**엔드포인트**: `POST /api/reports/[id]/unarchive`

**로직**:
1. 현재 status가 `archived`인지 확인
2. status → `pre_archive_status` (복원)
3. `archived_at` = null
4. `archive_reason` = null
5. `pre_archive_status` = null

**Response**: `{ success: true }`

---

## 5. Demo Data 변경

### 5.1 DEMO_REPORTS 추가

`src/lib/demo/data.ts`에 Archive 샘플 1건 추가:

```typescript
{
  id: 'rpt-007',
  listing_id: 'list-003',
  status: 'archived',
  violation_type: 'V06',
  // ...
  archived_at: '2026-02-28T10:00:00.000Z',
  archive_reason: 'Monitoring 60 days - no seller response, low priority',
  pre_archive_status: 'unresolved',
}
```

### 5.2 StatusBadge Archive 색상

`src/components/ui/StatusBadge.tsx`에 archived 추가:
- 색상: gray (취소와 동일 톤, 약간 다른 아이콘)
- 라벨: "Archived"

---

## 6. i18n Keys

### 6.1 English

```typescript
nav: {
  archivedReports: 'Archived Reports',
},
reports: {
  archivedTitle: 'Archived Reports',
  noArchived: 'No archived reports.',
  tabs: {
    archived: 'Archived',
  },
  detail: {
    forceArchive: 'Force Archive',
    unarchive: 'Unarchive',
    archiveConfirm: 'This will stop monitoring and archive the report. Continue?',
    archiveReason: 'Archive Reason',
    archiveReasonPlaceholder: 'e.g., No change after 60 days monitoring',
    unarchiveConfirm: 'Restore this report to its previous status?',
    archivedAt: 'Archived At',
  },
},
table: {
  search: 'Search ASIN...',
  searchPlaceholder: 'Search by ASIN, title, or seller...',
  violationType: 'Violation Type',
  marketplace: 'Marketplace',
  allTypes: 'All Types',
  allMarketplaces: 'All Marketplaces',
  sortAsc: 'Sort ascending',
  sortDesc: 'Sort descending',
  noResults: 'No matching results.',
},
```

### 6.2 Korean

```typescript
nav: {
  archivedReports: 'Archive',
},
reports: {
  archivedTitle: 'Archive된 신고',
  noArchived: 'Archive된 신고가 없습니다.',
  tabs: {
    archived: 'Archive',
  },
  detail: {
    forceArchive: '강제 Archive',
    unarchive: '복원',
    archiveConfirm: '모니터링이 중단되고 Archive됩니다. 계속할까요?',
    archiveReason: 'Archive 사유',
    archiveReasonPlaceholder: '예: 모니터링 60일 경과, 변화 없음',
    unarchiveConfirm: '이 신고를 이전 상태로 복원할까요?',
    archivedAt: 'Archive 일시',
  },
},
table: {
  search: 'ASIN 검색...',
  searchPlaceholder: 'ASIN, 제목, 판매자로 검색...',
  violationType: '위반 유형',
  marketplace: '마켓플레이스',
  allTypes: '전체 유형',
  allMarketplaces: '전체 마켓',
  sortAsc: '오름차순 정렬',
  sortDesc: '내림차순 정렬',
  noResults: '검색 결과가 없습니다.',
},
```

---

## 7. Implementation Order

### Phase A: Types + Archive API (~80 LoC)
1. `src/types/reports.ts` — `archived` status, archive 필드
2. `src/types/table.ts` — SortState, TableFilters 타입 (신규)
3. `src/app/api/reports/[id]/archive/route.ts` (신규)
4. `src/app/api/reports/[id]/unarchive/route.ts` (신규)

### Phase B: Sortable/Filterable 공통 컴포넌트 (~200 LoC)
5. `src/hooks/useSortableTable.ts` (신규)
6. `src/hooks/useFilterableTable.ts` (신규)
7. `src/components/ui/SortableHeader.tsx` (신규)
8. `src/components/ui/TableFilters.tsx` (신규)

### Phase C: Archive UI (~180 LoC)
9. `src/components/layout/Sidebar.tsx` — Archive 메뉴 추가
10. `src/components/ui/StatusBadge.tsx` — archived 색상
11. `src/app/(protected)/reports/[id]/ReportActions.tsx` — Archive/Unarchive 버튼
12. `src/app/(protected)/reports/archived/page.tsx` (신규)
13. `src/app/(protected)/reports/archived/ArchivedReportsContent.tsx` (신규)
14. Demo 데이터 추가

### Phase D: Grid 솔팅/필터 적용 (~150 LoC)
15. `src/app/(protected)/reports/ReportsContent.tsx` — 솔팅/필터 통합
16. `src/app/(protected)/reports/completed/CompletedReportsContent.tsx` — 솔팅/필터 통합

### Phase E: i18n (~60 LoC)
17. `src/lib/i18n/locales/en.ts` — 번역 키
18. `src/lib/i18n/locales/ko.ts` — 번역 키

**총 예상**: ~670 LoC (8 신규 + 10 수정)

---

## 8. File List

| # | File | Action | LoC |
|---|------|--------|-----|
| 1 | `src/types/reports.ts` | MODIFY | ~10 delta |
| 2 | `src/types/table.ts` | CREATE | ~15 |
| 3 | `src/app/api/reports/[id]/archive/route.ts` | CREATE | ~40 |
| 4 | `src/app/api/reports/[id]/unarchive/route.ts` | CREATE | ~40 |
| 5 | `src/hooks/useSortableTable.ts` | CREATE | ~45 |
| 6 | `src/hooks/useFilterableTable.ts` | CREATE | ~30 |
| 7 | `src/components/ui/SortableHeader.tsx` | CREATE | ~40 |
| 8 | `src/components/ui/TableFilters.tsx` | CREATE | ~80 |
| 9 | `src/components/layout/Sidebar.tsx` | MODIFY | ~3 delta |
| 10 | `src/components/ui/StatusBadge.tsx` | MODIFY | ~5 delta |
| 11 | `src/app/(protected)/reports/[id]/ReportActions.tsx` | MODIFY | ~60 delta |
| 12 | `src/app/(protected)/reports/archived/page.tsx` | CREATE | ~60 |
| 13 | `src/app/(protected)/reports/archived/ArchivedReportsContent.tsx` | CREATE | ~120 |
| 14 | `src/lib/demo/data.ts` | MODIFY | ~20 delta |
| 15 | `src/app/(protected)/reports/ReportsContent.tsx` | MODIFY | ~60 delta |
| 16 | `src/app/(protected)/reports/completed/CompletedReportsContent.tsx` | MODIFY | ~50 delta |
| 17 | `src/lib/i18n/locales/en.ts` | MODIFY | ~30 delta |
| 18 | `src/lib/i18n/locales/ko.ts` | MODIFY | ~30 delta |
| **Total** | | **8 CREATE + 10 MODIFY** | **~670** |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-02 | Initial design | Claude (PDCA) |
