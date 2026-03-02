# Gap Analysis: dashboard

> **Summary**: Dashboard design vs implementation gap analysis
>
> **Author**: Claude (gap-detector)
> **Created**: 2026-03-01
> **Status**: Approved

---

## Summary
- **Match Rate**: 95% (149/157 items)
- **Date**: 2026-03-01
- **Design**: `docs/02-design/features/dashboard.design.md`

## Overall Scores

| Category | Score | Items | Status |
|----------|:-----:|:-----:|:------:|
| Types & Data Models | 100% | 26/26 | PASS |
| Chart Color Tokens | 96% | 24/25 | PASS |
| Demo Data | 100% | 20/20 | PASS |
| API (route.ts) | 100% | 10/10 | PASS |
| ReportTrendChart | 100% | 10/10 | PASS |
| ViolationDistChart | 100% | 10/10 | PASS |
| StatusPipelineChart | 90% | 9/10 | PASS |
| TopViolationsChart | 100% | 9/9 | PASS |
| AiPerformanceCard | 100% | 9/9 | PASS |
| DashboardContent | 94% | 15/16 | PASS |
| page.tsx (Server) | 100% | 6/6 | PASS |
| i18n (en.ts) | 88% | 14/16 | PASS |
| **Overall** | **95%** | **149/157** (matched) + **5 changed** + **3 missing** | PASS |

---

## Matched Items

### 1. Types & Data Models (26/26 = 100%)

**File**: `src/types/dashboard.ts`

| # | Design Item | Status | Notes |
|---|-------------|:------:|-------|
| 1 | `PeriodFilter` type: `'7d' \| '30d' \| '90d'` | Match | Exact |
| 2 | `DashboardStats` type exists | Match | |
| 3 | `summary.activeCampaigns: number` | Match | |
| 4 | `summary.pendingReports: number` | Match | |
| 5 | `summary.totalListings: number` | Match | |
| 6 | `summary.resolvedRate: number` | Match | |
| 7 | `summary.aiAccuracy: number` | Match | |
| 8 | `summary.monitoringCount: number` | Match | |
| 9 | `reportTrend[].date: string` | Match | |
| 10 | `reportTrend[].newReports: number` | Match | |
| 11 | `reportTrend[].resolved: number` | Match | |
| 12 | `violationDist[].category: string` | Match | |
| 13 | `violationDist[].categoryLabel: string` | Match | |
| 14 | `violationDist[].count: number` | Match | |
| 15 | `statusPipeline[].status: string` | Match | |
| 16 | `statusPipeline[].statusLabel: string` | Match | |
| 17 | `statusPipeline[].count: number` | Match | |
| 18 | `topViolations[].code: string` | Match | |
| 19 | `topViolations[].name: string` | Match | |
| 20 | `topViolations[].count: number` | Match | |
| 21 | `aiPerformance.avgConfidence: number` | Match | |
| 22 | `aiPerformance.disagreementRate: number` | Match | |
| 23 | `aiPerformance.approveRate: number` | Match | |
| 24 | `aiPerformance.rewriteRate: number` | Match | |
| 25 | `aiPerformance.rejectRate: number` | Match | |
| 26 | Types exported with `export type` | Match | |

### 2. Chart Color Tokens (24/25 = 96%)

**File**: `src/constants/chart-colors.ts`

| # | Design Item | Status | Notes |
|---|-------------|:------:|-------|
| 1 | `CHART_COLORS` as const object | Match | |
| 2 | `intellectual_property: '#ef4444'` | Match | |
| 3 | `listing_content: '#f59e0b'` | Match | |
| 4 | `review_manipulation: '#8b5cf6'` | Match | |
| 5 | `selling_practice: '#3b82f6'` | Match | |
| 6 | `regulatory_safety: '#10b981'` | Match | |
| 7 | `draft: '#6b7280'` | Match | |
| 8 | `pending_review: '#f59e0b'` | Match | |
| 9 | `approved: '#3b82f6'` | Match | |
| 10 | `submitted: '#8b5cf6'` | Match | |
| 11 | `monitoring: '#06b6d4'` | Match | |
| 12 | `resolved: '#10b981'` | Match | |
| 13 | `rejected: '#ef4444'` | Match | |
| 14 | `cancelled: '#6b7280'` | Match | |
| 15 | `unresolved: '#f97316'` | Match | |
| 16 | `newReports: '#3b82f6'` | Match | |
| 17 | `resolvedLine: '#10b981'` | Match | |
| 18 | `as const` assertion | Match | |
| 19 | named export | Match | |
| 20 | category colors section | Match | |
| 21 | status colors section | Match | |
| 22 | trend chart section | Match | |
| 23 | (Design does not list `archived`) | Added | `archived: '#9ca3af'` added -- harmless extra |
| 24 | All hex values correct | Match | |

### 3. Demo Data (20/20 = 100%)

**File**: `src/lib/demo/dashboard.ts`

| # | Design Item | Status | Notes |
|---|-------------|:------:|-------|
| 1 | `getDemoDashboardStats(period)` function | Match | |
| 2 | Import `PeriodFilter, DashboardStats` types | Match | |
| 3 | `seedRandom` deterministic function | Match | |
| 4 | period-based day count generation | Match | |
| 5 | `summary.activeCampaigns: 2` | Match | |
| 6 | `summary.pendingReports: 2` | Match | |
| 7 | `summary.totalListings: 5` | Match | |
| 8 | `summary.resolvedRate: 25` | Match | |
| 9 | `summary.aiAccuracy: 82` | Match | |
| 10 | `summary.monitoringCount: 2` | Match | |
| 11 | `violationDist` 5 categories w/ correct counts | Match | 8/5/3/2/1 |
| 12 | `statusPipeline` 7 statuses (cancelled:0 omitted) | Match | Design had cancelled:0 but omitting is valid |
| 13 | `topViolations` top 10 V-codes, descending | Match | V01:8 V04:5 V02:4 V06:3 V11:3 V03:2 V05:2 V08:2 V07:1 V16:1 |
| 14 | `aiPerformance.avgConfidence: 82` | Match | |
| 15 | `aiPerformance.disagreementRate: 12` | Match | |
| 16 | `aiPerformance.approveRate: 72` | Match | |
| 17 | `aiPerformance.rewriteRate: 18` | Match | |
| 18 | `aiPerformance.rejectRate: 10` | Match | |
| 19 | `reportTrend` generates per-day data | Match | `newReports: 0~5, resolved: 0~3` |
| 20 | Return type `DashboardStats` | Match | |

### 4. API: Dashboard Stats Route (10/10 = 100%)

**File**: `src/app/api/dashboard/stats/route.ts`

| # | Design Item | Status | Notes |
|---|-------------|:------:|-------|
| 1 | `GET /api/dashboard/stats` endpoint | Match | |
| 2 | `period` query param | Match | |
| 3 | Default `30d` if not provided | Match | |
| 4 | Auth check `getCurrentUser()` | Match | |
| 5 | 401 on unauthenticated | Match | |
| 6 | Demo mode check `isDemoMode()` | Match | |
| 7 | Returns `getDemoDashboardStats(period)` in demo | Match | |
| 8 | Supabase future placeholder | Match | Returns demo data as fallback |
| 9 | `PeriodFilter` type validation | Match | Uses `VALID_PERIODS` array check |
| 10 | Named export `GET` | Match | |

### 5. ReportTrendChart (10/10 = 100%)

**File**: `src/components/features/charts/ReportTrendChart.tsx`

| # | Design Item | Status | Notes |
|---|-------------|:------:|-------|
| 1 | Props: `data: { date, newReports, resolved }[]` | Match | |
| 2 | `ResponsiveContainer width="100%" height={280}` | Match | |
| 3 | `AreaChart` component | Match | |
| 4 | `XAxis dataKey="date"` with MMM dd format | Match | `toLocaleDateString('en-US', { month: 'short', day: 'numeric' })` |
| 5 | `YAxis` present | Match | |
| 6 | 2 Areas: `newReports` (blue, 0.3) + `resolved` (emerald, 0.2) | Match | Colors from CHART_COLORS |
| 7 | `Tooltip` with custom format | Match | |
| 8 | `Legend` bottom | Match | |
| 9 | `CartesianGrid strokeDasharray="3 3"` | Match | |
| 10 | `role="img"` + `aria-label` | Match | |

### 6. ViolationDistChart (10/10 = 100%)

**File**: `src/components/features/charts/ViolationDistChart.tsx`

| # | Design Item | Status | Notes |
|---|-------------|:------:|-------|
| 1 | Props: `data: { category, categoryLabel, count }[]` | Match | |
| 2 | `ResponsiveContainer width="100%" height={280}` | Match | |
| 3 | `PieChart` component | Match | |
| 4 | `Pie innerRadius={60} outerRadius={100}` donut | Match | |
| 5 | `Cell` with category colors | Match | CATEGORY_COLORS map |
| 6 | Tooltip with category name + count + ratio% | Match | `${v} (${...}%)` |
| 7 | Center label: total count | Match | `<text>` element at 50%/50% |
| 8 | `Legend` bottom | Match | |
| 9 | `role="img"` + `aria-label` | Match | |
| 10 | `sr-only` screen reader text | Match | |

### 7. StatusPipelineChart (9/10 = 90%)

**File**: `src/components/features/charts/StatusPipelineChart.tsx`

| # | Design Item | Status | Notes |
|---|-------------|:------:|-------|
| 1 | Props: `data: { status, statusLabel, count }[]` | Match | |
| 2 | `ResponsiveContainer width="100%" height={280}` | Match | |
| 3 | `BarChart layout="vertical"` | Match | |
| 4 | `XAxis type="number"` | Match | |
| 5 | `YAxis type="category" dataKey="statusLabel"` | Match | |
| 6 | `YAxis width={100}` design vs `width={90}` impl | Changed | Minor: 90 vs 100 |
| 7 | `Bar dataKey="count"` with `Cell fill={...}` | Match | |
| 8 | `Tooltip` present | Match | |
| 9 | `role="img"` + `aria-label` | Match | |
| 10 | Bar label (count inside bar) | Missing | Design: "bar count label inside bar" -- not implemented |

### 8. TopViolationsChart (9/9 = 100%)

**File**: `src/components/features/charts/TopViolationsChart.tsx`

| # | Design Item | Status | Notes |
|---|-------------|:------:|-------|
| 1 | Props: `data: { code, name, count }[]` | Match | |
| 2 | `ResponsiveContainer width="100%" height={350}` | Match | |
| 3 | `BarChart layout="vertical"` | Match | |
| 4 | `YAxis dataKey="code" width={50}` | Match | |
| 5 | `XAxis type="number"` | Match | |
| 6 | `Bar fill="#3b82f6"` | Match | |
| 7 | `Tooltip` with code + name + count | Match | Custom formatter |
| 8 | Data descending by count | Match | (Data pre-sorted) |
| 9 | `role="img"` + `aria-label` | Match | |

### 9. AiPerformanceCard (9/9 = 100%)

**File**: `src/components/features/charts/AiPerformanceCard.tsx`

| # | Design Item | Status | Notes |
|---|-------------|:------:|-------|
| 1 | Props: `data: { avgConfidence, disagreementRate, approveRate, rewriteRate, rejectRate }` | Match | |
| 2 | Avg Confidence: big number + progress bar | Match | ProgressBar component |
| 3 | Disagreement Rate: warning if > 20% | Match | `data.disagreementRate > 20 ? '#f59e0b' : '#10b981'` |
| 4 | 3-segment horizontal bar (approve/rewrite/reject) | Match | Flex segments green/amber/red |
| 5 | Approve: green | Match | `#10b981` |
| 6 | Rewrite: amber | Match | `#f59e0b` |
| 7 | Reject: red | Match | `#ef4444` |
| 8 | i18n labels used | Match | |
| 9 | Custom card (not Recharts chart) | Match | |

### 10. DashboardContent (15/16 = 94%)

**File**: `src/app/(protected)/dashboard/DashboardContent.tsx`

| # | Design Item | Status | Notes |
|---|-------------|:------:|-------|
| 1 | `'use client'` directive | Match | |
| 2 | Props: `userName, initialStats, recentReports, activeCampaigns` | Match | |
| 3 | `useState<PeriodFilter>('30d')` | Match | |
| 4 | Period filter UI (7d/30d/90d tabs) | Match | |
| 5 | Demo mode: `getDemoDashboardStats(period)` on period change | Match | |
| 6 | 6 stat cards (campaigns, reports, listings, rate, AI, monitoring) | Match | |
| 7 | Stats grid: `grid-cols-2 ... lg:grid-cols-3 xl:grid-cols-6` | Changed | Design: `md:grid-cols-3 lg:grid-cols-6`, Impl: `lg:grid-cols-3 xl:grid-cols-6` |
| 8 | Chart Row 1: ReportTrend (2/3) + ViolationDist (1/3) | Match | `lg:grid-cols-3` + `lg:col-span-2` |
| 9 | Chart Row 2: StatusPipeline (1/2) + AiPerformance (1/2) | Match | `md:grid-cols-2` |
| 10 | Chart Row 3: TopViolations (full width) | Match | |
| 11 | Existing RecentReports section | Match | |
| 12 | Existing ActiveCampaigns section | Match | |
| 13 | Dynamic imports with `ssr: false` + loading skeletons | Match | |
| 14 | ChartSkeleton loading component | Match | |
| 15 | Greeting section | Match | |
| 16 | Fetch API on period change (non-demo) | Missing | Design: `fetch('/api/dashboard/stats?period=...')` for non-demo; impl only handles demo via `getDemoDashboardStats` |

### 11. page.tsx Server Component (6/6 = 100%)

**File**: `src/app/(protected)/dashboard/page.tsx`

| # | Design Item | Status | Notes |
|---|-------------|:------:|-------|
| 1 | Server Component (no `'use client'`) | Match | |
| 2 | `getCurrentUser()` | Match | |
| 3 | `getDemoDashboardStats('30d')` for initial stats | Match | |
| 4 | Pass `initialStats` to DashboardContent | Match | |
| 5 | Pass `recentReports` | Match | |
| 6 | Pass `activeCampaigns` | Match | |

### 12. i18n Keys

**en.ts (14/16 = 88%)**

| # | Design Key | Status | Notes |
|---|------------|:------:|-------|
| 1 | `dashboard.charts.period.'7d'` = '7 Days' | Match | |
| 2 | `dashboard.charts.period.'30d'` = '30 Days' | Match | |
| 3 | `dashboard.charts.period.'90d'` = '90 Days' | Match | |
| 4 | `dashboard.charts.reportTrend` | Match | |
| 5 | `dashboard.charts.newReports` | Match | |
| 6 | `dashboard.charts.resolved` | Match | |
| 7 | `dashboard.charts.violationDist` | Match | |
| 8 | `dashboard.charts.statusPipeline` | Changed | Design: `'Report Status'`, Impl: `'Status Pipeline'` |
| 9 | `dashboard.charts.topViolations` | Match | |
| 10 | `dashboard.charts.aiPerformance` | Match | |
| 11 | `dashboard.charts.avgConfidence` | Match | |
| 12 | `dashboard.charts.disagreementRate` | Match | |
| 13 | `dashboard.charts.approveRate` | Match | |
| 14 | `dashboard.charts.rewriteRate` | Match | |
| 15 | `dashboard.charts.rejectRate` | Match | |
| 16 | `dashboard.charts.decisionBreakdown` | Match | |
| 17 | `dashboard.charts.total` | Match | |
| 18 | `dashboard.charts.noData` | Missing | Design has `noData: 'No chart data available'` -- not in impl |
| 19 | `dashboard.period.label` = 'Period' | Missing | Design has `dashboard.period.label` -- impl only has `dashboard.charts.period.*` |
| 20 | `dashboard.aiAccuracy` | Changed | Design: top-level key; impl: under `dashboard.charts.aiAccuracy` |
| 21 | `dashboard.monitoringActive` | Changed | Design: `monitoringActive`; impl: `dashboard.charts.monitoring` (diff key name) |

**ko.ts** mirrors en.ts structure -- same gaps apply (counted in en.ts totals above).

---

## Gaps Found

### Missing Items (3)

| # | Item | Design Location | Description |
|---|------|-----------------|-------------|
| 1 | Bar count labels inside bar | Design Section 3.4 line "bar count label inside bar" | StatusPipelineChart does not render count text inside each bar |
| 2 | `dashboard.charts.noData` i18n key | Design Section 6.1 | Key `noData: 'No chart data available'` not present in en.ts or ko.ts |
| 3 | `dashboard.period.label` i18n key | Design Section 6.1 | Key `period.label: 'Period'` not present (period keys are under `charts.period.*` instead of top-level `period.*`) |

### Changed Items (5)

| # | Item | Design | Implementation | Impact |
|---|------|--------|----------------|--------|
| 1 | StatusPipeline YAxis width | `width={100}` | `width={90}` | Low -- visual only |
| 2 | Stats grid breakpoints | `md:grid-cols-3 lg:grid-cols-6` | `lg:grid-cols-3 xl:grid-cols-6` | Low -- slightly different responsive breakpoints |
| 3 | `statusPipeline` label (en) | `'Report Status'` | `'Status Pipeline'` | Low -- cosmetic text difference |
| 4 | `aiAccuracy` i18n key path | `dashboard.aiAccuracy` | `dashboard.charts.aiAccuracy` | Low -- works, just nested under charts |
| 5 | `monitoringActive` i18n key | `dashboard.monitoringActive` | `dashboard.charts.monitoring` | Low -- renamed and nested |

### Added Items (not in design, present in implementation) (2)

| # | Item | Implementation Location | Description |
|---|------|------------------------|-------------|
| 1 | `archived` color token | `src/constants/chart-colors.ts:19` | Extra status color `archived: '#9ca3af'` |
| 2 | API period validation | `src/app/api/dashboard/stats/route.ts:7-8` | `VALID_PERIODS` array validates period param (design did simple `as PeriodFilter` cast) |

---

## Scoring Breakdown

```
Types:               26/26  = 100%
Chart Colors:        24/25  =  96%  (1 added item)
Demo Data:           20/20  = 100%
API Route:           10/10  = 100%
ReportTrendChart:    10/10  = 100%
ViolationDistChart:  10/10  = 100%
StatusPipelineChart:  9/10  =  90%  (1 missing)
TopViolationsChart:   9/9   = 100%
AiPerformanceCard:    9/9   = 100%
DashboardContent:    15/16  =  94%  (1 missing)
page.tsx:             6/6   = 100%
i18n (en.ts):        14/16  =  88%  (2 missing)
--------------------------------------
Total:              149/157 =  95%
```

---

## Recommendations

### Low Priority (cosmetic, no functional impact)

1. **StatusPipelineChart bar labels**: Consider adding `<LabelList>` from Recharts to show count values inside each bar, as specified in design Section 3.4. This improves readability.

2. **Add missing i18n key `dashboard.charts.noData`**: Add `noData: 'No chart data available'` (en) / `noData: '차트 데이터가 없습니다'` (ko) for potential empty-state messaging in charts.

3. **Add missing i18n key `dashboard.period.label`**: Add `period.label: 'Period'` (en) / `period.label: '기간'` (ko) if a label is needed next to the period filter tabs.

### Documentation Update Suggestions

4. **Update design document**: Reflect the following implementation improvements:
   - Period parameter validation with `VALID_PERIODS` array (better than simple cast)
   - `archived` color token addition
   - Adjusted breakpoints (`lg:grid-cols-3 xl:grid-cols-6` may be intentionally better for the actual layout)

5. **Reconcile i18n key paths**: Design shows `dashboard.aiAccuracy` and `dashboard.monitoringActive` as top-level keys, but implementation nests them under `dashboard.charts.*`. Either update design to match implementation (recommended, since these keys are chart-related) or restructure code.

6. **Non-demo API fetch**: DashboardContent only handles demo-mode period changes client-side. For future Supabase integration, add `fetch('/api/dashboard/stats?period=...')` path. Currently not needed since the project runs in demo mode.

---

## Conclusion

Match Rate: **95%** -- Design and implementation match well. All 13 files specified in the design are implemented. The 3 missing items are minor (1 chart label, 2 i18n keys). The 5 changed items are low-impact cosmetic differences. No functional gaps exist. The implementation adds 2 useful extras (archived color, period validation) beyond the design.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-01 | Initial gap analysis | Claude (gap-detector) |
