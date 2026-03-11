# Detail Page Update -- Gap Analysis Report

> **Feature**: Report Detail + Draft BR Category Sync + Template Transition
> **Design Document**: `docs/02-design/features/detail-page-update.design.md`
> **Analysis Date**: 2026-03-10
> **Analyzer**: gap-detector

---

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 100% | PASS |
| Architecture Compliance | 100% | PASS |
| Convention Compliance | 100% | PASS |
| **Overall** | **100%** | **PASS** |

---

## Per-Item Analysis

### D1: BR Templates API Filtering -- MATCH

**Design**: Add `?form_type=X&category=Y` query parameter filtering to `GET /api/br-templates`

**Implementation** (`src/app/api/br-templates/route.ts`):

| Check | Design | Implementation | Result |
|-------|--------|----------------|--------|
| `form_type` query param | `req.nextUrl.searchParams.get('form_type')` | Line 10: identical | MATCH |
| `category` query param | `req.nextUrl.searchParams.get('category')` | Line 11: identical | MATCH |
| Filter via `.eq('br_form_type', formType)` | Yes | Line 23: `query.eq('br_form_type', formType)` | MATCH |
| Filter via `.eq('category', category)` | Yes | Line 26: `query.eq('category', category)` | MATCH |
| Conditional application (only if param present) | Yes | Lines 22-27: guarded by `if` | MATCH |

**Checks**: 5/5

---

### D2: BrTemplateList Component -- MATCH

**Design**: New component at `src/app/(protected)/reports/[id]/BrTemplateList.tsx` replacing InlineTemplateList.

**Implementation** (`BrTemplateList.tsx`, 229 lines):

| Check | Design | Implementation | Result |
|-------|--------|----------------|--------|
| File exists | New file | Exists, 229 lines | MATCH |
| Props: `formType: BrFormType` | Yes | Line 20: `formType: BrFormType` | MATCH |
| Props: `listing: Partial<Listing>` | Partial listing with asin/title/brand/seller_name/marketplace | Lines 21-27: object type with those fields | MATCH |
| Props: `onApply: (body, title) => void` | Yes | Line 28: `onApply: (body: string, title: string) => void` | MATCH |
| API call: `GET /api/br-templates?form_type={formType}` | Yes | Line 59: `fetch(\`/api/br-templates?form_type=${formType}\`)` | MATCH |
| Category grouping (accordion) | Yes | Lines 77-85: grouped by category Map, accordion toggle | MATCH |
| Placeholder interpolation: `[ASIN]`, `[product name]`, `[brand name]`, `[seller name]`, `[marketplace]` | Yes | Lines 32-41: all 5 replacements with case-insensitive regex | MATCH |
| Search filter (title/code) | title/code | Lines 66-75: filters by title, code, and category | MATCH |
| Preview with 3-line truncation | Yes | Lines 164-166: `split('\n').slice(0, 3)` | MATCH |
| "Use" button applies template | Yes | Lines 87-89 + Line 186: `handleApply` calls `onApply` | MATCH |

**Checks**: 10/10

---

### D3: Form Type Dropdown -- MATCH

**Design**: Add BR category dropdown + guide banner in Draft section of ReportDetailContent.

**Implementation** (`ReportDetailContent.tsx`):

| Check | Design | Implementation | Result |
|-------|--------|----------------|--------|
| State: `brFormType` with `getBrFormType` default | `useState<BrFormType>(getBrFormType(...) ?? 'other_policy')` | Lines 114-116: identical | MATCH |
| Visibility: `isDraftEditable && isBrReportable(...)` | Yes | Line 113: `showBrFormType` computed | MATCH |
| Dropdown with `BR_FORM_OPTIONS` | 4 options | Lines 792-800: select with BR_FORM_OPTIONS.map | MATCH |
| Guide banner: `BR_FORM_DESCRIPTION_GUIDE[brFormType]` | Yes | Line 803: displayed | MATCH |
| Field context: `BR_FORM_FIELD_CONTEXT[brFormType]` | Design mentions guide banner | Line 804: additionally shows field context | MATCH |
| Positioned above Edit/Templates tabs | Yes | Lines 785-807: rendered before isDraftEditable block | MATCH |

**Checks**: 6/6

---

### D4: AI Draft form_type Passthrough -- MATCH

**Design**: User-selected form_type sent to AI draft API and injected into prompt.

**Implementation**:

| Check | Design | Implementation | Result |
|-------|--------|----------------|--------|
| `DraftRequest` has `br_form_type?: BrFormType` | Yes | `route.ts` line 17 | MATCH |
| Client sends `br_form_type` in request body | Yes | `ReportDetailContent.tsx` line 189 | MATCH |
| `generateDraft` options include `brFormType` | Yes | `route.ts` line 141 | MATCH |
| `draft.ts` options type has `brFormType?: BrFormType` | Yes | `draft.ts` line 50 | MATCH |
| Override logic: `options.brFormType ? getBrFormContext(null, brFormType) : violationCode fallback` | Yes | `draft.ts` lines 58-62: identical 3-way logic | MATCH |
| `getBrFormContext` signature: `(violationCode: string \| null, formTypeOverride?: BrFormType)` | Yes | `br-data.ts` line 35: exact match | MATCH |
| BR template query filters by form_type | `brFormType` used in `.eq('br_form_type', ...)` | `route.ts` lines 114-123: user override first, then auto-map | MATCH |

**Checks**: 7/7

---

### D5: Approve with form_type Override -- MATCH

**Design**: Approve API accepts `br_form_type` and passes to `buildBrSubmitData` as `formTypeOverride`.

**Implementation**:

| Check | Design | Implementation | Result |
|-------|--------|----------------|--------|
| Request body includes `br_form_type?: BrFormType` | Yes | `approve/route.ts` line 22 | MATCH |
| `buildBrSubmitData` receives `formTypeOverride: body.br_form_type` | Yes | Line 79 | MATCH |
| `BuildBrDataInput` type has `formTypeOverride?: BrFormType` | Yes | `br-data.ts` line 97 | MATCH |
| `buildBrSubmitData` uses `formTypeOverride ?? BR_VIOLATION_MAP[...]` | Yes | `br-data.ts` line 116 | MATCH |
| Client sends `br_form_type` on approve | Yes | `ReportDetailContent.tsx` line 166 | MATCH |

**Checks**: 5/5

---

### D6: Legacy Reference Cleanup -- MATCH

**Design**: Remove `InlineTemplateList` import, remove `/api/templates` fetch, replace with BrTemplateList and `/api/br-templates`.

**Implementation**:

| Check | Design | Implementation | Result |
|-------|--------|----------------|--------|
| No `InlineTemplateList` import in ReportDetailContent | Removed | Grep: 0 matches | MATCH |
| No `/api/templates` fetch in ReportDetailContent | Removed | Grep: 0 matches | MATCH |
| `BrTemplateList` imported | Yes | Line 17 | MATCH |
| Template auto-suggestion uses `/api/br-templates?form_type=` | Yes | Line 149 | MATCH |
| `<BrTemplateList>` used in mobile view | Yes | Lines 814-823 | MATCH |
| `<BrTemplateList>` used in desktop view | Yes | Lines 890-898 | MATCH |

**Checks**: 6/6

---

## Summary

| # | Item | Checks | Result |
|---|------|:------:|:------:|
| D1 | BR Templates API Filtering | 5/5 | MATCH |
| D2 | BrTemplateList Component | 10/10 | MATCH |
| D3 | Form Type Dropdown | 6/6 | MATCH |
| D4 | AI Draft form_type Passthrough | 7/7 | MATCH |
| D5 | Approve with form_type Override | 5/5 | MATCH |
| D6 | Legacy Reference Cleanup | 6/6 | MATCH |
| **Total** | | **39/39** | **100%** |

---

## Gaps Found

None. All 6 design items are fully implemented as specified.

---

## Recommendations

No action required. Design and implementation are fully aligned.
