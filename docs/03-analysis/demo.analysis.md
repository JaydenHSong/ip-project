# Demo Feature Analysis Report

> **Analysis Type**: Gap Analysis (Check Phase) -- No formal design doc exists
>
> **Project**: Sentinel (Spigen Brand Protection Platform)
> **Analyst**: gap-detector agent
> **Date**: 2026-03-02
> **Design Doc**: N/A (no formal design document -- baseline derived from project context + implementation intent)

### Baseline References

| Source | Document | Usage |
|--------|----------|-------|
| Project Context | CLAUDE.md | Feature scope, tech stack, RBAC, pipeline |
| Implementation | `src/lib/demo/` | Actual demo feature code |
| Conventions | CLAUDE.md Coding Conventions | Naming, structure, restrictions |

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

The demo feature allows Sentinel Web to run with mock data (no Supabase backend) when `DEMO_MODE=true` is set. This analysis evaluates completeness of the implementation, identifies coverage gaps across pages and API routes, and assesses code quality against project conventions. Since no formal Plan/Design document exists, the "design baseline" is inferred from the project context (CLAUDE.md) and the evident intent of the feature.

### 1.2 Analysis Scope

- **Implementation Path**: `src/lib/demo/`, `src/middleware.ts`, `src/lib/auth/session.ts`, all `(protected)` pages
- **Analysis Date**: 2026-03-02
- **Files Analyzed**: 38 source files (10 with demo references, 28 without)

---

## 2. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Page Coverage (demo data) | 77% | Warning |
| Auth Bypass Correctness | 90% | Warning |
| Mock Data Completeness | 70% | Warning |
| API Route Coverage | 0% | Critical |
| Convention Compliance | 88% | Warning |
| **Overall Match Rate** | **65%** | Critical |

---

## 3. Demo Mode Architecture

### 3.1 How It Works

```
Environment Variable: DEMO_MODE=true
       |
       v
[middleware.ts] --> Bypasses Supabase auth, redirects /login -> /dashboard
       |
       v
[session.ts]   --> getCurrentUser() returns DEMO_USER instead of DB lookup
       |
       v
[Page Components] --> Each page checks isDemoMode() and uses DEMO_* data
       |
       v
[DashboardContent.tsx] --> Shows demo banner via i18n key: common.demoMode
```

### 3.2 Core Files

| File | Path | Role |
|------|------|------|
| isDemoMode() | `src/lib/demo/index.ts` | Single-line env check utility |
| Mock Data | `src/lib/demo/data.ts` | DEMO_USER, DEMO_CAMPAIGNS, DEMO_LISTINGS, DEMO_REPORTS, DEMO_AUDIT_LOGS |
| Auth Bypass | `src/middleware.ts` | Skips Supabase auth when DEMO_MODE=true |
| Session Override | `src/lib/auth/session.ts` | Returns DEMO_USER when isDemoMode() |

---

## 4. Gap Analysis

### 4.1 Page-Level Demo Coverage

| Page | Path | Demo Mode | Status |
|------|------|:---------:|:------:|
| Dashboard | `src/app/(protected)/dashboard/page.tsx` | Yes | Implemented |
| Dashboard Content | `src/app/(protected)/dashboard/DashboardContent.tsx` | Yes (banner) | Implemented |
| Campaigns List | `src/app/(protected)/campaigns/page.tsx` | Yes | Implemented |
| Campaign Detail | `src/app/(protected)/campaigns/[id]/page.tsx` | Yes | Implemented |
| Reports Queue | `src/app/(protected)/reports/page.tsx` | Yes | Implemented |
| Report Detail | `src/app/(protected)/reports/[id]/page.tsx` | Yes | Implemented |
| Completed Reports | `src/app/(protected)/reports/completed/page.tsx` | Yes | Implemented |
| Audit Logs | `src/app/(protected)/audit-logs/page.tsx` | Yes | Implemented |
| New Campaign | `src/app/(protected)/campaigns/new/page.tsx` | No | Missing |
| Settings | N/A (page does not exist) | N/A | Not applicable |
| Reports Archived | N/A (page does not exist) | N/A | Not applicable |
| Reports New | N/A (page does not exist) | N/A | Not applicable |
| Protected Layout | `src/app/(protected)/layout.tsx` | Indirect (via session.ts) | Implemented |
| Login Page | `src/app/(auth)/login/page.tsx` | Indirect (via middleware redirect) | Implemented |

**Notes on missing pages**: Settings, Reports Archived, and Reports New pages do not exist in the codebase at all. They are not demo gaps -- they are unimplemented features entirely.

### 4.2 Missing Page: campaigns/new

The `campaigns/new/page.tsx` page does NOT have demo mode handling. It renders a `<CampaignForm>` that posts to `/api/campaigns` via `fetch()`. In demo mode:

- The page itself **renders correctly** (session.ts returns DEMO_USER so the auth check passes).
- However, form submission calls `POST /api/campaigns` which uses `withAuth()` middleware that requires Supabase auth. **This will fail with a 401 error in demo mode.**

This is a **functional gap**: users can navigate to the form but cannot submit it.

### 4.3 API Route Demo Coverage

**None of the 22 API routes have demo mode handling.** All API routes use `withAuth()` from `src/lib/auth/middleware.ts`, which always calls Supabase auth. There is no demo bypass in the API middleware.

| API Route | Method | Demo Mode | Impact |
|-----------|--------|:---------:|--------|
| `/api/campaigns` | GET, POST | No | Campaign creation fails |
| `/api/campaigns/[id]` | GET, PATCH, DELETE | No | Campaign actions fail |
| `/api/campaigns/[id]/pause` | POST | No | Pause action fails |
| `/api/campaigns/[id]/resume` | POST | No | Resume action fails |
| `/api/campaigns/[id]/export` | POST | No | Export fails |
| `/api/reports` | GET, POST | No | Report creation fails |
| `/api/reports/[id]` | GET, PUT | No | Report update fails |
| `/api/reports/[id]/approve` | POST | No | Approval action fails |
| `/api/reports/[id]/reject` | POST | No | Rejection action fails |
| `/api/reports/[id]/cancel` | POST | No | Cancel action fails |
| `/api/listings` | GET, POST | No | Listing operations fail |
| `/api/listings/[id]` | GET | No | Detail fetch fails |
| `/api/audit-logs` | GET | No | Audit log API fails |
| `/api/ai/analyze` | POST | No | AI analysis fails |
| `/api/ai/verify` | POST | No | AI verify fails |
| `/api/ai/rewrite` | POST | No | AI rewrite fails |
| `/api/ai/learn` | POST | No | AI learn fails |
| `/api/ai/skills` | GET, POST | No | Skills management fails |
| `/api/ext/auth-status` | GET | No | Extension auth fails |
| `/api/ext/submit-report` | POST | No | Extension submit fails |
| `/api/crawler/campaigns` | GET | No | Crawler integration fails |
| `/api/crawler/listings` | GET, POST | No | Crawler data fails |
| `/api/patents/sync` | POST | No | Patent sync fails |

**Impact Assessment**: Since most protected pages use **server-side data fetching** (direct Supabase calls with isDemoMode() checks) rather than client-side API calls, the API gap has **medium impact on read operations** but **high impact on write operations** (form submissions, approve/reject actions, campaign actions).

### 4.4 Missing Files (Documented in Git but Not on Disk)

Per the user-provided context, these files were listed in git history but do NOT exist on disk:

| File | Expected Path | Status |
|------|--------------|--------|
| dashboard.ts | `src/lib/demo/dashboard.ts` | Missing from disk |
| monitoring.ts | `src/lib/demo/monitoring.ts` | Missing from disk |

These may have been deleted or were planned but never created. The demo feature works without them, but their absence suggests incomplete implementation of dashboard-specific mock metrics and monitoring data.

---

## 5. Mock Data Completeness

### 5.1 Entity Coverage

| Entity | Mock Data | Count | Covers All Statuses | Notes |
|--------|:---------:|:-----:|:-------------------:|-------|
| User | DEMO_USER | 1 | N/A | Only admin role; no editor/viewer variants |
| Campaigns | DEMO_CAMPAIGNS | 4 | Yes (active, paused, completed) | Missing `scheduled` status |
| Listings | DEMO_LISTINGS | 5 | Partial | Mix of suspect/normal, crawler/extension |
| Reports | DEMO_REPORTS | 4 | Partial | draft, pending_review, approved, rejected -- missing submitted, monitoring, resolved |
| Audit Logs | DEMO_AUDIT_LOGS | 6 | Partial | create, approve, reject, update, login -- missing delete, export |

### 5.2 Type Alignment Issues

| Field | Type Definition | Demo Data | Status |
|-------|----------------|-----------|--------|
| User.last_login_at | `string \| null` | Not present | Missing field |
| Listing.images | `ListingImage[]` | Not present | Missing field |
| Listing.category | `string \| null` | Not present | Missing field |
| Listing.source_campaign_id | `string \| null` | Not present | Missing field |
| Listing.source_user_id | `string \| null` | Not present | Missing field |
| Listing.raw_data | `unknown` | Not present | Missing field |
| Listing.updated_at | `string` | Not present | Missing field |
| Campaign.marketplace | `MarketplaceCode` | `string` | Loose typing |
| Campaign.frequency | `CampaignFrequency` | `string` | Loose typing |

The demo data objects are **not typed against their corresponding type definitions**. They use inline object literals with `as const` or `as Type` casts at usage sites. This means type mismatches are hidden at compile time.

### 5.3 Completed Reports Page Data Gap

The `completed/page.tsx` filters DEMO_REPORTS by statuses: `['submitted', 'monitoring', 'resolved', 'unresolved', 'resubmitted', 'escalated']`. None of the 4 DEMO_REPORTS have these statuses, so **the completed reports page always shows an empty list in demo mode**.

---

## 6. Auth Bypass Analysis

### 6.1 Middleware Bypass

```typescript
// src/middleware.ts:7-13
if (process.env.DEMO_MODE === 'true') {
  if (req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
  return NextResponse.next()
}
```

**Assessment**: Correct behavior. In demo mode:
- Login page redirects to dashboard
- All other routes pass through without auth check
- The matcher config excludes `_next/static`, `_next/image`, `favicon.ico`, `api/auth`

**Issue**: The middleware matcher **does NOT exclude `/api/*` routes**. This means API routes receive requests without Supabase cookies, but the `withAuth()` middleware inside each API route still tries to authenticate via Supabase. The middleware-level bypass only prevents redirect-to-login for page navigation -- it does not inject demo credentials into API calls.

### 6.2 Session Override

```typescript
// src/lib/auth/session.ts:8-10
if (isDemoMode()) {
  return DEMO_USER as User
}
```

**Assessment**: Correct for server components. Every `(protected)` page calls `getCurrentUser()` which returns DEMO_USER. The `as User` cast is safe since DEMO_USER matches the User type shape (minus `last_login_at`).

### 6.3 API Auth Middleware Gap

```typescript
// src/lib/auth/middleware.ts -- NO demo mode check
export const withAuth = (handler, allowedRoles) => {
  return async (req) => {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    // Always calls Supabase -- fails in demo mode
  }
}
```

**This is the most significant gap in the demo feature.** The `withAuth()` middleware has no demo mode bypass, meaning:
- All API POST/PATCH/DELETE operations fail
- Client-side form submissions (CampaignForm) get 401 errors
- Report approve/reject/cancel actions from button clicks fail
- AI analysis triggers fail

---

## 7. Convention Compliance

### 7.1 Naming Convention

| Item | Convention | Actual | Status |
|------|-----------|--------|--------|
| isDemoMode function | camelCase | `isDemoMode` | Compliant |
| DEMO_USER constant | UPPER_SNAKE_CASE | `DEMO_USER` | Compliant |
| DEMO_CAMPAIGNS constant | UPPER_SNAKE_CASE | `DEMO_CAMPAIGNS` | Compliant |
| DEMO_LISTINGS constant | UPPER_SNAKE_CASE | `DEMO_LISTINGS` | Compliant |
| DEMO_REPORTS constant | UPPER_SNAKE_CASE | `DEMO_REPORTS` | Compliant |
| DEMO_AUDIT_LOGS constant | UPPER_SNAKE_CASE | `DEMO_AUDIT_LOGS` | Compliant |
| File: index.ts | kebab-case (utility) | `index.ts` | Compliant |
| File: data.ts | kebab-case (utility) | `data.ts` | Compliant |
| Folder: demo | kebab-case | `demo` | Compliant |

### 7.2 Import Order

Checked across all 10 files referencing demo mode. Import order pattern:

```
1. next/... (external)
2. @/lib/... (internal absolute)
3. @/components/... (internal absolute)
4. ./... (relative)
5. import type (types)
```

All files follow the correct order. **No violations found.**

### 7.3 Code Pattern Issues

| Issue | File | Line | Severity | Description |
|-------|------|------|----------|-------------|
| Inline env check | `middleware.ts` | L7 | Low | Uses `process.env.DEMO_MODE === 'true'` directly instead of `isDemoMode()` |
| Missing type safety | `data.ts` | All | Medium | Mock data objects not typed with explicit type annotations |
| Repetitive pattern | Multiple pages | All | Medium | Every page duplicates `if (isDemoMode()) { ... } else { supabase query }` |

### 7.4 Restriction Compliance

| Restriction | Status | Notes |
|-------------|--------|-------|
| No console.log | Compliant | No console statements in demo files |
| No inline styles | Compliant | Demo banner uses Tailwind classes |
| No `var` | Compliant | Uses `const`/`let` |
| Named exports | Compliant | All demo exports are named |
| No hardcoded secrets | Compliant | Uses env var for demo toggle |
| No `enum` | Compliant | Uses `as const` patterns |
| No `any` | Compliant | No `any` usage |

---

## 8. Clean Architecture Assessment

### 8.1 Layer Placement

| Component | Expected Layer | Actual Location | Status |
|-----------|---------------|-----------------|--------|
| isDemoMode() | Infrastructure/lib | `src/lib/demo/index.ts` | Compliant |
| DEMO_* data | Infrastructure/lib | `src/lib/demo/data.ts` | Compliant |
| Auth bypass | Middleware | `src/middleware.ts` | Compliant |
| Session override | Infrastructure/auth | `src/lib/auth/session.ts` | Compliant |
| Demo banner UI | Presentation | `DashboardContent.tsx` | Compliant |

### 8.2 Dependency Direction

The demo feature follows correct dependency flow:
- Presentation (pages) -> imports from lib/demo (Infrastructure) -- acceptable at Dynamic level
- lib/auth/session.ts -> imports from lib/demo -- same layer, acceptable
- No reverse dependencies (demo does not import from components or pages)

**Architecture Score: 95%** -- one minor concern is that pages import directly from `@/lib/demo/data` rather than through a service layer, but this is acceptable at the Dynamic architecture level.

---

## 9. i18n Coverage

| Key | English | Korean | Status |
|-----|---------|--------|--------|
| `common.demoMode` | "Demo Mode -- Running with mock data" | "Demo Mode -- mock data..." | Compliant |

Only one i18n key exists for demo mode. This is sufficient for the current banner display.

---

## 10. Environment Variable Analysis

| Variable | Convention | Prefix | Status | Notes |
|----------|-----------|--------|--------|-------|
| DEMO_MODE | Non-standard | None | Warning | No prefix (not NEXT_PUBLIC_, not API_, etc.) |

**Issue**: `DEMO_MODE` does not follow the project's environment variable naming convention. Per Phase 2 convention, it should use a recognized prefix. Suggested alternatives:
- `NEXT_PUBLIC_DEMO_MODE` (if client needs access -- currently used in `DashboardContent.tsx` client component via `isDemoMode()`)
- `APP_DEMO_MODE` (if server-only)

**Critical Note**: `isDemoMode()` uses `process.env.DEMO_MODE` which works in server components but may NOT work in client components (`'use client'`). The `DashboardContent.tsx` calls `isDemoMode()` on the client side, but Next.js only exposes `NEXT_PUBLIC_*` variables to the browser. This means **the demo banner may not display in production builds** unless the variable is renamed to `NEXT_PUBLIC_DEMO_MODE` or the check is moved server-side and passed as a prop.

**No `.env.example` file exists** in the project, so the `DEMO_MODE` variable is not documented anywhere.

---

## 11. Overall Match Rate Calculation

Since there is no formal design document, the match rate is calculated against "expected completeness" based on the feature's purpose (full UI demo without backend).

| Category | Items | Covered | Rate |
|----------|:-----:|:-------:|:----:|
| Protected Pages with demo data | 8 active pages | 8 | 100% |
| Write Operations (forms/actions) | 6 identified | 0 working | 0% |
| API Routes with demo bypass | 22 routes | 0 | 0% |
| Mock Data Entity Types | 5 types | 5 present | 100% |
| Mock Data Status Coverage | ~15 statuses needed | 8 present | 53% |
| Type Safety of Mock Data | 9 missing fields | 0 fixed | 0% |
| Environment Variable Convention | 1 variable | 0 compliant | 0% |
| Client-side Demo Check Safety | 1 check | 0 safe | 0% |
| Planned Files Existing | 2 (dashboard.ts, monitoring.ts) | 0 | 0% |

**Weighted Calculation**:

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| Page-level read coverage | 30% | 100% | 30.0 |
| Write operation coverage | 25% | 0% | 0.0 |
| Mock data quality | 15% | 55% | 8.3 |
| Auth/security correctness | 15% | 70% | 10.5 |
| Convention compliance | 10% | 88% | 8.8 |
| Missing planned files | 5% | 0% | 0.0 |

```
+---------------------------------------------+
|  Overall Match Rate: 58%                     |
+---------------------------------------------+
|  Page Read Coverage:    100% (30.0 pts)      |
|  Write Operations:        0% ( 0.0 pts)      |
|  Mock Data Quality:      55% ( 8.3 pts)      |
|  Auth Correctness:       70% (10.5 pts)      |
|  Convention Compliance:  88% ( 8.8 pts)      |
|  Planned Files:           0% ( 0.0 pts)      |
|  TOTAL:                 57.6 / 100            |
+---------------------------------------------+
```

**Match Rate: 58%** -- Below the 70% threshold. Significant synchronization needed.

---

## 12. Differences Found

### 12.1 Missing Features (Expected but Not Implemented)

| # | Item | Location | Description | Impact |
|---|------|----------|-------------|--------|
| 1 | API demo bypass | `src/lib/auth/middleware.ts` | `withAuth()` has no demo mode handling | High -- all write operations fail |
| 2 | CampaignForm demo handling | `src/components/features/CampaignForm.tsx` | Form submits to API which fails in demo | High -- cannot demo campaign creation |
| 3 | Report action handlers | `ReportActions.tsx`, `CampaignActions.tsx` | Buttons trigger API calls that fail | High -- cannot demo approve/reject |
| 4 | Completed reports mock data | `src/lib/demo/data.ts` | No reports with submitted/monitoring/resolved status | Medium -- empty page in demo |
| 5 | dashboard.ts mock file | `src/lib/demo/dashboard.ts` | Listed in git but missing from disk | Low -- dashboard works with inline data |
| 6 | monitoring.ts mock file | `src/lib/demo/monitoring.ts` | Listed in git but missing from disk | Low -- no monitoring page yet |
| 7 | .env.example with DEMO_MODE | Project root | No .env.example documents the variable | Medium -- discoverability |

### 12.2 Quality Issues Found

| # | Item | Location | Description | Impact |
|---|------|----------|-------------|--------|
| 1 | Client-side isDemoMode() | `DashboardContent.tsx:57` | `isDemoMode()` reads process.env in client component -- unreliable in production | High -- banner may not show |
| 2 | Inline env check in middleware | `middleware.ts:7` | Uses `process.env.DEMO_MODE` directly instead of `isDemoMode()` | Low -- inconsistency |
| 3 | Untyped mock data | `data.ts` all exports | Mock objects not typed against their type definitions | Medium -- silent type drift |
| 4 | DEMO_USER missing field | `data.ts:3-12` | `last_login_at` field missing from DEMO_USER | Low -- cast hides it |
| 5 | DEMO_LISTINGS missing fields | `data.ts:73-173` | Missing: images, category, source_campaign_id, source_user_id, raw_data, updated_at | Medium -- type mismatch |
| 6 | Non-standard env var name | `src/lib/demo/index.ts` | `DEMO_MODE` lacks conventional prefix | Low -- works but non-standard |
| 7 | Duplicated branching pattern | All 8 pages | Repeated `if (isDemoMode()) { ... } else { supabase... }` pattern | Low -- maintainability concern |

---

## 13. Recommended Actions

### 13.1 Immediate (Critical -- blocks demo usability)

| Priority | Item | File | Description |
|----------|------|------|-------------|
| 1 | Add demo bypass to `withAuth()` | `src/lib/auth/middleware.ts` | Return DEMO_USER when `isDemoMode()` is true, skip Supabase |
| 2 | Fix client-side isDemoMode() | `DashboardContent.tsx` | Pass `isDemoMode()` result as prop from server component, or rename to `NEXT_PUBLIC_DEMO_MODE` |
| 3 | Add completed report statuses | `src/lib/demo/data.ts` | Add DEMO_REPORTS entries with submitted, monitoring, resolved statuses |

### 13.2 Short-term (within 1 week)

| Priority | Item | File | Description |
|----------|------|------|-------------|
| 1 | Type the mock data | `src/lib/demo/data.ts` | Add explicit type annotations: `DEMO_USER: User`, `DEMO_CAMPAIGNS: Campaign[]`, etc. |
| 2 | Add missing fields to mock data | `src/lib/demo/data.ts` | Add `last_login_at`, `images`, `category`, `updated_at` fields |
| 3 | Create .env.example | Project root | Document `DEMO_MODE=false` with comment |
| 4 | Extract demo data service | `src/lib/demo/` | Create a service layer to reduce page-level duplication |

### 13.3 Long-term (backlog)

| Item | Description |
|------|-------------|
| Create formal design document | Write `docs/02-design/features/demo.design.md` documenting the demo architecture |
| Add demo mode for write operations | Mock successful responses for campaign create, report approve/reject |
| Add editor/viewer demo users | Support role switching in demo mode |
| Consider feature flag system | Replace `DEMO_MODE` with a proper feature flag if more flags are added |
| Implement dashboard.ts / monitoring.ts | Create planned mock data files or remove from backlog |

---

## 14. Design Document Creation Recommendation

Since no Plan or Design document exists for this feature, the following should be created to complete the PDCA cycle:

- [ ] `docs/01-plan/features/demo.plan.md` -- Scope, requirements, success criteria
- [ ] `docs/02-design/features/demo.design.md` -- Architecture decisions, data flow, mock data specification

---

## 15. Next Steps

- [ ] Fix Critical issues (API demo bypass, client-side env check, mock data gaps)
- [ ] Create Plan and Design documents retroactively
- [ ] Re-run analysis after fixes (target: >= 90% match rate)
- [ ] Write completion report (`demo.report.md`)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-02 | Initial analysis | gap-detector agent |
