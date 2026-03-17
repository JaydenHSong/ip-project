# Infinite Scroll Tables Design Document

> **Summary**: Shared useInfiniteScroll hook + API routes to replace pagination across 6 table pages
>
> **Project**: Sentinel
> **Version**: 0.9.0-beta
> **Author**: CTO Lead (Claude)
> **Date**: 2026-03-17
> **Status**: Draft
> **Planning Doc**: [infinite-scroll-tables.plan.md](../01-plan/features/infinite-scroll-tables.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- Single reusable hook (`useInfiniteScroll`) that all 6 pages adopt
- Minimal server-side changes: API routes that reuse existing query functions
- Preserve all URL-based filter/sort/search behavior
- Smooth UX with sentinel element + loading indicator

### 1.2 Design Principles

- DRY: One hook, one pattern
- Progressive Enhancement: Initial SSR data renders immediately, infinite scroll enhances
- No breaking changes to existing filter/sort mechanisms

---

## 2. Architecture

### 2.1 Component Diagram

```
Server Component (page.tsx)
  |-- fetches page 1 (SSR)
  |-- passes initialData + filters to Client Component
  v
Client Component (*Content.tsx)
  |-- renders initialData
  |-- useInfiniteScroll hook
  |     |-- Intersection Observer on sentinel <div>
  |     |-- fetch('/api/{resource}/list?offset=N&...filters')
  |     |-- appends to local state
  |     v
  |-- renders accumulated rows
  |-- sentinel div at bottom (loading spinner)
```

### 2.2 Data Flow

```
1. SSR: page.tsx → fetchReports(params) → initial 20 rows
2. Client mount: useInfiniteScroll({ initialData, totalCount, pageSize, fetchUrl, filters })
3. User scrolls → sentinel enters viewport
4. Hook fetches: GET /api/reports/list?offset=20&status=draft&sort_field=date&sort_dir=desc
5. Response: { data: [...20 rows], totalCount: 150 }
6. Hook appends rows to state, updates offset
7. Repeat until offset >= totalCount
```

---

## 3. Component Design

### 3.1 useInfiniteScroll Hook

**File**: `src/hooks/useInfiniteScroll.ts`

```typescript
type UseInfiniteScrollOptions<T> = {
  initialData: T[]
  totalCount: number
  pageSize: number
  fetchUrl: string
  filterParams: Record<string, string>
}

type UseInfiniteScrollReturn<T> = {
  data: T[]
  isLoading: boolean
  hasMore: boolean
  sentinelRef: React.RefObject<HTMLDivElement>
  reset: () => void
}
```

**Behavior**:
- Maintains `data` array starting from `initialData`
- `sentinelRef` attaches to a div below the table
- When sentinel enters viewport AND `hasMore` AND not `isLoading` → fetch next page
- `reset()` called when filters/sort change → clears to empty, refetches from offset 0
- On filter/sort change: router navigates (SSR re-renders page.tsx with new initial data), hook reinitializes via key or effect

### 3.2 API Route Pattern

**File**: `src/app/api/{resource}/list/route.ts`

Each API route:
1. Authenticates via `getCurrentUser()`
2. Reads search params (offset, filters, sort)
3. Calls existing query function (e.g., `fetchReports`)
4. Returns JSON `{ data, totalCount }`

### 3.3 Content Component Changes

For each `*Content.tsx`:
1. Remove pagination section (Link-based page numbers)
2. Add `useInfiniteScroll` hook
3. Replace static `reports` prop rendering with `data` from hook
4. Add sentinel `<div ref={sentinelRef}>` after table body
5. Show loading spinner when `isLoading`
6. Remove `page`, `totalPages` props (no longer needed)

---

## 4. Implementation Details

### 4.1 File Changes

| File | Change |
|------|--------|
| `src/hooks/useInfiniteScroll.ts` | **NEW** — Shared hook |
| `src/app/api/reports/list/route.ts` | **NEW** — API for report queue |
| `src/app/api/reports/completed/list/route.ts` | **NEW** — API for completed reports |
| `src/app/api/notices/list/route.ts` | **NEW** — API for notices |
| `src/app/api/patents/list/route.ts` | **NEW** — API for patents/IP assets |
| `src/app/api/campaigns/list/route.ts` | **NEW** — API for campaigns |
| `src/app/api/audit-logs/list/route.ts` | **NEW** — API for audit logs |
| `src/app/(protected)/reports/ReportsContent.tsx` | **MODIFY** — Use hook, remove pagination |
| `src/app/(protected)/reports/page.tsx` | **MODIFY** — Remove totalPages passing |
| `src/app/(protected)/reports/completed/CompletedReportsContent.tsx` | **MODIFY** |
| `src/app/(protected)/notices/NoticesContent.tsx` | **MODIFY** |
| `src/app/(protected)/patents/PatentsContent.tsx` | **MODIFY** |
| `src/app/(protected)/campaigns/CampaignsContent.tsx` | **MODIFY** |
| `src/app/(protected)/audit-logs/AuditLogsContent.tsx` | **MODIFY** |
| `src/lib/queries/reports.ts` | **MODIFY** — Export PAGE_SIZE, make query reusable |

### 4.2 Implementation Order

1. `useInfiniteScroll.ts` hook
2. `/api/reports/list/route.ts` + modify `reports.ts` query
3. `ReportsContent.tsx` + `reports/page.tsx` conversion
4. Verify Report Queue works end-to-end
5. Replicate to remaining 5 pages

### 4.3 Loading Indicator

```tsx
{/* Sentinel element — placed after table rows */}
<div ref={sentinelRef} className="flex justify-center py-4">
  {isLoading && (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-th-accent border-t-transparent" />
  )}
</div>
```

### 4.4 Filter/Sort Reset Strategy

When filters or sort change:
- Server Component re-renders with new initial data (existing URL-based navigation)
- Hook detects `initialData` change via dependency → resets internal state
- This preserves the existing SSR pattern without additional complexity

---

## 5. Edge Cases

| Case | Handling |
|------|----------|
| Empty results | Show existing "no results" message, sentinel hidden |
| All data loaded | `hasMore = false`, sentinel invisible |
| Rapid scrolling | `isLoading` guard prevents duplicate fetches |
| Network error | Show toast, keep existing data, allow retry on next scroll |
| Filter change mid-scroll | SSR re-renders with fresh initial data, hook resets |
| Mobile view | Cards also use infinite scroll (same sentinel approach) |

---

## 6. Testing Checklist

- [ ] Report Queue: scroll loads more, filters work, sort works
- [ ] Completed Reports: same behavior
- [ ] Notices: same behavior
- [ ] Patents: same behavior
- [ ] Campaigns: same behavior
- [ ] Audit Logs: same behavior
- [ ] Mobile card view: infinite scroll works
- [ ] Empty state: no infinite loading loop
- [ ] All data loaded: spinner stops, sentinel hidden
- [ ] typecheck + lint + build pass
