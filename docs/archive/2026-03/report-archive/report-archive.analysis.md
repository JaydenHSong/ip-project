# report-archive Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: Sentinel
> **Version**: 0.1
> **Analyst**: Claude (gap-detector)
> **Date**: 2026-03-02
> **Design Doc**: [report-archive.design.md](../02-design/features/report-archive.design.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Compare the Report Archive + Grid Sorting/Filtering design document against the actual implementation code to verify completeness and correctness. This is the PDCA Check phase for the report-archive feature.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/report-archive.design.md`
- **Implementation Files**: 18 files (8 CREATE + 10 MODIFY)
- **Analysis Date**: 2026-03-02

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 File Existence Check

| # | File | Action | Design | Impl | Status |
|---|------|--------|:------:|:----:|:------:|
| 1 | `src/types/table.ts` | CREATE | O | O | Match |
| 2 | `src/app/api/reports/[id]/archive/route.ts` | CREATE | O | O | Match |
| 3 | `src/app/api/reports/[id]/unarchive/route.ts` | CREATE | O | O | Match |
| 4 | `src/hooks/useSortableTable.ts` | CREATE | O | O | Match |
| 5 | `src/hooks/useFilterableTable.ts` | CREATE | O | O | Match |
| 6 | `src/components/ui/SortableHeader.tsx` | CREATE | O | O | Match |
| 7 | `src/components/ui/TableFilters.tsx` | CREATE | O | O | Match |
| 8 | `src/app/(protected)/reports/archived/page.tsx` | CREATE | O | O | Match |
| 9 | `src/app/(protected)/reports/archived/ArchivedReportsContent.tsx` | CREATE | O | O | Match |
| 10 | `src/types/reports.ts` | MODIFY | O | O | Match |
| 11 | `src/components/ui/StatusBadge.tsx` | MODIFY | O | O | Match |
| 12 | `src/components/layout/Sidebar.tsx` | MODIFY | O | O | Match |
| 13 | `src/app/(protected)/reports/[id]/ReportActions.tsx` | MODIFY | O | O | Match |
| 14 | `src/lib/demo/data.ts` | MODIFY | O | O | Match |
| 15 | `src/app/(protected)/reports/ReportsContent.tsx` | MODIFY | O | O | Match |
| 16 | `src/app/(protected)/reports/completed/CompletedReportsContent.tsx` | MODIFY | O | O | Match |
| 17 | `src/lib/i18n/locales/en.ts` | MODIFY | O | O | Match |
| 18 | `src/lib/i18n/locales/ko.ts` | MODIFY | O | O | Match |

**File existence: 18/18 (100%)**

---

### 2.2 Types (Design Section 2)

#### 2.2.1 Report Type Changes (`src/types/reports.ts`)

| Spec Item | Design | Implementation | Status |
|-----------|--------|----------------|:------:|
| `'archived'` in REPORT_STATUSES | yes | yes (line 6) | Match |
| `archived_at` field in Report type | `string \| null` | NOT present | Missing |
| `archive_reason` field in Report type | `string \| null` | NOT present | Missing |
| `pre_archive_status` field in Report type | `ReportStatus \| null` | NOT present | Missing |

**Notes**: The `REPORT_STATUSES` array correctly includes `'archived'`, but the `Report` type definition (lines 37-100) does not include the three archive-related fields (`archived_at`, `archive_reason`, `pre_archive_status`). These fields are used in demo data and API routes via ad-hoc typing (e.g., `Record<string, unknown>` cast in `page.tsx` line 30-31), so the feature works, but the canonical type is incomplete.

#### 2.2.2 Sort Types (`src/types/table.ts`)

| Spec Item | Design | Implementation | Status |
|-----------|--------|----------------|:------:|
| `SortDirection` type | `'asc' \| 'desc'` | `'asc' \| 'desc'` | Match |
| `SortState<T>` type | `{ field: T, direction: SortDirection }` | `{ field: T, direction: SortDirection }` | Match |
| Generic default `T extends string = string` | yes | yes | Match |

#### 2.2.3 Filter Types (`src/types/table.ts`)

| Spec Item | Design | Implementation | Status |
|-----------|--------|----------------|:------:|
| `TableFilters.search` | `string` | `string` | Match |
| `TableFilters.violationType` | `string` | `string` | Match |
| `TableFilters.marketplace` | `string` | `string` | Match |

**Types score: 7/10 items match (3 fields missing from Report type)**

---

### 2.3 API Endpoints (Design Section 4)

#### 2.3.1 POST /api/reports/[id]/archive

| Spec Item | Design | Implementation | Status |
|-----------|--------|----------------|:------:|
| HTTP Method | POST | POST | Match |
| Route path | `/api/reports/[id]/archive` | `/api/reports/[id]/archive` | Match |
| Request body: `archive_reason` | yes | yes (line 16) | Match |
| Auth check (editor+) | yes | yes (lines 10-13, `hasRole(user, 'editor')`) | Match |
| Status validation: monitoring/unresolved/resolved | yes | yes (line 35) | Match |
| Save `pre_archive_status` | yes | yes (line 45) | Match |
| Set status to `archived` | yes | yes (line 46) | Match |
| Set `archived_at` to now | yes | yes (line 47) | Match |
| Set `archive_reason` from body | yes | yes (line 48) | Match |
| Response: `{ success: true }` | yes | yes (line 56) | Match |
| Demo mode handling | yes | yes (lines 18-20) | Match |
| 404 when report not found | yes | yes (lines 31-33) | Match |
| 400 when status invalid | yes | yes (lines 35-39) | Match |

#### 2.3.2 POST /api/reports/[id]/unarchive

| Spec Item | Design | Implementation | Status |
|-----------|--------|----------------|:------:|
| HTTP Method | POST | POST | Match |
| Route path | `/api/reports/[id]/unarchive` | `/api/reports/[id]/unarchive` | Match |
| Auth check (editor+) | yes | yes (lines 10-13) | Match |
| Status validation: `archived` only | yes | yes (lines 33-38) | Match |
| Restore to `pre_archive_status` | yes | yes (line 40, with fallback to `'monitoring'`) | Match |
| Clear `archived_at` to null | yes | yes (line 45) | Match |
| Clear `archive_reason` to null | yes | yes (line 46) | Match |
| Clear `pre_archive_status` to null | yes | yes (line 47) | Match |
| Response: `{ success: true }` | yes | yes (line 56) | Match |
| Demo mode handling | yes | yes (lines 17-19) | Match |

**API score: 23/23 items match (100%)**

---

### 2.4 Component Specifications (Design Section 3)

#### 2.4.1 SortableHeader (`src/components/ui/SortableHeader.tsx`)

| Spec Item | Design | Implementation | Status |
|-----------|--------|----------------|:------:|
| Props: `label: string` | yes | yes | Match |
| Props: `field: string` | yes | yes | Match |
| Props: `currentSort: SortState` | yes | yes | Match |
| Props: `onSort: (field: string) => void` | yes | yes | Match |
| Props: `className?: string` | yes | yes | Match |
| Active sort: ChevronUp/ChevronDown | yes | yes (lines 25-29) | Match |
| Inactive: ChevronsUpDown opacity-30 | yes | yes (line 31) | Match |
| Rendered inside `<th>` | yes | yes (line 17) | Match |
| Button onClick triggers onSort | yes | yes (line 20) | Match |
| Active icon color: accent (blue) | yes | yes (`text-th-accent`, line 27/29) | Match |

#### 2.4.2 TableFilters (`src/components/ui/TableFilters.tsx`)

| Spec Item | Design | Implementation | Status |
|-----------|--------|----------------|:------:|
| Props: `filters: TableFilters` | yes | yes | Match |
| Props: `onFiltersChange: (filters: TableFilters) => void` | yes | yes | Match |
| Props: `showViolationType?: boolean` (default true) | yes | yes (line 13, default true) | Match |
| Props: `showMarketplace?: boolean` (default true) | yes | yes (line 14, default true) | Match |
| Search input with magnifying glass icon | yes | yes (SearchIcon, line 32) | Match |
| Search placeholder: uses i18n `searchPlaceholder` | yes | yes (line 37) | Match |
| Violation type `<select>` with All option | yes | yes (lines 42-53) | Match |
| Marketplace `<select>` with All option | yes | yes (lines 55-65) | Match |
| Mobile responsive (flex-col on sm) | yes | yes (line 30: `flex-col gap-3 sm:flex-row`) | Match |
| `'use client'` directive | yes | yes (line 1) | Match |

#### 2.4.3 useSortableTable Hook (`src/hooks/useSortableTable.ts`)

| Spec Item | Design | Implementation | Status |
|-----------|--------|----------------|:------:|
| Signature: `<T>(data, defaultSort, getSortValue)` | yes | yes (lines 4-7) | Match |
| Returns: `{ sortedData, sort, toggleSort }` | yes | yes (lines 8-11) | Match |
| Same column re-click: toggle asc/desc | yes | yes (line 18) | Match |
| Different column click: start with desc | yes | yes (line 20) | Match |
| String sorting: localeCompare | yes | yes (line 35) | Match |
| Number sorting: numeric comparison | yes | yes (line 37) | Match |
| Null values: always last | yes | yes (lines 29-31) | Match |
| Stable sort (same values keep order) | yes | yes (JS .sort is stable in modern engines) | Match |

#### 2.4.4 useFilterableTable Hook (`src/hooks/useFilterableTable.ts`)

| Spec Item | Design | Implementation | Status |
|-----------|--------|----------------|:------:|
| Signature: `<T>(data, filters, getSearchableText, getViolationType, getMarketplace)` | yes | yes (lines 4-9) | Match |
| Returns: `T[]` | yes | yes (line 10) | Match |
| Search: case-insensitive includes | yes | yes (lines 14-17) | Match |
| Violation type: exact match | yes | yes (lines 20-22) | Match |
| Marketplace: exact match | yes | yes (lines 24-26) | Match |
| All filters AND combination | yes | yes (sequential filter) | Match |

#### 2.4.5 ReportActions Archive Buttons (`src/app/(protected)/reports/[id]/ReportActions.tsx`)

| Spec Item | Design | Implementation | Status |
|-----------|--------|----------------|:------:|
| `showArchiveModal` state | yes | yes (line 37) | Match |
| `archiveReason` state | yes | yes (line 44) | Match |
| Force Archive button for: monitoring/unresolved/resolved | yes | yes (line 419) | Match |
| Unarchive button for: archived | yes | yes (line 428) | Match |
| Archive Modal with title "Force Archive" | yes | yes (lines 595-598) | Match |
| Modal description text (archiveConfirm) | yes | yes (line 601) | Match |
| Textarea for archive reason | yes | yes (lines 603-608) | Match |
| Archive button in modal | yes | yes (lines 614-621) | Match |
| handleArchive: POST /api/reports/[id]/archive | yes | yes (lines 255-275) | Match |
| handleUnarchive: POST /api/reports/[id]/unarchive | yes | yes (lines 277-291) | Match |

#### 2.4.6 Sidebar (`src/components/layout/Sidebar.tsx`)

| Spec Item | Design | Implementation | Status |
|-----------|--------|----------------|:------:|
| Import Archive icon from lucide-react | yes | yes (line 11) | Match |
| Nav item: `labelKey: 'nav.archivedReports'` | yes | yes (line 35) | Match |
| Nav item: `href: '/reports/archived'` | yes | yes (line 35) | Match |
| Nav item: `icon: Archive` | yes | yes (line 35) | Match |
| Position: after Completed Reports | yes | yes (index 4 in MAIN_NAV) | Match |
| Before Patents | yes | yes (Patents at index 5) | Match |

#### 2.4.7 StatusBadge (`src/components/ui/StatusBadge.tsx`)

| Spec Item | Design | Implementation | Status |
|-----------|--------|----------------|:------:|
| `'archived'` in ReportStatus type | yes | yes (line 15) | Match |
| archived mapping in REPORT_STATUS_MAP | yes | yes (line 31) | Match |
| Label: 'Archived' | yes | yes (line 31) | Match |
| Variant: 'default' (gray) | yes | yes (line 31) | Match |

#### 2.4.8 ArchivedReportsContent (`src/app/(protected)/reports/archived/ArchivedReportsContent.tsx`)

| Spec Item | Design | Implementation | Status |
|-----------|--------|----------------|:------:|
| Client component (`'use client'`) | yes | yes (line 1) | Match |
| Unarchive button on each row | yes | yes (lines 119-126, 191-199) | Match |
| `archive_reason` column | yes | yes (line 184) | Match |
| `archived_at` date display | yes | yes (line 188) | Match |
| SortableHeader integrated | yes | yes (lines 139-153) | Match |
| TableFilters integrated | yes | yes (line 88) | Match |
| Table columns: Violation/ASIN/Title/ArchiveReason/ArchivedAt/Action | yes | yes (lines 139-158) | Match |
| No results message with filter awareness | yes | yes (lines 93-96, 163-167) | Match |
| Mobile card view | yes | yes (lines 91-132) | Match |
| Desktop table view | yes | yes (lines 135-207) | Match |

#### 2.4.9 Archived Reports Page (`src/app/(protected)/reports/archived/page.tsx`)

| Spec Item | Design | Implementation | Status |
|-----------|--------|----------------|:------:|
| Server Component (no `'use client'`) | yes | yes | Match |
| Demo mode: filter DEMO_REPORTS by status=archived | yes | yes (line 25) | Match |
| Supabase: SELECT WHERE status=archived ORDER BY archived_at DESC | yes | yes (lines 36-40) | Match |
| Auth redirect | yes | yes (lines 19-20) | Match |

**Component score: 63/63 items match (100%)**

---

### 2.5 Demo Data (Design Section 5)

| Spec Item | Design | Implementation | Status |
|-----------|--------|----------------|:------:|
| Report id: 'rpt-007' | yes | yes (line 296) | Match |
| listing_id: 'list-003' | yes | yes (line 297) | Match |
| status: 'archived' | yes | yes (line 298) | Match |
| violation_type: 'V06' | yes | yes (line 299) | Match |
| archived_at: '2026-02-28T10:00:00.000Z' | yes | yes (line 316) | Match |
| archive_reason: matches design text | yes | yes (line 317) | Match |
| pre_archive_status: 'unresolved' | yes | yes (line 318) | Match |

**Demo data score: 7/7 items match (100%)**

---

### 2.6 i18n Keys (Design Section 6)

#### 2.6.1 English (`src/lib/i18n/locales/en.ts`)

| Key | Design Value | Impl Value | Status |
|-----|-------------|------------|:------:|
| `nav.archivedReports` | 'Archived Reports' | 'Archived Reports' (line 7) | Match |
| `reports.archivedTitle` | 'Archived Reports' | 'Archived Reports' (line 104) | Match |
| `reports.noArchived` | 'No archived reports.' | 'No archived reports.' (line 105) | Match |
| `reports.tabs.archived` | 'Archived' | NOT present | Missing |
| `reports.detail.forceArchive` | 'Force Archive' | 'Force Archive' (line 172) | Match |
| `reports.detail.unarchive` | 'Unarchive' | 'Unarchive' (line 173) | Match |
| `reports.detail.archiveConfirm` | matches | matches (line 174) | Match |
| `reports.detail.archiveReason` | 'Archive Reason' | 'Archive Reason' (line 175) | Match |
| `reports.detail.archiveReasonPlaceholder` | matches | matches (line 176) | Match |
| `reports.detail.unarchiveConfirm` | matches | matches (line 177) | Match |
| `reports.detail.archivedAt` | 'Archived At' | 'Archived At' (line 178) | Match |
| `table.search` | 'Search ASIN...' | 'Search ASIN...' (line 273) | Match |
| `table.searchPlaceholder` | matches | matches (line 274) | Match |
| `table.violationType` | 'Violation Type' | 'Violation Type' (line 275) | Match |
| `table.marketplace` | 'Marketplace' | 'Marketplace' (line 276) | Match |
| `table.allTypes` | 'All Types' | 'All Types' (line 277) | Match |
| `table.allMarketplaces` | 'All Marketplaces' | 'All Marketplaces' (line 278) | Match |
| `table.sortAsc` | 'Sort ascending' | 'Sort ascending' (line 279) | Match |
| `table.sortDesc` | 'Sort descending' | 'Sort descending' (line 280) | Match |
| `table.noResults` | 'No matching results.' | 'No matching results.' (line 281) | Match |

#### 2.6.2 Korean (`src/lib/i18n/locales/ko.ts`)

| Key | Design Value | Impl Value | Status |
|-----|-------------|------------|:------:|
| `nav.archivedReports` | 'Archive' | 'Archive' (line 7) | Match |
| `reports.archivedTitle` | 'Archive된 신고' | 'Archive된 신고' (line 104) | Match |
| `reports.noArchived` | 'Archive된 신고가 없습니다.' | 'Archive된 신고가 없습니다.' (line 105) | Match |
| `reports.tabs.archived` | 'Archive' | NOT present | Missing |
| `reports.detail.forceArchive` | '강제 Archive' | '강제 Archive' (line 172) | Match |
| `reports.detail.unarchive` | '복원' | '복원' (line 173) | Match |
| `reports.detail.archiveConfirm` | matches | matches (line 174) | Match |
| `reports.detail.archiveReason` | 'Archive 사유' | 'Archive 사유' (line 175) | Match |
| `reports.detail.archiveReasonPlaceholder` | matches | matches (line 176) | Match |
| `reports.detail.unarchiveConfirm` | matches | matches (line 177) | Match |
| `reports.detail.archivedAt` | 'Archive 일시' | 'Archive 일시' (line 178) | Match |
| `table.search` | 'ASIN 검색...' | 'ASIN 검색...' (line 273) | Match |
| `table.searchPlaceholder` | matches | matches (line 274) | Match |
| `table.violationType` | '위반 유형' | '위반 유형' (line 275) | Match |
| `table.marketplace` | '마켓플레이스' | '마켓플레이스' (line 276) | Match |
| `table.allTypes` | '전체 유형' | '전체 유형' (line 277) | Match |
| `table.allMarketplaces` | '전체 마켓' | '전체 마켓' (line 278) | Match |
| `table.sortAsc` | '오름차순 정렬' | '오름차순 정렬' (line 279) | Match |
| `table.sortDesc` | '내림차순 정렬' | '내림차순 정렬' (line 280) | Match |
| `table.noResults` | '검색 결과가 없습니다.' | '검색 결과가 없습니다.' (line 281) | Match |

**i18n score: 38/40 keys match (2 missing: `reports.tabs.archived` in both en.ts and ko.ts)**

---

### 2.7 Sorting/Filtering Integration (Design Section 7, Phase D)

#### 2.7.1 ReportsContent.tsx

| Spec Item | Design | Implementation | Status |
|-----------|--------|----------------|:------:|
| Import useSortableTable | yes | yes (line 12) | Match |
| Import useFilterableTable | yes | yes (line 13) | Match |
| Import SortableHeader | yes | yes (line 9) | Match |
| Import TableFilters | yes | yes (line 10) | Match |
| TableFilters state management | yes | yes (line 43) | Match |
| SortableHeader in table headers | yes | yes (lines 160-166) | Match |
| Filter-aware empty state | yes | yes (lines 124-127, 173-175) | Match |
| Mobile card view preserved | yes | yes (lines 122-153) | Match |

#### 2.7.2 CompletedReportsContent.tsx

| Spec Item | Design | Implementation | Status |
|-----------|--------|----------------|:------:|
| Import useSortableTable | yes | yes (line 10) | Match |
| Import useFilterableTable | yes | yes (line 11) | Match |
| Import SortableHeader | yes | yes (line 8) | Match |
| Import TableFilters | yes | yes (line 9) | Match |
| TableFilters state management | yes | yes (line 32) | Match |
| SortableHeader in table headers | yes | yes (lines 121-126) | Match |
| Filter-aware empty state | yes | yes (lines 92-94, 132-134) | Match |

**Integration score: 15/15 items match (100%)**

---

## 3. Match Rate Summary

```
+---------------------------------------------+
|  Overall Match Rate: 97%                     |
+---------------------------------------------+
|  Total items checked:      153               |
|  Match:                    148  (97%)        |
|  Missing from impl:         5  ( 3%)        |
|  Added beyond design:        0  ( 0%)        |
|  Changed from design:        0  ( 0%)        |
+---------------------------------------------+
```

### Category Breakdown

| Category | Items | Match | Missing | Score |
|----------|:-----:|:-----:|:-------:|:-----:|
| File Existence | 18 | 18 | 0 | 100% |
| Types | 10 | 7 | 3 | 70% |
| API Endpoints | 23 | 23 | 0 | 100% |
| Components | 63 | 63 | 0 | 100% |
| Demo Data | 7 | 7 | 0 | 100% |
| i18n Keys | 40 | 38 | 2 | 95% |
| Integration | 15 | 15 | 0 | 100% |
| **Total** | **153** | **148** | **5** | **97%** |

---

## 4. Differences Found

### 4.1 Missing Items (Design O, Implementation X)

| # | Item | Design Location | Impl File | Description | Impact |
|---|------|-----------------|-----------|-------------|--------|
| 1 | `archived_at` field | Section 2.1 line 52 | `src/types/reports.ts` | Field not added to Report type | Low |
| 2 | `archive_reason` field | Section 2.1 line 53 | `src/types/reports.ts` | Field not added to Report type | Low |
| 3 | `pre_archive_status` field | Section 2.1 line 54 | `src/types/reports.ts` | Field not added to Report type | Low |
| 4 | `reports.tabs.archived` (en) | Section 6.1 line 344 | `src/lib/i18n/locales/en.ts` | i18n key missing | Low |
| 5 | `reports.tabs.archived` (ko) | Section 6.2 line 379 | `src/lib/i18n/locales/ko.ts` | i18n key missing | Low |

### 4.2 Added Items (Design X, Implementation O)

None found.

### 4.3 Changed Items (Design != Implementation)

None found.

---

## 5. Clean Architecture Compliance

### 5.1 Layer Assignment

| Component | Designed Layer | Actual Location | Status |
|-----------|---------------|-----------------|:------:|
| SortState, TableFilters | Domain (types) | `src/types/table.ts` | Match |
| Report type | Domain (types) | `src/types/reports.ts` | Match |
| useSortableTable | Presentation (hooks) | `src/hooks/useSortableTable.ts` | Match |
| useFilterableTable | Presentation (hooks) | `src/hooks/useFilterableTable.ts` | Match |
| SortableHeader | Presentation (ui) | `src/components/ui/SortableHeader.tsx` | Match |
| TableFilters | Presentation (ui) | `src/components/ui/TableFilters.tsx` | Match |
| Archive API | Infrastructure (api) | `src/app/api/reports/[id]/archive/route.ts` | Match |
| Unarchive API | Infrastructure (api) | `src/app/api/reports/[id]/unarchive/route.ts` | Match |
| ArchivedReportsContent | Presentation (page) | `src/app/(protected)/reports/archived/` | Match |

### 5.2 Dependency Direction

All import chains follow the correct direction:
- Pages import hooks, components, types (Presentation -> Domain)
- Hooks import types only (Presentation -> Domain)
- UI components import types only (Presentation -> Domain)
- API routes import lib utilities (Infrastructure -> Domain)
- No circular dependencies detected

**Architecture Compliance: 100%**

---

## 6. Convention Compliance

### 6.1 Naming Convention

| Category | Convention | Files Checked | Compliance | Violations |
|----------|-----------|:-------------:|:----------:|:-----------|
| Components | PascalCase | 4 | 100% | None |
| Hooks | camelCase | 2 | 100% | None |
| Types | PascalCase | 4 | 100% | None |
| Files (component) | PascalCase.tsx | 4 | 100% | None |
| Files (hook) | camelCase.ts | 2 | 100% | None |
| Files (type) | camelCase.ts | 1 | 100% | None |
| Constants | UPPER_SNAKE_CASE | 2 | 100% | None |

### 6.2 Import Order

All files follow correct import order:
1. External libraries (react, next, lucide-react)
2. Internal absolute imports (@/lib, @/components, @/hooks)
3. Type imports (`import type`)

### 6.3 Code Style

- No `enum` usage (correct -- uses `as const`)
- No `any` usage
- No `console.log` statements
- No inline styles (Tailwind CSS used throughout)
- Named exports used (no default exports except page.tsx)
- Arrow function components used throughout

**Convention Compliance: 100%**

---

## 7. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 97% | Pass |
| Architecture Compliance | 100% | Pass |
| Convention Compliance | 100% | Pass |
| **Overall** | **97%** | **Pass** |

---

## 8. Recommended Actions

### 8.1 Immediate (Low Priority)

These are minor gaps that do not affect functionality but should be addressed for type completeness.

| # | Priority | Item | File | Impact |
|---|----------|------|------|--------|
| 1 | Low | Add `archived_at`, `archive_reason`, `pre_archive_status` fields to Report type | `src/types/reports.ts` | Type safety improvement; currently handled via ad-hoc casts |
| 2 | Low | Add `reports.tabs.archived` key to en.ts | `src/lib/i18n/locales/en.ts` | Key exists in design but is not currently used in UI tabs |
| 3 | Low | Add `reports.tabs.archived` key to ko.ts | `src/lib/i18n/locales/ko.ts` | Key exists in design but is not currently used in UI tabs |

### 8.2 Notes

- The 3 missing Report type fields are effectively handled in practice: the demo data includes them as plain object properties, and the API routes read/write them via Supabase. However, adding them to the canonical `Report` type would improve type safety and eliminate the `Record<string, unknown>` cast in `archived/page.tsx` line 30-31.
- The `reports.tabs.archived` i18n key appears to be designed for potential future use (e.g., if archived becomes a tab within the reports page). Since the archived reports have their own dedicated page with sidebar navigation, this key is not currently referenced in any component. It could either be added for completeness or removed from the design document.

---

## 9. Design Document Updates Needed

No updates to the design document are necessary. All 5 gaps are cases where the design specifies something that implementation has not yet added (implementation shortfall), not cases where implementation diverges from design.

---

## 10. Conclusion

The report-archive feature implementation achieves a **97% match rate** against the design document. All 18 files exist, all API endpoints are correctly implemented with proper validation and error handling, all components match their design specifications, demo data is accurate, and 38 of 40 i18n keys are present. The 5 missing items are all low-impact: 3 type fields that function via ad-hoc typing and 2 i18n keys not currently referenced in UI code.

**Recommendation**: The feature is ready for use. The 5 minor gaps can be addressed in a follow-up cleanup pass.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-02 | Initial gap analysis | Claude (gap-detector) |
