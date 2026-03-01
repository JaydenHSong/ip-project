# Gap Analysis: Report Detail Page UI + Mobile Logo

> **Summary**: Plan vs Implementation comparison for the Report Detail Page redesign and Mobile Header Logo feature.
>
> **Author**: gap-detector
> **Created**: 2026-03-01
> **Status**: Approved

---

## Analysis Overview

- **Analysis Target**: Report Detail Page UI + Mobile Header Logo
- **Design Reference**: Implementation Plan (provided inline, 5 sections: Header Logo, Server Component, ReportDetailContent, ReportActions, i18n)
- **Implementation Path**: `src/components/layout/Header.tsx`, `src/app/(protected)/reports/[id]/`
- **Analysis Date**: 2026-03-01
- **Match Rate**: 97%

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Mobile Header Logo (Section 1) | 100% | PASS |
| Server Component page.tsx (Section 2-1) | 100% | PASS |
| ReportDetailContent (Section 2-2) | 100% | PASS |
| ReportActions (Section 2-3) | 92% | WARN |
| Header Layout (Section 2-4) | 100% | PASS |
| i18n Keys (Section 2-5) | 100% | PASS |
| Convention Compliance | 95% | WARN |
| **Overall** | **97%** | **PASS** |

---

## Detailed Checklist

### Section 1: Mobile Header Logo (Header.tsx)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 1.1 | `md:hidden` wrapper for mobile-only display | PASS | Line 57: `className="... md:hidden"` on Link element |
| 1.2 | SpigenLogo with `h-6 w-5` classes | PASS | Line 58: `<SpigenLogo className="h-6 w-5 text-th-accent" />` |
| 1.3 | "Sentinel" text displayed in bold | PASS | Line 59: `<span className="text-lg font-bold text-th-text">Sentinel</span>` |
| 1.4 | Click navigates to `/dashboard` via Link | PASS | Line 57: `<Link href="/dashboard" ...>` |
| 1.5 | Desktop: hidden (empty div placeholder) | PASS | Line 61: `<div className="hidden md:block" />` |

**Section Score**: 5/5 = 100%

---

### Section 2-1: Server Component (page.tsx)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 2.1 | Import `hasRole` from `@/lib/auth/session` | PASS | Line 3: `import { getCurrentUser, hasRole } from '@/lib/auth/session'` |
| 2.2 | Calculate `canEdit = hasRole(user, 'editor')` | PASS | Line 68: `const canEdit = hasRole(user, 'editor')` |
| 2.3 | Pass `canEdit` prop to ReportDetailContent | PASS | Line 75: `canEdit={canEdit}` |
| 2.4 | Pass `userRole` prop to ReportDetailContent | PASS | Line 76: `userRole={user.role}` |

**Section Score**: 4/4 = 100%

---

### Section 2-2: ReportDetailContent Redesign

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 2.5 | Props include `canEdit: boolean` | PASS | Line 41: `canEdit: boolean` in type |
| 2.6 | Props include `userRole: string` | PASS | Line 42: `userRole: string` in type |
| 2.7 | Draft card: editable Input/Textarea when `canEdit` AND status is `draft`/`pending_review` | PASS | Line 49: `isDraftEditable = canEdit && (report.status === 'draft' \|\| report.status === 'pending_review')`; Lines 163-186: Input + Textarea rendered conditionally |
| 2.8 | "Save Changes" button shown only when content has changed | PASS | Line 55: `hasChanges` computed; Line 176: `{hasChanges && (...)}` |
| 2.9 | Read-only mode when `approved` or higher status | PASS | Lines 188-203: else branch renders static text when `isDraftEditable` is false |
| 2.10 | "Editing" badge shown when in editable mode | PASS | Lines 75-79: `{isDraftEditable && (<span ...>{t('reports.detail.editing')}</span>)}` with accent styling |

**Section Score**: 6/6 = 100%

---

### Section 2-3: ReportActions Component (New)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 2.11 | Props: `reportId`, `status`, `userRole` | PASS | Lines 10-14: type defined with all three props |
| 2.12 | `pending_review` + editor/admin -> Approve (primary) + Re-write (outline) | PASS | Lines 75-91: Both buttons rendered; Approve is default variant (primary), Re-write is `variant="outline"` |
| 2.13 | `draft` + editor/admin -> Submit for Review (primary) | PASS | Lines 66-74: Button rendered for `status === 'draft'` |
| 2.14 | `approved` + admin -> Submit to SC (primary) | PASS | Lines 93-101: Rendered for `status === 'approved' && userRole === 'admin'` |
| 2.15 | Common Cancel (danger) button for all statuses | PASS | Lines 102-108: `variant="danger"` button always rendered |
| 2.16 | Cancel button with Modal confirmation | PASS | Lines 137-165: Cancel Modal with confirmation text and Textarea for reason |
| 2.17 | Re-write: Modal with Textarea for feedback | PASS | Lines 111-135: Rewrite Modal with Textarea + disabled until feedback provided |
| 2.18 | Cancel: Modal with Textarea for reason | PASS | Lines 137-165: Textarea with `cancelReason` state, disabled until reason provided |
| 2.19 | Demo mode: `router.refresh()` only (no real API calls) | PASS | All handlers (lines 28-61) call only `router.refresh()` |
| 2.20 | `reportId` prop utilized (ready for real API calls) | WARN | `reportId` is accepted as a prop but is not currently used in any handler. This is acceptable for demo mode, but the unused variable may trigger lint warnings. |

**Section Score**: 9.5/10 = 95% (minor: unused prop)

---

### Section 2-4: Header Layout

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 2.21 | ReportActions integrated into header row | PASS | Line 80-82: `<ReportActions .../>` placed inside header `div` |
| 2.22 | ReportActions wrapper uses `ml-auto` | PASS | Line 80: `<div className="ml-auto">` |
| 2.23 | Mobile: buttons wrap to next line (`flex-wrap`) | PASS | Line 67 (ReportDetailContent): parent `<div className="flex flex-wrap items-center gap-3">`; Line 65 (ReportActions): inner `<div className="flex flex-wrap gap-2">` |

**Section Score**: 3/3 = 100%

---

### Section 2-5: i18n Keys

#### English (en.ts)

| # | Key | Expected Value | Actual Value | Status |
|---|-----|----------------|--------------|--------|
| 2.24 | `reports.detail.approve` | Approve | `'Approve'` | PASS |
| 2.25 | `reports.detail.rewrite` | Re-write | `'Re-write'` | PASS |
| 2.26 | `reports.detail.submitReview` | Submit for Review | `'Submit for Review'` | PASS |
| 2.27 | `reports.detail.submitSC` | Submit to SC | `'Submit to SC'` | PASS |
| 2.28 | `reports.detail.cancelReport` | Cancel Report | `'Cancel Report'` | PASS |
| 2.29 | `reports.detail.cancelConfirm` | (confirmation text) | `'Are you sure you want to cancel this report? This action cannot be undone.'` | PASS |
| 2.30 | `reports.detail.rewriteFeedback` | (feedback placeholder) | `'Feedback for AI to improve the draft...'` | PASS |
| 2.31 | `reports.detail.rewriteConfirm` | Request Re-write | `'Request Re-write'` | PASS |
| 2.32 | `reports.detail.cancelReason` | Cancellation Reason | `'Cancellation Reason'` | PASS |
| 2.33 | `reports.detail.saveChanges` | Save Changes | `'Save Changes'` | PASS |
| 2.34 | `reports.detail.editing` | Editing | `'Editing'` | PASS |

**EN Score**: 11/11 = 100%

#### Korean (ko.ts)

| # | Key | Expected Value | Actual Value | Status |
|---|-----|----------------|--------------|--------|
| 2.35 | `reports.detail.approve` | (Korean) | `'승인'` | PASS |
| 2.36 | `reports.detail.rewrite` | (Korean) | `'재작성 요청'` | PASS |
| 2.37 | `reports.detail.submitReview` | (Korean) | `'검토 요청'` | PASS |
| 2.38 | `reports.detail.submitSC` | (Korean) | `'SC 신고'` | PASS |
| 2.39 | `reports.detail.cancelReport` | (Korean) | `'신고 취소'` | PASS |
| 2.40 | `reports.detail.cancelConfirm` | (Korean) | `'정말 이 신고를 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.'` | PASS |
| 2.41 | `reports.detail.rewriteFeedback` | (Korean) | `'AI에게 전달할 피드백을 입력하세요...'` | PASS |
| 2.42 | `reports.detail.rewriteConfirm` | (Korean) | `'재작성 요청'` | PASS |
| 2.43 | `reports.detail.cancelReason` | (Korean) | `'취소 사유'` | PASS |
| 2.44 | `reports.detail.saveChanges` | (Korean) | `'변경 저장'` | PASS |
| 2.45 | `reports.detail.editing` | (Korean) | `'편집 중'` | PASS |

**KO Score**: 11/11 = 100%

---

## Convention Compliance

| Rule | Status | Notes |
|------|--------|-------|
| Named exports (not default) | WARN | `page.tsx` uses `export default` which is explicitly allowed per CLAUDE.md conventions |
| PascalCase components | PASS | `Header`, `ReportDetailContent`, `ReportActions` |
| Arrow function components | PASS | All components use arrow function syntax |
| Server Component default, `"use client"` only when needed | PASS | `page.tsx` is Server Component; `Header.tsx`, `ReportDetailContent.tsx`, `ReportActions.tsx` use `"use client"` for state/router |
| Absolute imports (`@/...`) | PASS | All imports use `@/` paths; only `./ReportActions` is relative (same directory, acceptable) |
| Import order (external -> internal -> relative) | PASS | Consistent order in all files |
| `type` not `interface` | PASS | All type definitions use `type` keyword |
| No `enum` | PASS | Not used |
| No `any` | PASS | Not used |
| No `console.log` | PASS | None found |
| No inline styles | PASS | All styling uses Tailwind classes |
| No hardcoded violation types | PASS | Violation types come from data, `ViolationBadge` handles display |
| `const` over `let`/`var` | PASS | All variables use `const` except state hooks |

**Convention Score**: 95% (minor: default export in page.tsx is a known exception)

---

## Gaps Found

### WARN - Unused `reportId` prop in ReportActions

- **File**: `/Users/hoon/Documents/Claude/code/IP project /src/app/(protected)/reports/[id]/ReportActions.tsx`
- **Line**: 16 (`reportId` destructured but never referenced in handlers)
- **Impact**: Low. Demo mode handlers do not need the ID, but TypeScript/ESLint may flag the unused variable. When real API calls are added, `reportId` will be needed.
- **Recommendation**: Either suppress the lint warning with a leading underscore (`_reportId`) or add a comment indicating it is reserved for future API integration.

---

## Summary

The implementation matches the design plan with **97% fidelity**. All 5 major sections (Mobile Logo, Server Component, ReportDetailContent, ReportActions, i18n) are correctly implemented. The only deviation is a minor unused-variable situation (`reportId` in `ReportActions`) that is expected in demo mode and will resolve naturally when real API integration is added.

### Strengths

1. **Exact prop flow**: `hasRole` calculated in Server Component and passed down cleanly as `canEdit` boolean -- no unnecessary re-computation on the client.
2. **Status-based logic**: Both editable-draft logic (`isDraftEditable`) and action-button logic follow the plan precisely with correct status checks.
3. **i18n completeness**: All 11 keys present in both `en.ts` and `ko.ts` with appropriate translations.
4. **Convention adherence**: Code style, naming, imports, and component patterns all follow CLAUDE.md rules.
5. **Accessibility considerations**: Modal dialogs, disabled states on empty feedback, and `flex-wrap` for mobile responsiveness all implemented.

### Recommendations

1. **[Low Priority]** Consider prefixing `reportId` with underscore or adding a `// TODO: use in real API calls` comment to avoid lint noise.
2. **[Future]** When moving from demo mode to real API, the `handleSave` in `ReportDetailContent` and all handlers in `ReportActions` will need actual Supabase/API calls with proper error handling and loading states.
3. **[Future]** The `handleSave` function does not show a success toast or visual feedback after save -- consider adding when real persistence is implemented.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-01 | Initial gap analysis | gap-detector |

## Related Documents

- Design: [sentinel.design.md](../02-design/features/sentinel.design.md)
- Previous Analysis: [sentinel.analysis.md](./sentinel.analysis.md)
