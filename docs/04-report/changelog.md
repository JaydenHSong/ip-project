# Sentinel Platform Changelog

All notable changes to the Sentinel project are documented in this file.

---

## [2026-03-01] - SlidePanel Full Integration Complete

### Added
- SlidePanel component backdrop overlay with click-to-close functionality
- Body scroll lock when SlidePanel is open, automatic restore on close
- Size variants for SlidePanel: sm (384px), md (448px), lg (576px), xl (50vw)
- Status prop for optional status display in SlidePanel header
- New Report creation via SlidePanel(lg) in Reports page ("+" button)
- New Campaign creation via SlidePanel(lg) in Campaigns page
- Report quick view preview with SlidePanel(xl) on table/card row click
- Campaign quick view preview with SlidePanel(xl) on table/card row click
- Mobile filter drawer using SlidePanel(sm) for responsive UX (below md breakpoint)
- ESC key close handler for all SlidePanel instances
- TypeScript type safety with SlidePanelSize union ('sm' | 'md' | 'lg' | 'xl')

### Changed
- NewReportForm now supports `embedded` boolean prop to hide page header in SlidePanel context
- NewReportForm now supports `onSuccess` callback for panel close + data refresh
- CampaignForm now supports `embedded` boolean prop for form reusability
- CampaignForm now supports `onSuccess` callback for consistent UX pattern
- CampaignDetailContent migrated to `size="xl"` prop (backward compatible)
- TableFilters component updated with responsive mobile filter drawer pattern
- Mobile view (sm breakpoint) now shows Filter button with active filter count badge

### Fixed
- Body scroll properly restored when SlidePanel closes via ESC key
- Ensure backdrop click outside panel closes it correctly on all screen sizes

### Technical Details
- Design match rate: 100% (51/51 specification items)
- TypeScript build: PASS (no errors)
- Production build: PASS (37 pages)
- Code conventions: 100% compliant

### Files Modified
- `src/components/ui/SlidePanel.tsx`
- `src/app/(protected)/reports/ReportsContent.tsx`
- `src/app/(protected)/reports/new/NewReportForm.tsx`
- `src/app/(protected)/campaigns/CampaignsContent.tsx`
- `src/components/features/CampaignForm.tsx`
- `src/app/(protected)/campaigns/[id]/CampaignDetailContent.tsx`
- `src/components/ui/TableFilters.tsx`
- `docs/archive/2026-03/sentinel/sentinel.design.md` (v0.3, section 5.6)

### Related
- PDCA Report: [SlidePanel Full Integration - Completion Report](./features/reports.report.md)
- Gap Analysis: [reports.analysis.md](../03-analysis/reports.analysis.md)

---

## Previous Releases

Previous release notes can be found in the project git history.
