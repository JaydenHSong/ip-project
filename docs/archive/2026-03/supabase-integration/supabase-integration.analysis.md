# Supabase Integration -- Full Gap Analysis Report

> **Analysis Type**: Gap Analysis (Design Document + Session Plan vs Implementation)
>
> **Project**: Sentinel
> **Analyst**: Claude (gap-detector)
> **Date**: 2026-03-02
> **Design Doc**: [supabase-integration.design.md](../archive/2026-03/supabase-integration/supabase-integration.design.md)
> **Session Plan**: delightful-kindling-widget.md (Phase 1 supplementary fixes)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Comprehensive verification that **all** items in the Supabase Integration design document (Sections 2-9) and the supplementary session plan have been correctly implemented. This covers 7 P0 critical issues, 5 P1 issues, 3 new files, 12 modified files, and 4 session-plan additions.

### 1.2 Analysis Scope

| Source | Items |
|--------|-------|
| Design Doc Section 2 (Critical Issues) | C1-C7 (P0), M1-M5 (P1) |
| Design Doc Section 3 (Fix Specs) | 8 detailed fix specifications |
| Design Doc Section 4 (New: .env.local.example) | 1 file |
| Design Doc Section 5 (New: Migration 004) | 1 file |
| Design Doc Section 6 (New: Setup Guide) | 1 file |
| Design Doc Section 9 (Test Checklist) | T1-T10 |
| Session Plan Phase 1 | 4 additional items (007, 008, users fix, DashboardContent) |
| User-requested checks | SlidePanel bg, AppLayout flex, liquid metal CSS |

---

## 2. Test Checklist Verification (Design Section 9)

| # | Test Item | Expected | Actual | Status |
|---|-----------|----------|--------|:------:|
| T1 | `pnpm typecheck` | 0 errors | Manual verification required | -- |
| T2 | `pnpm lint` | 0 errors | Manual verification required | -- |
| T3 | `pnpm build` | Success | Manual verification required | -- |
| T4 | No `.from('settings')` in src/ | 0 matches | **0 matches** | PASS |
| T5 | No `entity_type` in src/ | 0 matches | **0 matches** | PASS |
| T6 | `004_add_archived_status.sql` valid | No syntax errors | File exists, correct DDL patterns | PASS |
| T7 | `.env.local.example` exists w/ 7+ vars | 7 required vars | **11 variables present** | PASS |
| T8 | Dashboard stats real-mode: no demo fallback | No `getDemoDashboardStats` in real path | Only in `isDemoMode()` guard (L32) | PASS |
| T9 | Dashboard page real-mode: no empty arrays | Real Supabase queries | Lines 35-71 populate data | PASS |
| T10 | 8 server components have error handling | `if (error)` pattern | **8/8 have error handling** | PASS |

### T4 Evidence

`src/app/api/settings/monitoring/route.ts` -- all 4 occurrences now use `system_configs` (lines 12, 18, 48, 66).
`src/app/api/monitoring/pending/route.ts` -- both occurrences now use `system_configs` (lines 12, 18).

### T5 Evidence

`src/app/(protected)/audit-logs/page.tsx` line 44 uses `.eq('resource_type', ...)`.
`src/lib/demo/data.ts` lines 436-486 all use `resource_type`.
`src/app/(protected)/audit-logs/AuditLogsContent.tsx` type definition line 11 uses `resource_type`.

### T7 Environment Variables Detail

| Variable | Present | Category |
|----------|:-------:|----------|
| `DEMO_MODE` | Yes | App |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase |
| `GOOGLE_CLIENT_ID` | Yes | Auth |
| `GOOGLE_CLIENT_SECRET` | Yes | Auth |
| `NEXT_PUBLIC_APP_URL` | Yes | App |
| `ANTHROPIC_API_KEY` | Yes | AI |
| `REDIS_URL` | Yes | Queue |
| `MONDAY_API_TOKEN` | Yes | Integration |
| `GOOGLE_CHAT_WEBHOOK_URL` | Yes | Notification |

### T10 Error Handling Detail

| Page | Error Handling | Pattern |
|------|:--------------:|---------|
| `dashboard/page.tsx` | Yes | `if (reportError) console.error(...)` + `if (campaignError) console.error(...)` |
| `reports/page.tsx` | Yes | `if (error) console.error(...)` |
| `reports/[id]/page.tsx` | Yes | `if (error \|\| !data) notFound()` |
| `reports/archived/page.tsx` | Yes | `if (error) console.error(...)` |
| `reports/completed/page.tsx` | Yes | `if (queryError) console.error(...)` |
| `campaigns/page.tsx` | Yes | `if (error) console.error(...)` |
| `campaigns/[id]/page.tsx` | Yes | `if (error \|\| !data) notFound()` |
| `audit-logs/page.tsx` | Yes | `if (error) console.error(...)` |

---

## 3. Critical Issues (C1-C7) Verification

### 3.1 [C1] `settings` -> `system_configs` (6 replacements, 2 files)

| File | Line | Expected | Actual | Status |
|------|------|----------|--------|:------:|
| `api/settings/monitoring/route.ts` | 12 | `system_configs` | `system_configs` | PASS |
| `api/settings/monitoring/route.ts` | 18 | `system_configs` | `system_configs` | PASS |
| `api/settings/monitoring/route.ts` | 48 | `system_configs` | `system_configs` | PASS |
| `api/settings/monitoring/route.ts` | 66 | `system_configs` | `system_configs` | PASS |
| `api/monitoring/pending/route.ts` | 12 | `system_configs` | `system_configs` | PASS |
| `api/monitoring/pending/route.ts` | 18 | `system_configs` | `system_configs` | PASS |

### 3.2 [C2+C3] Archived Status + Columns Migration

| Item | Expected | Actual (004_add_archived_status.sql) | Status |
|------|----------|--------------------------------------|:------:|
| `archived` in status CHECK | Yes | Line 10: `'archived'` in constraint | PASS |
| `archived_at TIMESTAMPTZ` | Yes | Line 14 | PASS |
| `archive_reason TEXT` | Yes | Line 15 | PASS |
| `pre_archive_status TEXT` | Not in design | Line 16 (bonus) | INFO |

### 3.3 [C4] `entity_type` -> `resource_type`

| File | Expected | Actual | Status |
|------|----------|--------|:------:|
| `audit-logs/page.tsx` | `.eq('resource_type', ...)` | Line 44 | PASS |
| `lib/demo/data.ts` | `resource_type` field | Lines 436-486 | PASS |
| `AuditLogsContent.tsx` type | `resource_type: string` | Line 11 | PASS |

### 3.4 [C5] Dashboard Page Real-Mode Queries

| Item | Expected | Actual (dashboard/page.tsx) | Status |
|------|----------|----------------------------|:------:|
| `recentReports` real query | `.from('reports').select(...)` | Lines 35-40 with FK join, limit(3) | PASS |
| `activeCampaigns` real query | `.from('campaigns').select(...)` | Lines 58-63 with status filter, limit(10) | PASS |
| Error handling for reports | `if (error) ...` | Lines 42-44 | PASS |
| Error handling for campaigns | `if (error) ...` | Lines 65-67 | PASS |

### 3.5 [C6] Dashboard Stats API Real Queries

| Item | Expected | Actual (api/dashboard/stats/route.ts) | Status |
|------|----------|---------------------------------------|:------:|
| Period filtering | `gte('created_at', periodStart)` | Line 45 | PASS |
| Status counts | Individual status aggregation | Lines 59-62 (filter-based counting) | PASS |
| Violation distribution | Group by violation_type | Lines 91-107 (with category labels) | PASS |
| Daily trend | Time-series aggregation | Lines 73-88 (trendMap) | PASS |
| Status pipeline | Pipeline chart data | Lines 110-120 | PASS |
| Top violations | Sorted list | Lines 123-135 | PASS |
| AI performance | Confidence + disagreement | Lines 138-163 | PASS |
| Output shape matches demo | `DashboardStats` type | Line 144 | PASS |

The stats route only calls `getDemoDashboardStats` inside the `isDemoMode()` guard (line 32). The real-mode path (lines 35-166) has **full independent Supabase aggregation**.

### 3.6 [C7] Monitoring Settings Seed Data

| Item | Expected | Actual (004_add_archived_status.sql) | Status |
|------|----------|--------------------------------------|:------:|
| `monitoring_interval_days` | In seed | Lines 19-20 | PASS |
| `monitoring_max_days` | In seed | Line 21 | PASS |
| ON CONFLICT handling | `DO NOTHING` | Line 22 | PASS |

---

## 4. Medium Issues (M1-M5) Verification

### 4.1 [M1] Reports Double Status Filter

| Item | Expected | Actual (reports/page.tsx) | Status |
|------|----------|--------------------------|:------:|
| Conditional if/else | `if (params.status) eq() else in()` | Lines 61-65: correct pattern | PASS |

```typescript
// Actual code (lines 61-65):
if (params.status) {
  query = query.eq('status', params.status)
} else {
  query = query.in('status', ['draft', 'pending_review', 'approved', 'rejected'])
}
```

### 4.2 [M2] Completed Page Pagination

| Item | Expected | Actual | Status |
|------|----------|--------|:------:|
| Design mentions `limit(100)` hardcode | Pagination or higher limit | Still `limit(100)` on line 36 | INFO |

Note: Design flags this as a P1 issue but does not specify an explicit fix in Section 3. The current `limit(100)` is acceptable for initial deployment.

### 4.3 [M3] Campaign Detail Reports Query Unlimited

| Item | Expected | Actual | Status |
|------|----------|--------|:------:|
| Design mentions unbounded query | Limit or pagination | Not addressed in Section 3 | INFO |

Note: Design identifies this as P1 but no explicit fix spec was provided.

### 4.4 [M4] Supabase Error Handling

See T10 above. All 8 server components have error handling. **PASS**.

### 4.5 [M5] Timeline Actor UUID Resolution

| Item | Expected | Actual (reports/[id]/page.tsx) | Status |
|------|----------|-------------------------------|:------:|
| Design identifies as P1 | Actor name resolution | Lines 123-127: approver/rejector/editor still `null` | KNOWN |

Note: Design identifies this but provides no explicit fix in Section 3. The `null` values are passed to `buildTimelineEvents` as actors. This is a pre-existing limitation.

---

## 5. New Files Verification

### 5.1 Design Document New Files (3)

| # | File | Required | Exists | Content Match | Status |
|---|------|----------|:------:|:-------------:|:------:|
| 1 | `.env.local.example` | Section 4 | Yes | 11 variables (design has 7+) | PASS |
| 2 | `supabase/migrations/004_add_archived_status.sql` | Section 5 | Yes | Full match | PASS |
| 3 | `docs/guides/supabase-setup.md` | Section 6 | Yes | 7 steps, troubleshooting | PASS |

### 5.2 Session Plan New Files (2)

| # | File | Required | Exists | Content Match | Status |
|---|------|----------|:------:|:-------------:|:------:|
| 4 | `supabase/migrations/007_fix_schema_mismatches.sql` | Plan 1-1 | Yes | Full match (51 lines) | PASS |
| 5 | `supabase/migrations/008_auto_create_public_user.sql` | Plan 1-2 | Yes | Full match (25 lines) | PASS |

### 5.3 All Migration Files (001-008)

| Migration | Exists | Purpose |
|-----------|:------:|---------|
| `001_initial_schema.sql` | Yes | Core tables (16) + indexes + triggers |
| `002_rls_policies.sql` | Yes | Row Level Security |
| `003_seed_data.sql` | Yes | Product categories + trademarks + system configs |
| `004_add_archived_status.sql` | Yes | Archived status + columns + monitoring seed |
| `005_add_screenshot_url.sql` | Yes | Screenshot URL column on listings |
| `005_report_templates.sql` | Yes | Template table (with DROP CASCADE) |
| `006_seed_templates.sql` | Yes | 73 templates seed data |
| `007_fix_schema_mismatches.sql` | Yes | sc_submit_data + details JSONB + CHECK |
| `008_auto_create_public_user.sql` | Yes | Auth trigger for auto user creation |

---

## 6. Session Plan Items Verification

### 6.1 Migration 007 Detail

| Spec Item | Implementation | Status |
|-----------|----------------|:------:|
| `sc_submit_data JSONB` on reports | Line 8: `ALTER TABLE reports ADD COLUMN IF NOT EXISTS sc_submit_data JSONB` | PASS |
| `details JSONB` on audit_logs | Line 18: `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB` | PASS |
| audit_logs action CHECK extended | Lines 35-50: 7 new action values | PASS |

### 6.2 Migration 008 Detail

| Spec Item | Implementation | Status |
|-----------|----------------|:------:|
| `handle_new_user()` function | Lines 5-19: SECURITY DEFINER, COALESCE chain | PASS |
| `on_auth_user_created` trigger | Lines 22-25: AFTER INSERT ON auth.users | PASS |
| Default role = viewer | Line 14: `'viewer'` | PASS |
| ON CONFLICT DO NOTHING | Line 16 | PASS |

### 6.3 `users/[id]/route.ts`: performed_by -> user_id

| Check | Result | Status |
|-------|--------|:------:|
| No `performed_by` in entire src/ | 0 matches | PASS |
| `user_id: currentUser.id` in audit insert | Line 132 | PASS |

### 6.4 `DashboardContent.tsx`: Real-Mode Period Fetch

| Check | Result | Status |
|-------|--------|:------:|
| `handlePeriodChange` has real-mode API fetch | Lines 101-106: `fetch(/api/dashboard/stats?period=...)` | PASS |
| Error handling | Lines 107-108: catch block | PASS |
| Initial stats fetch on mount | **No useEffect for initial load** | GAP |

---

## 7. Additional User-Requested Checks

### 7.1 SlidePanel Background

| Check | Expected | Actual | Status |
|-------|----------|--------|:------:|
| Uses `bg-th-bg` | Yes | `SlidePanel.tsx` line 74: `bg-th-bg` | PASS |
| No `bg-surface-panel` | 0 matches | 0 matches in SlidePanel | PASS |

Note: `bg-surface-panel` appears in `PatentsContent.tsx` line 833 (different component), not in SlidePanel.

### 7.2 AppLayout Uses Flex Layout

| Check | Expected | Actual | Status |
|-------|----------|--------|:------:|
| Flex layout | `flex h-dvh` | Line 35: `className="flex h-dvh overflow-hidden bg-th-bg-secondary"` | PASS |
| No absolute positioning | 0 matches | 0 `absolute` in AppLayout.tsx | PASS |

### 7.3 No Liquid Metal / Sidebar-Liquid CSS

| Check | Expected | Actual | Status |
|-------|----------|--------|:------:|
| No `sidebar-liquid` in src/ | 0 matches | 0 matches | PASS |
| No `liquid.metal` in src/ | 0 matches | 0 matches | PASS |

---

## 8. Gaps Found

### 8.1 [G1] Dashboard Initial Stats Missing in Real Mode (Medium)

**Location**: `src/app/(protected)/dashboard/page.tsx` line 11 + `DashboardContent.tsx`

**Problem**: In real mode, `initialStats` is `null` (never assigned in the else branch). `DashboardContent` initializes `stats` as `null` and has no `useEffect` to fetch on mount. Charts show empty/zero values until the user manually clicks a period button.

**Impact**: Medium -- dashboard summary cards (recent reports, active campaigns) load fine via SSR, but chart data (`reportTrend`, `violationDist`, `statusPipeline`, `topViolations`, `aiPerformance`) are all null on first render.

**Fix Option A** (Server-side, preferred): In `dashboard/page.tsx` else branch, call inline stats aggregation or fetch from the API and pass as `initialStats`.

**Fix Option B** (Client-side): Add `useEffect` in `DashboardContent.tsx`:
```typescript
useEffect(() => {
  if (!initialStats && !isDemoMode()) {
    handlePeriodChange('30d')
  }
}, [])
```

### 8.2 [G2] Setup Guide Missing Migrations 007+008 (Low)

**Location**: `docs/guides/supabase-setup.md` Step 3

**Problem**: The migration table lists 7 entries (001 through 006, plus both 005 files) but does not include `007_fix_schema_mismatches.sql` or `008_auto_create_public_user.sql`.

**Fix**: Add two rows to the Step 3 table:
```markdown
| 8 | `007_fix_schema_mismatches.sql` | sc_submit_data + details JSONB + CHECK 확장 |
| 9 | `008_auto_create_public_user.sql` | OAuth 가입 시 users 자동 생성 트리거 |
```

---

## 9. Item-Level Scoring

### 9.1 Design Doc Fixes (Section 3)

| # | Item | Sub-items | Match | Partial | Missing |
|---|------|:---------:|:-----:|:-------:|:-------:|
| C1 | settings -> system_configs | 6 | 6 | 0 | 0 |
| C2+C3 | archived migration | 4 | 4 | 0 | 0 |
| C4 | entity_type -> resource_type | 3 | 3 | 0 | 0 |
| C5 | Dashboard page real queries | 4 | 4 | 0 | 0 |
| C6 | Dashboard stats real queries | 8 | 8 | 0 | 0 |
| C7 | Monitoring seed data | 3 | 3 | 0 | 0 |
| M1 | Double status filter | 1 | 1 | 0 | 0 |
| M4 | Error handling (8 pages) | 8 | 8 | 0 | 0 |

**Subtotal**: 37/37 = **100%**

### 9.2 New Files

| # | Item | Match | Partial | Missing |
|---|------|:-----:|:-------:|:-------:|
| .env.local.example | 1 | 0 | 0 |
| 004_add_archived_status.sql | 1 | 0 | 0 |
| supabase-setup.md | 0 | 1 | 0 |

**Subtotal**: 2 match + 1 partial (missing 007/008 in guide) = **83%**

### 9.3 Session Plan Items

| # | Item | Match | Partial | Missing |
|---|------|:-----:|:-------:|:-------:|
| 007 migration | 1 | 0 | 0 |
| 005 DROP CASCADE | 1 | 0 | 0 |
| 008 migration | 1 | 0 | 0 |
| users/[id] fix | 1 | 0 | 0 |
| DashboardContent period fetch | 0 | 1 | 0 |

**Subtotal**: 4 match + 1 partial (no initial fetch) = **90%**

### 9.4 Additional Checks

| # | Item | Match |
|---|------|:-----:|
| SlidePanel bg-th-bg | PASS |
| AppLayout flex | PASS |
| No liquid metal | PASS |
| Migrations 001-008 exist | PASS |

**Subtotal**: 4/4 = **100%**

---

## 10. Overall Score

```
+---------------------------------------------+
|  Overall Match Rate: 96%                     |
+---------------------------------------------+
|  Total Items:       49                       |
|  PASS:              47 items (95.9%)         |
|  PARTIAL:            2 items ( 4.1%)         |
|  MISSING:            0 items ( 0.0%)         |
+---------------------------------------------+
```

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match (C1-C7, M1, M4) | 100% | PASS |
| New Files | 83% | PASS |
| Session Plan Items | 90% | PASS |
| Additional Checks | 100% | PASS |
| **Overall** | **96%** | **PASS** |

---

## 11. Recommended Actions

### 11.1 Immediate

| Priority | Item | Gap | File |
|----------|------|-----|------|
| Medium | G1: Add initial stats fetch for real mode | Dashboard charts empty on first load | `DashboardContent.tsx` or `dashboard/page.tsx` |

### 11.2 Documentation Update

| Priority | Item | Gap | File |
|----------|------|-----|------|
| Low | G2: Add migrations 007+008 to setup guide | Guide incomplete | `docs/guides/supabase-setup.md` |

### 11.3 Not Required (Informational)

| Item | Note |
|------|------|
| M2: Completed page pagination | Identified in design as P1 but no fix spec provided. limit(100) acceptable for now. |
| M3: Campaign detail reports query | Identified in design as P1 but no fix spec provided. |
| M5: Timeline actor UUID | Identified in design as P1 but no fix spec provided. Actors show as null. |
| 005 migration number conflict | Two files share 005 prefix. No runtime issue if executed manually in SQL Editor. |

---

## 12. Next Steps

- [ ] Fix G1: Add initial stats fetch for real-mode dashboard
- [ ] Fix G2: Update setup guide with migrations 007 + 008
- [ ] Run `pnpm typecheck` + `pnpm lint` + `pnpm build` (T1-T3)
- [ ] Proceed to Phase 2: Supabase project setup (user manual steps)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-02 | Phase 1 session-plan analysis (13 items, 100% match) | gap-detector |
| 2.0 | 2026-03-02 | Full design doc + session plan analysis (49 items, 96% match, 2 gaps) | gap-detector |
