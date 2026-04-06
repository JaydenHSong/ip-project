# S02 Director Dashboard — Design Specification

> **Status**: Mockup complete · Pending review
> **Author**: Frontend Architect
> **Date**: 2026-03-26
> **Mockup**: `mockup/pages/s02-director-dashboard.html`

---

## Overview

The Director (admin role) manages multiple teams across 3 brands and 4+ markets. The S02 dashboard answers 4 questions in under 60 seconds every Monday morning:

1. **Are all teams spending on track?** → Zone 1: Budget Pacing
2. **Which market needs attention?** → Zone 2a: Market Performance Matrix
3. **What did AI do this week?** → Zone 2b: Auto Pilot Summary
4. **What do I need to decide?** → Zone 3b: Pending Actions

---

## Design Principles Applied

- **"읽지 않는 비주얼 인포"** — Every zone answers its question in under 1 second via color and shape, not text reading
- S01 (CEO) is NOT duplicated — no brand pulse cards, no ROAS sparklines, no 3×4 TACoS heatmap
- S02 goes deeper: **budget pacing at market+channel level**, **team attribution**, **actionable approvals**

---

## Layout: 4 Zones

### Screen geometry

```
1440px total
├── 220px  sidebar (fixed, dark)
└── 1220px content area
    ├── 52px   top bar
    ├── ~56px  page header (title + filters)
    └── ~852px scrollable content
        ├── Zone 1 — full width (Budget Pacing)
        ├── Zone 2 — 2-column (Matrix | AI Activity)
        └── Zone 3 — 2-column (Team Table | Pending Actions)
```

---

## Zone 1 — Budget Pacing (Full Width)

**Question answered**: "Is each brand's monthly spend on track today?"

**Visual**: Company roll-up strip (4 summary numbers) + 3-column brand grid, each brand showing 4 market progress bars.

### Elements

| Element | Detail |
|---------|--------|
| Company roll-up | Monthly budget · MTD spend · Projected EOM · Remaining |
| Month progress bar | Purple bar showing Day 26/31 = 84% reference line |
| Brand block header | Brand name · Monthly total · Aggregate % badge (green/amber/red) |
| Market progress bars | 🇺🇸🇨🇦🇩🇪🇯🇵 each with: track + fill + target marker at 84% |
| Deviation label | `+X%` (green) / `−X%` (amber) relative to month-pace target |
| Channel pills | SP/SB/SD spend totals per brand (blue/purple/green tones) |

### Color rules for bar fill

| Condition | Color | Meaning |
|-----------|-------|---------|
| Spent ≥ month-pace −5% | `#059669` green | On track |
| Spent < month-pace −5% | `#D97706` amber | Under-pacing (missed opportunity) |
| Spent > month-pace +5% | `#B91C1C` red | Over-pacing (overspend risk) |

**The target marker** (thin vertical line at 84% when Day 26/31) is the key visual anchor — bars to the left of it are under-pacing, bars past it are over-pacing.

### Why this replaces the old "6 KPI cards"

Old cards showed company totals but gave no pacing signal and no team attribution. A Director needs to see which specific brand×market is off-track, not a single aggregate number.

---

## Zone 2a — Market Performance Matrix

**Question answered**: "Which brand × market combination needs my attention right now?"

**Visual**: 3×4 color-coded grid (Brand rows × Market columns). Each cell shows ACoS + trend arrow. Color = distance from 15% target. Hover tooltip shows ROAS + spend.

### Cell color scale (ACoS vs 15% target)

| ACoS range | Cell color | Semantic |
|-----------|-----------|----------|
| < 13% | Dark green `#D1FAE5` | Excellent |
| 13–15% | Light green `#DCFCE7` | Good / near target |
| 15–18% | Yellow `#FEF9C3` | Watch |
| 18–22% | Amber `#FEF3C7` | Attention needed |
| > 22% | Red `#FEE2E2` | Critical |
| < 20 clicks | Gray `#F3F4F6` | Insufficient data (AI deferred) |

### Why not a table of numbers?

The old "Performance by Marketplace" table required reading each number and mentally comparing. The heatmap gives instant spatial awareness — a red cell in the top-right registers in 200ms, no reading required.

---

## Zone 2b — Auto Pilot Activity

**Question answered**: "What did AI change, and did it help?"

**Visual**: Active/inactive pill + 4 impact metric blocks (ACoS delta, budget saved, KWs added, negatives added) + 4 notable action items with before/after delta badges.

### Key improvement over old "3 numbers" widget

Old widget: "142 actions / 38 keywords / 24 negatives" — numbers with no context.
New widget: Each action shows **what changed** + **estimated or realized impact** (e.g. "$1.2K/week saved", "ROAS +0.4x est."). The Director can assess whether the AI is working as intended.

### Action item types

| Icon type | Meaning |
|-----------|---------|
| ⇑ blue | Bid increases |
| ✕ amber | Negative keywords added |
| ⏸ red | Campaigns paused |
| + green | Keywords promoted (Broad→Exact) |

---

## Zone 3a — Team Performance Table

**Question answered**: "Which team is hitting targets, which isn't?"

**Visual**: 5-row table sorted by budget deviation severity (worst first). Each row: team avatar + name + market scope + budget % used + mini progress bar + ACoS + ROAS trend + spend MTD + status dot.

### Sorting logic

Default sort: Critical → Attention → On track. Within each group, sort by abs(deviation from pace). The Director sees the most urgent team first without scanning.

### Status dot semantics

| Dot | Criteria |
|-----|----------|
| Red "Critical" | Budget > +10% over pace OR ACoS > 20% |
| Amber "Attention" | Budget deviation > 15% (either direction) OR ACoS 18–20% |
| Green "On track" | Budget within ±10% of pace AND ACoS ≤ target |

---

## Zone 3b — Pending Actions

**Question answered**: "What do I need to do right now?"

**Visual**: Grouped action cards with left-border urgency coding (red/amber/blue) + priority icon + description + CTA button.

### Action categories

| Group | Left border | Examples |
|-------|------------|---------|
| Urgent — requires decision | Red | Budget exhausted · AI paused campaigns (needs approval) · Under-pacing alert |
| Watch — no immediate action | Amber | ACoS trending up · Team flagged |
| Info — optional | Blue | New ASIN detected · Template ready |

### Why this replaces "Alerts & Recommendations"

Old alerts were plain text bullets with no visual priority distinction and no in-context CTA. New design: each item has a colored priority signal, a specific scope (brand + market), and a direct action button so the Director can approve/dismiss without navigating elsewhere.

---

## Status Bar (Persistent Footer)

Always-visible strip at bottom of content area showing:
- Data freshness (Marketing Stream timestamp)
- Auto Pilot status + weekly action count
- Anomaly summary (count by severity)
- Guardrail status (hard cap active flag)

The Director can confirm system health without any navigation.

---

## What Was Deliberately Removed

| Old S02 element | Reason removed |
|----------------|----------------|
| 6 KPI number cards ($152K, $687K…) | Company totals with no pacing or team context — duplicates S01 aggregate view |
| "Performance by Marketplace" number table | Replaced by color-coded heatmap; numbers require reading, colors do not |
| 3 text alerts | Replaced by Pending Actions zone with urgency hierarchy and in-context CTAs |
| "Auto Pilot: 142 actions / 38 KW / 24 neg" | Replaced by impact-annotated action list showing WHAT changed and WHY it matters |

---

## Next.js Component Mapping

| Mockup section | Component | Props interface |
|----------------|-----------|----------------|
| Budget pacing card | `BudgetPacingCard` | `brands: BrandBudget[]`, `monthProgress: number` |
| Brand budget block | `BrandBudgetBlock` | `brand`, `markets: MarketPacing[]`, `channels: ChannelSpend[]` |
| Market progress bar | `PacingBar` | `spent`, `budget`, `monthPace` (0–1 float) |
| Performance matrix | `MarketPerformanceMatrix` | `cells: MatrixCell[][]`, `target: number`, `metric: 'acos'\|'tacos'` |
| Matrix cell | `MatrixCell` | `value`, `trend: 'up'\|'down'\|'flat'`, `tooltip` |
| AI activity panel | `AutoPilotPanel` | `actions: AiAction[]`, `impactMetrics: ImpactMetric[]` |
| Team table | `TeamPerformanceTable` | `teams: TeamRow[]` |
| Pending actions | `PendingActionsPanel` | `items: ActionItem[]` |

---

## Design Token Reference

```
Palette (matches existing ARC design system):
  accent:    #F97316  (orange)
  positive:  #059669  (green)
  negative:  #B91C1C  (red)
  warning:   #D97706  (amber)
  info:      #6366F1  (indigo)

Layout:
  padding:   [20px, 28px]
  gap:       16px
  radius:    12px (card), 6–8px (inner)
  border:    #E5E7EB
  card-bg:   #FFFFFF
  app-bg:    #F3F4F6
```
