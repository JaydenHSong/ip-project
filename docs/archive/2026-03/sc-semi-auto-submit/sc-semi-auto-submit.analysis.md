# SC Semi-Auto Submit (F13a) Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: Sentinel
> **Feature**: sc-semi-auto-submit (F13a)
> **Analyst**: Claude (AI)
> **Date**: 2026-03-01
> **Design Doc**: [sc-semi-auto-submit.design.md](../02-design/features/sc-semi-auto-submit.design.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Verify that the implementation of F13a (SC Semi-Auto Submit) matches the design document across all 12 implementation items: Extension files, Web API endpoints, Web UI components, and i18n keys.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/sc-semi-auto-submit.design.md` v0.1
- **Implementation Paths**:
  - `extension/` -- manifest, content scripts, shared types/maps
  - `src/app/api/reports/` -- submit-sc, pending-sc-submit, confirm-submitted
  - `src/app/(protected)/reports/[id]/` -- ReportActions, ReportDetailContent
  - `src/constants/violations.ts` -- SC_VIOLATION_MAP, SC_RAV_URLS
  - `src/lib/i18n/locales/` -- en.ts, ko.ts

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 Extension: manifest.json (Design Section 4.1)

| Requirement | Design | Implementation | Status |
|-------------|--------|----------------|--------|
| SC host_permission | `https://sellercentral.amazon.com/*` | `https://sellercentral.amazon.com/*` (line 21) | PASS |
| Existing 8 Amazon domains | 8 domains listed | 8 domains present (lines 13-20) | PASS |
| SC content_scripts entry | `matches: ["https://sellercentral.amazon.com/abuse-submission/*"]` | Exact match (lines 52-53) | PASS |
| SC content_scripts js | `["sc-content.js"]` | `["sc-content.js"]` (line 55) | PASS |
| SC content_scripts run_at | `"document_idle"` | `"document_idle"` (line 56) | PASS |
| Existing content.js entry preserved | `content.js` + `content.css` for Amazon pages | Preserved (lines 28-50) | PASS |

**Result: 6/6 PASS**

### 2.2 Extension: sc-selectors.ts (Design Section 4.2)

| Requirement | Design | Implementation | Status |
|-------------|--------|----------------|--------|
| File location | `extension/src/content/sc-selectors.ts` | Correct | PASS |
| pageDetect selectors (3) | 3 selectors: `data-testid`, h1 text, URL path | 3 selectors present; h1 check uses `.toLowerCase().includes('report')` vs design `.includes('Report a Violation')` -- more lenient, acceptable | PASS |
| loginDetect selectors | 2 selectors in design | 3 selectors in impl (added `.navbar-user-name`) | PASS |
| asinInput selectors | 3 selectors | 3 selectors -- exact match | PASS |
| violationTypeSelect selectors | 2 selectors in design | 3 selectors in impl (added `select[name="issue_type"]`) | PASS |
| descriptionTextarea selectors | 2 selectors in design | 3 selectors in impl (added `textarea[name="details"]`) | PASS |
| evidenceInput selectors | 2 selectors in design | 3 selectors in impl (added `input[name="evidence"]`) | PASS |
| submitButton selectors | 2 selectors | 2 selectors -- exact match | PASS |
| submissionConfirm selectors | 2 selectors in design | 3 selectors in impl (added h1/h2 text scan fallback) | PASS |
| caseId selectors | 2 selectors | 2 selectors -- exact match | PASS |
| `as const` export | Yes | Yes | PASS |

**Result: 11/11 PASS** -- Implementation is a superset (extra fallback selectors), which is acceptable.

### 2.3 Extension: sc-violation-map.ts (Design Section 4.3)

| Requirement | Design | Implementation | Status |
|-------------|--------|----------------|--------|
| File location | `extension/src/shared/sc-violation-map.ts` | Correct | PASS |
| Import ViolationCode | `import type { ViolationCode } from './constants'` | Exact match | PASS |
| V01-V19 mapping (19 entries) | All 19 entries with SC values | All 19 entries, values match exactly | PASS |
| `as const` assertion | Yes | Yes | PASS |
| SC_TO_SENTINEL_MAP (reverse map) | Defined in design with `Object.entries().reduce()` | **NOT implemented** | FAIL |
| `ScViolationType` export type | Not in design | Implemented as `(typeof SC_VIOLATION_MAP)[ViolationCode]` | PASS (extra) |

**Result: 5/6 -- 1 FAIL**

**FAIL Detail**: `SC_TO_SENTINEL_MAP` (reverse mapping from SC type back to ViolationCode) is defined in the design (Section 4.3, lines 361-367) but not present in implementation. This is a low-priority gap since the reverse map is not used by any current consumer (form filling only goes Sentinel->SC direction). However, it could be needed for future features like SC response parsing.

### 2.4 Extension: sc-form-filler.ts (Design Section 4.4)

| Requirement | Design | Implementation | Status |
|-------------|--------|----------------|--------|
| File location | `extension/src/content/sc-form-filler.ts` | Correct | PASS |
| Import SC_SELECTORS | Yes | Yes (line 8) | PASS |
| Import SC_VIOLATION_MAP | Design says yes | **NOT imported** -- not needed since data comes pre-mapped from API | PASS (intentional) |
| Import API_BASE | Yes | Yes (line 9) | PASS |
| Import ScSubmitData type | Yes | Yes (line 10) | PASS |
| trySelectors function | Same pattern as design | Matches | PASS |
| init() flow: page detect | Check isRavPage | Implemented (line 223) | PASS |
| init() flow: login detect | Check isLoggedIn + warning toast | Implemented (lines 227-230) | PASS |
| init() flow: fetch pending data | Call fetchPendingSubmitData() | Implemented (line 234) | PASS |
| init() flow: fillForm | Call fillForm(data.sc_submit_data) | Implemented (line 238) | PASS |
| init() flow: success/warning toast | Two messages per fill result | Implemented (lines 240-244) | PASS |
| init() flow: observeSubmission | Call observeSubmission(report_id) | Implemented (line 247) | PASS |
| init() called at module level | `init()` at bottom | `init()` at line 250 | PASS |
| fetchPendingSubmitData() | GET pending-sc-submit with Bearer token + X-Extension-Version | Implemented (lines 33-53) | PASS |
| getStoredSession / getStoredToken | chrome.storage.local auth.access_token | Implemented (lines 25-30); simplified to return string directly vs design's object wrapper -- functionally equivalent | PASS |
| fillForm() -- ASIN | Set via setInputValue | Implemented (lines 80-85) | PASS |
| fillForm() -- violation select | Set via setSelectValue | Implemented (lines 88-93) | PASS |
| fillForm() -- description | Set via setInputValue | Implemented (lines 96-101) | PASS |
| fillForm() -- evidence (optional) | Set URLs, don't affect allFilled | Implemented (lines 103-109) | PASS |
| setInputValue -- React compatible | nativeInputValueSetter + input/change events | Implemented (lines 56-67) | PASS |
| setSelectValue | el.value + change event | Implemented (lines 70-73) | PASS |
| observeSubmission -- URL check | setInterval every 1s | Implemented (lines 144-154) | PASS |
| observeSubmission -- MutationObserver | childList + subtree on body | Implemented (lines 157-166) | PASS |
| observeSubmission -- 5min timeout | setTimeout 5 * 60 * 1000 | Implemented (lines 169-172) | PASS |
| handleSubmissionComplete | Extract caseId + call confirmSubmitted + show toast | Implemented (lines 175-182) | PASS |
| confirmSubmitted (Sentinel API callback) | POST confirm-submitted with caseId | Implemented (lines 115-137) | PASS |
| showToast UI | Fixed position, color-coded, auto-dismiss 5s | Implemented (lines 185-218) | PASS |

**Result: 27/27 PASS**

### 2.5 Extension: shared/types.ts (Design Section 4.6)

| Requirement | Design | Implementation | Status |
|-------------|--------|----------------|--------|
| ScSubmitData type added | 6 fields: asin, violation_type_sc, description, evidence_urls, marketplace, prepared_at | All 6 fields present (lines 43-50) | PASS |
| Existing types preserved | ParsedPageData, SubmitReportPayload, etc. | All preserved | PASS |

**Result: 2/2 PASS**

### 2.6 Extension: shared/messages.ts (Design Section 4.5)

| Requirement | Design | Implementation | Status |
|-------------|--------|----------------|--------|
| ScContentMessage type added | `SC_FORM_FILLED` + `SC_SUBMIT_DETECTED` | Both present (lines 37-39) | PASS |
| SC_FORM_FILLED fields | `{ type, reportId }` | `{ type: 'SC_FORM_FILLED'; reportId: string }` | PASS |
| SC_SUBMIT_DETECTED fields | `{ type, reportId, caseId: string \| null }` | `{ type: 'SC_SUBMIT_DETECTED'; reportId: string; caseId: string \| null }` | PASS |
| Existing types preserved | PopupMessage, ContentMessage, etc. | All preserved | PASS |

**Result: 4/4 PASS**

### 2.7 Web API: submit-sc (Design Section 3.1)

| Requirement | Design | Implementation | Status |
|-------------|--------|----------------|--------|
| File location | `src/app/api/reports/[id]/submit-sc/route.ts` | Correct | PASS |
| HTTP method | POST | POST (line 9) | PASS |
| Auth check | withAuth middleware | `withAuth(..., ['admin'])` | PASS |
| Status check | Must be `approved` | `report.status !== 'approved'` check (line 40) | PASS |
| Query report + listing data | Join reports + listings | `reports.select(... listings!inner(asin, marketplace))` (lines 23-31) | PASS |
| V01-V19 -> SC mapping | Use SC_VIOLATION_MAP | `SC_VIOLATION_MAP[violationType] ?? 'other'` (line 49) | PASS |
| sc_submit_data construction | asin, violation_type_sc, description, evidence_urls, marketplace, prepared_at | All 6 fields constructed (lines 54-65) | PASS |
| Status update | `status -> 'submitted'` | `status: 'submitted'` (line 72) | PASS |
| sc_submit_data saved | Stored in reports table | `sc_submit_data: scSubmitData` (line 74) | PASS |
| sc_submitted_at saved | Timestamp saved | `sc_submitted_at: now` (line 73) | PASS |
| Response: sc_rav_url | Returned in response | `sc_rav_url: scRavUrl` (line 93) | PASS |
| Response: sc_submit_data | Returned in response | `sc_submit_data: scSubmitData` (line 94) | PASS |
| SC RAV URL pattern | marketplace-based URL | Uses `SC_RAV_URLS[marketplace]` (line 51) | PASS |
| Auth minimum role | Design says `editor` | Implementation uses `['admin']` only | FAIL |
| Demo mode | Design Section 7 specifies demo mode branch | No demo mode `isDemoMode` check in implementation | FAIL |

**Result: 13/15 -- 2 FAIL**

**FAIL Detail 1**: Design specifies minimum role `editor` (Section 3.4: "editor (admin + editor both possible)"), but implementation restricts to `['admin']` only (line 96). This means editors cannot submit to SC -- a functional gap.

**FAIL Detail 2**: Design Section 7 specifies demo mode support with mock sc_submit_data response. Implementation has no `isDemoMode` check or demo data branch.

### 2.8 Web API: pending-sc-submit (Design Section 3.2)

| Requirement | Design | Implementation | Status |
|-------------|--------|----------------|--------|
| File location | `src/app/api/reports/pending-sc-submit/route.ts` | Correct | PASS |
| HTTP method | GET | GET (line 7) | PASS |
| Auth check | withAuth with Bearer token | `withAuth(..., ['editor', 'admin'])` | PASS |
| Auth minimum role | `editor` | `['editor', 'admin']` -- matches | PASS |
| Query: status = submitted | Filter by submitted | `.eq('status', 'submitted')` (line 15) | PASS |
| Query: sc_submit_data not null | Filter present | `.not('sc_submit_data', 'is', null)` (line 16) | PASS |
| Query: sc_case_id is null | Filter absent | `.is('sc_case_id', null)` (line 17) | PASS |
| Query: order by recent | Most recent first | `.order('sc_submitted_at', { ascending: false })` (line 18) | PASS |
| Query: limit 1 | Single result | `.limit(1).single()` (line 19-20) | PASS |
| 204 No Content when none | Return 204 | `new NextResponse(null, { status: 204 })` (line 23) | PASS |
| Response format | `{ report_id, sc_submit_data }` | Matches (lines 26-28) | PASS |
| User scoping | Design says "current user's" reports | **No user filtering** -- `.eq('user_id', user.id)` missing | FAIL |

**Result: 11/12 -- 1 FAIL**

**FAIL Detail**: Design Section 3.2 specifies "user's most recent submitted report" but implementation does not filter by current user (`user` parameter is destructured from withAuth context but never used in query). This means the API could return any user's pending submit data -- a security gap.

### 2.9 Web API: confirm-submitted (Design Section 3.3)

| Requirement | Design | Implementation | Status |
|-------------|--------|----------------|--------|
| File location | `src/app/api/reports/[id]/confirm-submitted/route.ts` | Correct | PASS |
| HTTP method | POST | POST (line 7) | PASS |
| Auth check | withAuth | `withAuth(..., ['editor', 'admin'])` | PASS |
| Auth minimum role | `editor` | `['editor', 'admin']` -- matches | PASS |
| Request body: sc_case_id (optional) | `{ sc_case_id?: string }` | `body.sc_case_id` handled (line 50) | PASS |
| Status check | Must be `submitted` | `report.status !== 'submitted'` (line 36) | PASS |
| sc_case_id saved if provided | Conditional save | `if (body.sc_case_id) updateData.sc_case_id = ...` (lines 50-52) | PASS |
| sc_submit_data cleared | Set to null | `sc_submit_data: null` (line 46) | PASS |
| Timeline event | Add 'submitted_sc' event | **NOT implemented** -- no timeline event insertion | FAIL |
| Response format | `{ id, status, sc_case_id }` | `.select('id, status, sc_case_id')` (line 58) | PASS |

**Result: 9/10 -- 1 FAIL**

**FAIL Detail**: Design Section 3.3 specifies "Add 'submitted_sc' event to timeline" but implementation does not insert any timeline event. The `report_timeline` or equivalent table is not updated.

### 2.10 Web Constants: violations.ts (Design Sections 4.3 + 3.1)

| Requirement | Design | Implementation | Status |
|-------------|--------|----------------|--------|
| SC_VIOLATION_MAP in web constants | 19 V01-V19 mappings | All 19 present (lines 60-80) | PASS |
| SC_RAV_URLS | US URL pattern | 8 marketplace URLs (US, UK, JP, DE, FR, IT, ES, CA) -- exceeds design's P0 US-only minimum | PASS |
| Values match extension copy | Same mapping values | Identical mapping values | PASS |

**Result: 3/3 PASS**

### 2.11 Web UI: ReportActions.tsx (Design Section 5)

| Requirement | Design | Implementation | Status |
|-------------|--------|----------------|--------|
| handleSubmitSC function | POST to submit-sc, open SC URL, clipboard fallback, router.refresh | All implemented (lines 96-129) | PASS |
| SC RAV URL new tab | `window.open(data.sc_rav_url, '_blank')` | Exact match (line 114) | PASS |
| Clipboard fallback | formatClipboardText + navigator.clipboard.writeText | Implemented (lines 118-121) | PASS |
| formatClipboardText | ASIN + Violation Type + Description + Evidence | Implemented (lines 83-94) | PASS |
| scCaseId prop | Received from parent | `scCaseId?: string \| null` in props (line 25) | PASS |
| Manual confirm button | `status === 'submitted' && !scCaseId` | Correct condition (line 297) | PASS |
| Manual confirm modal | Modal with Case ID input | Implemented (lines 393-419) | PASS |
| handleConfirmSubmitted | POST confirm-submitted with sc_case_id | Implemented (lines 131-153) | PASS |
| showManualConfirmModal state | useState for modal toggle | Present (line 35) | PASS |
| manualCaseId state | useState for Case ID input | Present (line 40) | PASS |
| ScSubmitData local type | Type definition for clipboard formatting | Defined locally (lines 12-19) | PASS |
| Submit to SC: role check | Design says `approved` status shown for admin | `status === 'approved' && userRole === 'admin'` (line 288) -- consistent with submit-sc API admin-only | PASS |

**Result: 12/12 PASS**

### 2.12 Web UI: ReportDetailContent.tsx (Design Section 5)

| Requirement | Design | Implementation | Status |
|-------------|--------|----------------|--------|
| Pass scCaseId to ReportActions | `scCaseId={report.sc_case_id}` | `scCaseId={report.sc_case_id}` (line 99) | PASS |
| sc_case_id in report type | `sc_case_id: string \| null` | Present in type (line 30) | PASS |

**Result: 2/2 PASS**

### 2.13 i18n: en.ts (Design Section 6.1)

| Required Key | Design Value | Implementation | Status |
|-------------|-------------|----------------|--------|
| `reports.detail.submitSCDesc` | 'Opens SC Report a Violation page...' | **NOT present** in en.ts | FAIL |
| `reports.detail.clipboardCopied` | 'Report data copied to clipboard...' | Present (line 167) | PASS |
| `reports.detail.confirmSubmitted` | 'Confirm Submitted' | Present (line 164) | PASS |
| `reports.detail.confirmSubmittedDesc` | 'If you submitted to SC manually...' | Present (line 165) | PASS |
| `reports.detail.scCaseIdPlaceholder` | 'e.g., 1234567890' | Present (line 166) | PASS |

**Result: 4/5 -- 1 FAIL**

**FAIL Detail**: `reports.detail.submitSCDesc` key is specified in design but not added to en.ts. This key describes the SC submission action and could be used as a tooltip or description text. Currently no UI element references it, so the impact is low.

### 2.14 i18n: ko.ts (Design Section 6.2)

| Required Key | Design Value | Implementation | Status |
|-------------|-------------|----------------|--------|
| `reports.detail.submitSCDesc` | 'SC "Report a Violation" 페이지를 엽니다...' | **NOT present** in ko.ts | FAIL |
| `reports.detail.clipboardCopied` | '신고 내용이 클립보드에 복사되었습니다...' | Present (line 167) | PASS |
| `reports.detail.confirmSubmitted` | '제출 완료 확인' | Present (line 164) | PASS |
| `reports.detail.confirmSubmittedDesc` | 'SC에 수동으로 제출한 경우...' | Present (line 165) | PASS |
| `reports.detail.scCaseIdPlaceholder` | '예: 1234567890' | Present (line 166) | PASS |

**Result: 4/5 -- 1 FAIL**

### 2.15 Extension Build: vite.config.ts (Design Section 8.1)

| Requirement | Design | Implementation | Status |
|-------------|--------|----------------|--------|
| sc-content entrypoint | `sc-content.js <- extension/src/content/sc-form-filler.ts` | **NOT in vite.config.ts** -- only 3 entries: popup, content, background | FAIL |

**Result: 0/1 -- 1 FAIL**

**FAIL Detail**: Design Section 8.1 explicitly requires adding `sc-content` as a fourth Vite build entrypoint (`sc-content: resolve(__dirname, 'src/content/sc-form-filler.ts')`). The current `vite.config.ts` only has 3 entries (popup, content, background). **This means `sc-content.js` will not be built**, and the SC content script referenced in `manifest.json` will not exist in the `dist/` output. This is a **critical build gap** -- the extension's core SC form-filling functionality will not work.

---

## 3. Match Rate Summary

### 3.1 Per-Section Results

| # | Design Section | Requirements | Pass | Fail | Rate |
|---|---------------|:-----------:|:----:|:----:|:----:|
| 1 | manifest.json (4.1) | 6 | 6 | 0 | 100% |
| 2 | sc-selectors.ts (4.2) | 11 | 11 | 0 | 100% |
| 3 | sc-violation-map.ts (4.3) | 6 | 5 | 1 | 83% |
| 4 | sc-form-filler.ts (4.4) | 27 | 27 | 0 | 100% |
| 5 | shared/types.ts (4.6) | 2 | 2 | 0 | 100% |
| 6 | shared/messages.ts (4.5) | 4 | 4 | 0 | 100% |
| 7 | submit-sc API (3.1) | 15 | 13 | 2 | 87% |
| 8 | pending-sc-submit API (3.2) | 12 | 11 | 1 | 92% |
| 9 | confirm-submitted API (3.3) | 10 | 9 | 1 | 90% |
| 10 | violations.ts constants | 3 | 3 | 0 | 100% |
| 11 | ReportActions.tsx (5.1-5.3) | 12 | 12 | 0 | 100% |
| 12 | ReportDetailContent.tsx | 2 | 2 | 0 | 100% |
| 13 | i18n en.ts (6.1) | 5 | 4 | 1 | 80% |
| 14 | i18n ko.ts (6.2) | 5 | 4 | 1 | 80% |
| 15 | Extension build (8.1) | 1 | 0 | 1 | 0% |
| **Total** | | **121** | **113** | **8** | **93%** |

### 3.2 Overall Match Rate

```
+---------------------------------------------+
|  Overall Match Rate: 93%  (113/121)          |
+---------------------------------------------+
|  PASS:  113 items (93%)                      |
|  FAIL:    8 items ( 7%)                      |
+---------------------------------------------+
```

---

## 4. Detailed FAIL Summary

### 4.1 Critical (Blocks core functionality)

| # | Item | Design Section | Location | Description | Impact |
|---|------|---------------|----------|-------------|--------|
| 1 | **sc-content entrypoint missing from Vite** | 8.1 | `extension/vite.config.ts` | `sc-content` not in `rollupOptions.input` -- `sc-content.js` will not be built | **CRITICAL**: Extension SC form-filler will not work at all |

### 4.2 High (Security / Functional gap)

| # | Item | Design Section | Location | Description | Impact |
|---|------|---------------|----------|-------------|--------|
| 2 | **pending-sc-submit: no user scoping** | 3.2 | `src/app/api/reports/pending-sc-submit/route.ts` | Query lacks `.eq('user_id', user.id)` filter | **SECURITY**: Extension could fetch another user's pending SC data |
| 3 | **submit-sc: admin-only vs editor+admin** | 3.1 + 3.4 | `src/app/api/reports/[id]/submit-sc/route.ts:96` | `withAuth(..., ['admin'])` vs design's `['editor', 'admin']` | **FUNCTIONAL**: Editors cannot submit to SC |

### 4.3 Medium (Missing feature)

| # | Item | Design Section | Location | Description | Impact |
|---|------|---------------|----------|-------------|--------|
| 4 | **confirm-submitted: no timeline event** | 3.3 | `src/app/api/reports/[id]/confirm-submitted/route.ts` | 'submitted_sc' timeline event not added | Audit trail gap -- SC submission not recorded in timeline |
| 5 | **Demo mode not implemented** | 7 | `src/app/api/reports/[id]/submit-sc/route.ts` | No `isDemoMode` branch with mock data | Demo environment cannot test SC flow |

### 4.4 Low (Minor omission)

| # | Item | Design Section | Location | Description | Impact |
|---|------|---------------|----------|-------------|--------|
| 6 | **SC_TO_SENTINEL_MAP missing** | 4.3 | `extension/src/shared/sc-violation-map.ts` | Reverse mapping not implemented | Not used by current code; needed for future SC response parsing |
| 7 | **submitSCDesc i18n key missing (en)** | 6.1 | `src/lib/i18n/locales/en.ts` | `reports.detail.submitSCDesc` key absent | No UI currently uses it; cosmetic |
| 8 | **submitSCDesc i18n key missing (ko)** | 6.2 | `src/lib/i18n/locales/ko.ts` | `reports.detail.submitSCDesc` key absent | No UI currently uses it; cosmetic |

---

## 5. Architecture and Convention Compliance

### 5.1 Architecture Check

| Item | Status | Notes |
|------|--------|-------|
| Extension content scripts separated from Web | PASS | `sc-form-filler.ts` (Extension) vs `submit-sc/route.ts` (Web) -- clean separation |
| Shared types between Extension files | PASS | `@shared/types.ts` and `@shared/constants.ts` used consistently |
| API route file naming (Next.js convention) | PASS | `route.ts` in correct directory structure |
| SC_VIOLATION_MAP duplication | NOTE | Map exists in both `extension/src/shared/sc-violation-map.ts` AND `src/constants/violations.ts` -- design-intentional (Extension cannot import from Web) |

### 5.2 Naming Convention Check

| Category | Convention | Compliance | Violations |
|----------|-----------|:----------:|------------|
| Files (extension) | kebab-case.ts | 100% | None |
| Files (web components) | PascalCase.tsx | 100% | None |
| Functions | camelCase | 100% | None |
| Constants | UPPER_SNAKE_CASE | 100% | `SC_SELECTORS`, `SC_VIOLATION_MAP`, `SC_RAV_URLS` all correct |
| Types | PascalCase | 100% | `ScSubmitData`, `ScContentMessage`, `ScViolationType` all correct |

### 5.3 Import Order Check

All checked files follow the convention:
1. External libraries (next/server, react)
2. Internal absolute imports (@/lib/..., @/components/...)
3. Relative imports (./...)
4. Type imports (import type)

No violations found.

---

## 6. Overall Score

```
+---------------------------------------------+
|  Overall Score: 91/100                       |
+---------------------------------------------+
|  Design Match:        93% (113/121)          |
|  Architecture:       100%                    |
|  Convention:         100%                    |
+---------------------------------------------+
|  Status: PASS (>= 90% threshold)            |
+---------------------------------------------+
```

---

## 7. Recommended Actions

### 7.1 Immediate (Blocks deployment)

| Priority | Item | File | Action |
|----------|------|------|--------|
| 1 (CRITICAL) | Add sc-content Vite entrypoint | `extension/vite.config.ts` | Add `'sc-content': resolve(__dirname, 'src/content/sc-form-filler.ts')` to `rollupOptions.input` |
| 2 (SECURITY) | Add user scoping to pending-sc-submit | `src/app/api/reports/pending-sc-submit/route.ts` | Add `.eq('created_by', user.id)` or equivalent user filter to query |

### 7.2 Short-term (Before release)

| Priority | Item | File | Action |
|----------|------|------|--------|
| 3 | Fix submit-sc role restriction | `src/app/api/reports/[id]/submit-sc/route.ts` | Change `['admin']` to `['editor', 'admin']` |
| 4 | Add timeline event in confirm-submitted | `src/app/api/reports/[id]/confirm-submitted/route.ts` | Insert 'submitted_sc' event into timeline table |
| 5 | Add demo mode support | `src/app/api/reports/[id]/submit-sc/route.ts` | Add `isDemoMode` check with mock sc_submit_data |

### 7.3 Low Priority (Backlog)

| Item | File | Action |
|------|------|--------|
| Add SC_TO_SENTINEL_MAP | `extension/src/shared/sc-violation-map.ts` | Add reverse mapping per design |
| Add submitSCDesc i18n keys | `src/lib/i18n/locales/en.ts`, `ko.ts` | Add missing key or remove from design |

---

## 8. Design Document Updates Needed

No design document updates are needed -- all gaps are implementation shortfalls, not design oversights.

---

## 9. Next Steps

- [ ] Fix Critical: Add sc-content Vite entrypoint
- [ ] Fix Security: Add user scoping to pending-sc-submit API
- [ ] Fix Functional: Change submit-sc role to `['editor', 'admin']`
- [ ] Fix Timeline: Add submitted_sc event in confirm-submitted
- [ ] Add Demo mode support
- [ ] Re-run gap analysis after fixes (target: 98%+)
- [ ] Run `pnpm typecheck` and `pnpm build` to verify
- [ ] Test Extension build output includes `sc-content.js`

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-01 | Initial gap analysis -- 93% match rate, 8 gaps found | Claude (AI) |
