# Infinite Scroll Tables Planning Document

> **Summary**: Replace pagination with infinite scroll across all 6 table pages
>
> **Project**: Sentinel
> **Version**: 0.9.0-beta
> **Author**: CTO Lead (Claude)
> **Date**: 2026-03-17
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | URL-based pagination creates friction (extra clicks, empty space below short pages, context loss on page switch) |
| **Solution** | Intersection Observer-based infinite scroll with cursor pagination, shared `useInfiniteScroll` hook |
| **Function/UX Effect** | Seamless continuous scrolling, bottom spinner, data appends without page reload |
| **Core Value** | Faster data browsing with fewer interactions, consistent UX across all 6 table pages |

---

## 1. Overview

### 1.1 Purpose

Replace traditional offset/page-based pagination with infinite scroll (load-more-on-scroll) for all 6 table pages. This eliminates the "page N" navigation, removes empty space when data is sparse, and provides a smoother browsing experience.

### 1.2 Background

- Admin users reported that clicking through pages is cumbersome
- When data count < PAGE_SIZE (20), the table looks incomplete with empty space
- All 6 pages share the same pagination pattern, so a single reusable hook can serve all

### 1.3 Related Documents

- Current query: `src/lib/queries/reports.ts` (offset-based `.range()`)
- Table URL utility: `src/lib/utils/table-url.ts`

---

## 2. Scope

### 2.1 In Scope

- [x] Shared `useInfiniteScroll` hook (Intersection Observer + fetch state)
- [x] API route `/api/{resource}/list` for cursor/offset-based fetching
- [x] Report Queue (priority)
- [x] Completed Reports
- [x] Notices
- [x] Patents (IP Assets)
- [x] Campaigns
- [x] Audit Logs
- [x] Bottom loading spinner/skeleton
- [x] Keep all filters, search, sort working (URL params preserved for filters, removed for page)

### 2.2 Out of Scope

- Virtual scrolling / windowing (not needed at current data scale)
- Changing mobile card layout behavior
- Server Component → Client Component migration (pages already use client Content components)

---

## 3. Approach

### 3.1 Architecture Change

**Before**: Server Component fetches page N → passes to Client Content → pagination links at bottom

**After**: Server Component fetches page 1 (initial) → passes to Client Content → Client fetches subsequent pages via API route on scroll

### 3.2 Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scroll detection | Intersection Observer | Native API, no deps, better perf than scroll event |
| Pagination style | Offset-based (keep existing `.range()`) | Cursor pagination requires schema changes; offset is fine for our scale |
| Data fetching | Client-side `fetch` to API route | Server Actions don't support streaming append well |
| Hook location | `src/hooks/useInfiniteScroll.ts` | Reusable across all 6 pages |
| URL params | Remove `?page=N`, keep filters/sort | Filters still URL-driven for shareability |

### 3.3 Implementation Order

1. Create shared `useInfiniteScroll` hook
2. Create `/api/reports/list` API route
3. Convert Report Queue (`ReportsContent.tsx`)
4. Replicate to remaining 5 pages

---

## 4. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Memory usage with large datasets | Medium | Cap max loaded items (e.g., 500), show "scroll to top" |
| Supabase count query overhead | Low | Already using `{ count: 'exact' }`, reuse existing |
| Filter change resets scroll | Low | Clear data and refetch from offset 0 on filter change |
| Browser back button UX | Low | URL no longer has page, but filters preserved |

---

## 5. Success Metrics

- No pagination UI visible on any of the 6 pages
- Scroll to bottom triggers load of next batch
- All existing filters, search, sort continue to work
- Loading spinner visible during fetch
- No regression in mobile card view
