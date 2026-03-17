# Code Quality Overhaul — Gap Analysis Report

> **Feature**: code-quality-overhaul
> **Design**: `docs/02-design/features/code-quality-overhaul.design.md`
> **Analysis Date**: 2026-03-17
> **Status**: Check

---

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Phase 1: sanitizeSearchTerm | 100% | PASS |
| Phase 2: Type Safety (mapper) | 20% | FAIL |
| Phase 3: Query Separation | 50% | WARN |
| Phase 4: API Route ID Parsing | 0% | FAIL |
| Phase 5: ReportsContent Split | 33% | WARN |
| Phase 6: Code Hygiene | 67% | WARN |
| **Overall** | **45%** | FAIL |

**Match Rate = 45%** (27 / 60 items)

---

## Phase 1: sanitizeSearchTerm (9 items) -- 9/9 = 100%

| # | Item | Status | Notes |
|---|------|:------:|-------|
| 1 | `src/lib/utils/sanitize.ts` created | DONE | Matches design exactly (`\`, `%`, `_` escape) |
| 2 | `reports/page.tsx` sanitized | DONE | Query extracted to `lib/queries/reports.ts`, sanitize applied there (line 104) |
| 3 | `reports/completed/page.tsx` sanitized | DONE | Query extracted to `lib/queries/completed-reports.ts`, sanitize applied there (line 61) |
| 4 | `notices/page.tsx` sanitized | DONE | Direct import + usage (line 64) |
| 5 | `patents/page.tsx` sanitized | DONE | Direct import + usage (line 61) |
| 6 | `api/reports/route.ts` sanitized | DONE | `sanitizeSearchTerm(search)` applied (line 45) |
| 7 | `api/patents/route.ts` sanitized | DONE | Applied (line 38) |
| 8 | `api/listings/route.ts` sanitized | DONE | Applied (line 103) |
| 9 | `api/templates/route.ts` sanitized | DONE | Applied (line 56) |

---

## Phase 2: Type Safety -- mapper pattern (5 items) -- 1/5 = 20%

| # | Item | Status | Notes |
|---|------|:------:|-------|
| 1 | `src/lib/mappers/report.ts` created | FAIL | File does not exist |
| 2 | `reports/[id]/page.tsx` -- `as unknown as` removed (6 -> 0) | FAIL | 1 instance remains: `found as unknown as ReportData` (line 101, demo mode) |
| 3 | `campaigns/[id]/page.tsx` -- `as unknown as` removed | DONE | No `as unknown as` found in file |
| 4 | API routes -- `as unknown as` removed | DONE | No `as unknown as` in API routes (grep clean) |
| 5 | Other 4 files -- `as unknown as` removed | FAIL | `src/lib/ai/client.ts:81` still has `as unknown as Record<string, number>` |

**Summary**: Mapper file not created. Most `as unknown as` removals done, but 2 instances remain and the architectural approach (mapper pattern) was not adopted.

---

## Phase 3: Query Separation (8 items) -- 4/8 = 50%

| # | Item | Status | Notes |
|---|------|:------:|-------|
| 1 | `src/lib/queries/reports.ts` created | DONE | 152 lines, full query extraction with sanitize |
| 2 | `src/lib/queries/completed-reports.ts` created | DONE | 122 lines, full query extraction |
| 3 | `src/lib/queries/notices.ts` created | FAIL | Not created; `notices/page.tsx` still has ~40 lines of inline Supabase queries |
| 4 | `src/lib/queries/patents.ts` created | FAIL | Not created; `patents/page.tsx` still has ~50 lines of inline Supabase queries |
| 5 | `reports/page.tsx` uses query function | DONE | Calls `fetchReports(params, user)` (line 17) |
| 6 | `completed/page.tsx` uses query function | DONE | Calls `fetchCompletedReports(params, user)` (line 18) |
| 7 | `notices/page.tsx` uses query function | FAIL | Still uses `createAdminClient()` directly |
| 8 | `patents/page.tsx` uses query function | FAIL | Still uses `createClient()` directly |

---

## Phase 4: API Route ID Parsing (4 items) -- 0/4 = 0%

| # | Item | Status | Notes |
|---|------|:------:|-------|
| 1 | `withAuth` -- `params` added to `AuthContext` | FAIL | No `params` field in `AuthContext` type |
| 2 | `withAuth` -- accepts `routeContext` parameter | FAIL | Signature still `(req: NextRequest) => Promise<NextResponse>` |
| 3 | `withServiceAuth` / `withDualAuth` extended | FAIL | No `params` in either middleware |
| 4 | 38 API routes migrated from `pathname.split` to `params` | FAIL | 46 `pathname.split` occurrences found across API routes |

**Summary**: Phase 4 is entirely not implemented. All API routes still use `pathname.split('/')` for ID extraction.

---

## Phase 5: ReportsContent Split (6 items) -- 2/6 = 33%

| # | Item | Status | Notes |
|---|------|:------:|-------|
| 1 | `src/hooks/useBulkActions.ts` created | DONE | 80 lines, used by ReportsContent (line 148) |
| 2 | `BulkActionBar.tsx` extracted | FAIL | Not created; bulk action bar JSX still inline in ReportsContent |
| 3 | `ReportMobileCard.tsx` extracted | FAIL | Not created; mobile card rendering still inline |
| 4 | `ReportTableRow.tsx` extracted | FAIL | Not created; table row rendering still inline |
| 5 | ReportsContent uses extracted components | FAIL | No imports of sub-components |
| 6 | ReportsContent reduced to ~280 lines | DONE | 586 lines (down from 655), partially reduced via hook extraction |

**Note**: `useBulkActions` hook was created and integrated (69 line reduction). But the 3 JSX sub-components were not extracted, so ReportsContent remains at 586 lines (target: ~280).

---

## Phase 6: Code Hygiene (7 items) -- 5/7 = 71%

| # | Item | Status | Notes |
|---|------|:------:|-------|
| 1 | `reports/page.tsx` console.error removed | DONE | No console.error found (query moved to lib/) |
| 2 | `reports/completed/page.tsx` console.error removed | DONE | Clean (query moved to lib/) |
| 3 | `reports/archived/page.tsx` console.error removed | DONE | Clean |
| 4 | `campaigns/page.tsx` console.error removed | DONE | Clean |
| 5 | `audit-logs/page.tsx` console.error removed | DONE | Clean |
| 6 | ReportDetailContent inline type -> `Pick<>` | FAIL | 76-line inline type still exists (lines 34-110 in ReportDetailContent.tsx) |
| 7 | CORS origin restriction | FAIL | `middleware.ts` still has `Access-Control-Allow-Origin: '*'` (design marked nice-to-have) |

**Note**: API route console.errors (6 items in ext/crawler) correctly preserved per design decision.

---

## Score Calculation

| Phase | Total Items | Done | Partial | Not Done | Score |
|-------|:-----------:|:----:|:-------:|:--------:|:-----:|
| Phase 1 | 9 | 9 | 0 | 0 | 100% |
| Phase 2 | 5 | 2 | 0 | 3 | 40% |
| Phase 3 | 8 | 4 | 0 | 4 | 50% |
| Phase 4 | 4 | 0 | 0 | 4 | 0% |
| Phase 5 | 6 | 2 | 0 | 4 | 33% |
| Phase 6 | 7 | 5 | 0 | 2 | 71% |
| **Total** | **39** | **22** | **0** | **17** | **56%** |

**Overall Match Rate: 56%**

---

## Gap Summary

### Missing Features (Design O, Implementation X) -- 17 items

| # | Phase | Item | Impact |
|---|:-----:|------|:------:|
| 1 | 2 | `src/lib/mappers/report.ts` not created | Medium |
| 2 | 2 | `reports/[id]/page.tsx` still has `as unknown as ReportData` | Low |
| 3 | 2 | `src/lib/ai/client.ts` still has `as unknown as` | Low |
| 4 | 3 | `src/lib/queries/notices.ts` not created | Medium |
| 5 | 3 | `src/lib/queries/patents.ts` not created | Medium |
| 6 | 3 | `notices/page.tsx` still has inline queries | Medium |
| 7 | 3 | `patents/page.tsx` still has inline queries | Medium |
| 8 | 4 | `withAuth` params extension not done | High |
| 9 | 4 | `withServiceAuth` params extension not done | High |
| 10 | 4 | `withDualAuth` params extension not done | High |
| 11 | 4 | 38 API routes still use `pathname.split` | High |
| 12 | 5 | `BulkActionBar.tsx` not extracted | Medium |
| 13 | 5 | `ReportMobileCard.tsx` not extracted | Medium |
| 14 | 5 | `ReportTableRow.tsx` not extracted | Medium |
| 15 | 5 | ReportsContent not reduced to ~280 lines | Low |
| 16 | 6 | ReportDetailContent inline type not refactored to `Pick<>` | Low |
| 17 | 6 | CORS still `*` (nice-to-have) | Low |

---

## Recommended Actions

### Immediate (High Impact)
1. **Phase 4**: Implement `withAuth` params extension and migrate 38 API routes -- largest structural improvement, eliminates fragile `pathname.split` pattern
2. **Phase 3**: Create `queries/notices.ts` and `queries/patents.ts` to complete query separation

### Next Priority (Medium Impact)
3. **Phase 2**: Create `src/lib/mappers/report.ts` to eliminate remaining `as unknown as`
4. **Phase 5**: Extract `BulkActionBar`, `ReportMobileCard`, `ReportTableRow` components

### Deferred (Low Impact)
5. **Phase 6**: Refactor ReportDetailContent inline type to `Pick<Report, ...>`
6. **Phase 6**: CORS origin restriction (blocked until Extension ID is finalized)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-17 | Initial gap analysis -- 56% match rate |
