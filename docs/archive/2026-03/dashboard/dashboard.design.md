# Dashboard Design Document

> **Summary**: 위반 통계 시각화 대시보드 — Recharts 기반 차트, API, Demo 데이터, 반응형 레이아웃
>
> **Project**: Sentinel
> **Author**: Claude (PDCA)
> **Date**: 2026-03-02
> **Status**: Draft
> **Version**: 0.1
> **Plan Reference**: `docs/01-plan/features/dashboard.plan.md`

---

## 1. Architecture Overview

### 1.1 Component Architecture

```
page.tsx (Server Component)
  └─ DashboardContent.tsx (Client Component, 'use client')
       ├─ [Period Filter: 7d | 30d | 90d]
       ├─ StatCard × 6 (활성 캠페인, 대기 신고, 수집 리스팅, 해결률, AI 정확도, 모니터링)
       ├─ ReportTrendChart (AreaChart)
       ├─ ViolationDistChart (PieChart donut)
       ├─ StatusPipelineChart (BarChart horizontal)
       ├─ AiPerformanceCard (stats + mini progress bars)
       ├─ TopViolationsChart (BarChart horizontal)
       └─ [Existing: RecentReports + ActiveCampaigns]
```

### 1.2 Data Flow

```
1. page.tsx: fetchDashboardStats(period) 호출
   ├─ Demo mode → getDemoDashboardStats(period)
   └─ Supabase → /api/dashboard/stats?period=30d (향후)

2. DashboardContent: props로 chartData 수신
   ├─ useState(period) → period 변경 시 재요청
   └─ 차트 컴포넌트에 해당 데이터 전달
```

---

## 2. Data Models

### 2.1 Dashboard Stats Type

```typescript
// src/types/dashboard.ts

type PeriodFilter = '7d' | '30d' | '90d'

type DashboardStats = {
  summary: {
    activeCampaigns: number
    pendingReports: number
    totalListings: number
    resolvedRate: number       // 0~100 (%)
    aiAccuracy: number         // 0~100 (%)
    monitoringCount: number
  }
  reportTrend: {
    date: string               // YYYY-MM-DD
    newReports: number
    resolved: number
  }[]
  violationDist: {
    category: string           // ViolationCategory key
    categoryLabel: string      // 한글/영문 라벨
    count: number
  }[]
  statusPipeline: {
    status: string             // ReportStatus
    statusLabel: string
    count: number
  }[]
  topViolations: {
    code: string               // V01~V19
    name: string               // 위반 유형 이름
    count: number
  }[]
  aiPerformance: {
    avgConfidence: number      // 0~100
    disagreementRate: number   // 0~100 (%)
    approveRate: number        // 0~100 (%)
    rewriteRate: number        // 0~100 (%)
    rejectRate: number         // 0~100 (%)
  }
}
```

### 2.2 Chart Color Tokens

기존 theme 토큰과 일치시킨다:

```typescript
// src/constants/chart-colors.ts

export const CHART_COLORS = {
  // Category colors (ViolationCategory)
  intellectual_property: '#ef4444',  // red
  listing_content: '#f59e0b',       // amber
  review_manipulation: '#8b5cf6',   // violet
  selling_practice: '#3b82f6',      // blue
  regulatory_safety: '#10b981',     // emerald

  // Status colors (matching StatusBadge)
  draft: '#6b7280',                 // gray
  pending_review: '#f59e0b',        // amber
  approved: '#3b82f6',              // blue
  submitted: '#8b5cf6',             // violet
  monitoring: '#06b6d4',            // cyan
  resolved: '#10b981',              // emerald
  rejected: '#ef4444',              // red
  cancelled: '#6b7280',             // gray
  unresolved: '#f97316',            // orange

  // Trend chart
  newReports: '#3b82f6',            // blue (primary)
  resolvedLine: '#10b981',          // emerald (success)
} as const
```

---

## 3. Component Specifications

### 3.1 DashboardContent (리디자인)

**파일**: `src/app/(protected)/dashboard/DashboardContent.tsx`

**변경 사항**:
- Props에 `initialStats: DashboardStats` 추가
- Period filter (7d/30d/90d) 탭 UI 추가
- 기존 4개 stat → 6개 stat 카드
- 차트 영역 추가 (2열 그리드)
- 기존 Recent Reports / Active Campaigns 유지 (하단)

**Props**:
```typescript
type DashboardContentProps = {
  userName: string
  initialStats: DashboardStats
  recentReports: RecentReport[]
  activeCampaigns: ActiveCampaign[]
}
```

**Period Filter 동작**:
- Client-side `useState<PeriodFilter>('30d')`
- Period 변경 시 `fetch('/api/dashboard/stats?period=7d')` 호출
- Demo mode: `getDemoDashboardStats(period)` 직접 호출 (네트워크 불필요)
- 로딩 상태 표시 (skeleton)

**레이아웃**:
```
[Greeting]
[Period: 7d | 30d | 90d]
[Stat Cards: 3×2 mobile, 6×1 desktop]
[ReportTrend (2/3 width) | ViolationDist (1/3 width)]  -- desktop
[StatusPipeline (1/2) | AiPerformance (1/2)]            -- desktop
[TopViolations (full width)]
[RecentReports | ActiveCampaigns]                        -- existing
```

모바일:
```
[Stat Cards: 2×3]
[ReportTrend (full)]
[ViolationDist (full)]
[StatusPipeline (full)]
[AiPerformance (full)]
[TopViolations (full)]
[RecentReports (full)]
[ActiveCampaigns (full)]
```

### 3.2 ReportTrendChart

**파일**: `src/components/features/charts/ReportTrendChart.tsx`

```typescript
type ReportTrendChartProps = {
  data: { date: string; newReports: number; resolved: number }[]
}
```

**Recharts 구성**:
- `<ResponsiveContainer width="100%" height={280}>`
- `<AreaChart data={data}>`
- X축: `<XAxis dataKey="date" />` — `MMM dd` 포맷
- Y축: `<YAxis />`
- 2개 Area: `newReports` (blue, fillOpacity 0.3), `resolved` (emerald, fillOpacity 0.2)
- `<Tooltip />` — 커스텀 포맷 (날짜 + 건수)
- `<Legend />` — 하단
- `<CartesianGrid strokeDasharray="3 3" />`

### 3.3 ViolationDistChart

**파일**: `src/components/features/charts/ViolationDistChart.tsx`

```typescript
type ViolationDistChartProps = {
  data: { category: string; categoryLabel: string; count: number }[]
}
```

**Recharts 구성**:
- `<ResponsiveContainer width="100%" height={280}>`
- `<PieChart>`
- `<Pie data={data} dataKey="count" nameKey="categoryLabel" innerRadius={60} outerRadius={100}>`
- `<Cell>` — CHART_COLORS 카테고리별 색상
- `<Tooltip />` — 카테고리명 + 건수 + 비율%
- 중앙 라벨: 총 건수 (커스텀 렌더)
- `<Legend />` — 하단 가로 배치

### 3.4 StatusPipelineChart

**파일**: `src/components/features/charts/StatusPipelineChart.tsx`

```typescript
type StatusPipelineChartProps = {
  data: { status: string; statusLabel: string; count: number }[]
}
```

**Recharts 구성**:
- `<ResponsiveContainer width="100%" height={280}>`
- `<BarChart data={data} layout="vertical">`
- X축: `<XAxis type="number" />`
- Y축: `<YAxis type="category" dataKey="statusLabel" width={100} />`
- `<Bar dataKey="count">` — 각 Bar에 `<Cell fill={CHART_COLORS[status]}>`
- `<Tooltip />`
- 바 안에 건수 라벨 표시

### 3.5 TopViolationsChart

**파일**: `src/components/features/charts/TopViolationsChart.tsx`

```typescript
type TopViolationsChartProps = {
  data: { code: string; name: string; count: number }[]
}
```

**Recharts 구성**:
- `<ResponsiveContainer width="100%" height={350}>`
- `<BarChart data={data} layout="vertical">`
- Y축: `<YAxis type="category" dataKey="code" width={50} />`
- X축: `<XAxis type="number" />`
- `<Bar dataKey="count" fill="#3b82f6" />`
- `<Tooltip />` — code + name + count
- 건수 내림차순 정렬 (data는 이미 정렬되어 전달)

### 3.6 AiPerformanceCard

**파일**: `src/components/features/charts/AiPerformanceCard.tsx`

```typescript
type AiPerformanceCardProps = {
  data: {
    avgConfidence: number
    disagreementRate: number
    approveRate: number
    rewriteRate: number
    rejectRate: number
  }
}
```

**UI 구성** (차트가 아닌 커스텀 카드):
- 평균 AI 확신도: 큰 숫자 + circular progress 또는 progress bar
- 불일치율: 숫자 + progress bar (warning color if > 20%)
- 승인/Re-write/반려 비율: 3-segment horizontal bar
  - Approve: green, Rewrite: amber, Reject: red

```
┌─────────────────────────────────────┐
│ AI Performance                       │
│                                      │
│ Avg Confidence    ████████░░  82%    │
│ Disagreement Rate ██░░░░░░░░  12%   │
│                                      │
│ Decision Breakdown:                  │
│ ██████████████████████░░░░░░░░░░░░  │
│ Approve: 75%  Rewrite: 15%  Rej: 10%│
└─────────────────────────────────────┘
```

---

## 4. Demo Data

### 4.1 Demo Dashboard Stats Generator

**파일**: `src/lib/demo/dashboard.ts`

기존 `DEMO_REPORTS`, `DEMO_LISTINGS`, `DEMO_MONITORING_REPORTS` 데이터로부터 집계하되,
차트에 풍부한 데이터를 제공하기 위해 **30일분 시계열 mock 데이터**를 생성한다.

```typescript
// src/lib/demo/dashboard.ts

import { DEMO_CAMPAIGNS, DEMO_REPORTS, DEMO_LISTINGS } from './data'
import { DEMO_MONITORING_REPORTS } from './monitoring'
import { VIOLATION_TYPES, VIOLATION_CATEGORIES } from '@/constants/violations'
import type { DashboardStats, PeriodFilter } from '@/types/dashboard'

export const getDemoDashboardStats = (period: PeriodFilter): DashboardStats => {
  // ... 구현
}
```

**생성 전략**:

1. **summary**: 기존 DEMO 데이터 count + 계산값
   - `activeCampaigns`: DEMO_CAMPAIGNS.filter(active).length → 2
   - `pendingReports`: DEMO_REPORTS.filter(draft|pending).length → 2
   - `totalListings`: DEMO_LISTINGS.length → 5
   - `resolvedRate`: (resolved count / total) × 100
   - `aiAccuracy`: 평균 ai_confidence_score
   - `monitoringCount`: DEMO_MONITORING_REPORTS.length → 2

2. **reportTrend**: period 일수만큼 가짜 일별 데이터 생성
   - `seedRandom(date)` 기반으로 일관된 랜덤 값
   - newReports: 0~5/일, resolved: 0~3/일

3. **violationDist**: 5개 카테고리별 건수 (DEMO_REPORTS 기반 + padding)
   ```
   intellectual_property: 8
   listing_content: 5
   review_manipulation: 3
   selling_practice: 2
   regulatory_safety: 1
   ```

4. **statusPipeline**: 모든 status별 건수
   ```
   draft: 3, pending_review: 5, approved: 4,
   submitted: 3, monitoring: 2, resolved: 2,
   rejected: 1, cancelled: 0
   ```

5. **topViolations**: V01~V19 중 건수 내림차순 상위 10개 (mock)
   ```
   V01: 8, V04: 5, V02: 4, V06: 3, V11: 3,
   V03: 2, V05: 2, V08: 2, V07: 1, V16: 1
   ```

6. **aiPerformance**: 고정 mock 값
   ```
   avgConfidence: 82, disagreementRate: 12,
   approveRate: 72, rewriteRate: 18, rejectRate: 10
   ```

---

## 5. API Design

### 5.1 Dashboard Stats API

**엔드포인트**: `GET /api/dashboard/stats`

**파일**: `src/app/api/dashboard/stats/route.ts`

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| period | `7d` \| `30d` \| `90d` | `30d` | 기간 필터 |

**Response**: `DashboardStats` (Section 2.1 참조)

**구현**:
```typescript
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { getDemoDashboardStats } from '@/lib/demo/dashboard'
import type { PeriodFilter } from '@/types/dashboard'

export const GET = async (request: Request) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const period = (searchParams.get('period') ?? '30d') as PeriodFilter

  if (isDemoMode()) {
    return NextResponse.json(getDemoDashboardStats(period))
  }

  // Supabase 집계 쿼리 (향후 구현)
  // ...
}
```

**Demo Mode**: `getDemoDashboardStats(period)` 직접 반환
**Supabase Mode**: 향후 구현 (현재 Demo 우선)

---

## 6. i18n Keys

### 6.1 English (`en.ts`)

```typescript
dashboard: {
  // existing keys...
  aiAccuracy: 'AI Accuracy',
  monitoringActive: 'Monitoring',
  period: {
    label: 'Period',
    '7d': '7 Days',
    '30d': '30 Days',
    '90d': '90 Days',
  },
  charts: {
    reportTrend: 'Report Trend',
    newReports: 'New Reports',
    resolved: 'Resolved',
    violationDist: 'Violation Distribution',
    statusPipeline: 'Report Status',
    topViolations: 'Top Violation Types',
    aiPerformance: 'AI Performance',
    avgConfidence: 'Avg. Confidence',
    disagreementRate: 'Disagreement Rate',
    approveRate: 'Approve',
    rewriteRate: 'Re-write',
    rejectRate: 'Reject',
    decisionBreakdown: 'Decision Breakdown',
    total: 'Total',
    noData: 'No chart data available',
  },
}
```

### 6.2 Korean (`ko.ts`)

```typescript
dashboard: {
  // existing keys...
  aiAccuracy: 'AI 정확도',
  monitoringActive: '모니터링',
  period: {
    label: '기간',
    '7d': '7일',
    '30d': '30일',
    '90d': '90일',
  },
  charts: {
    reportTrend: '신고 추이',
    newReports: '신규 신고',
    resolved: '해결',
    violationDist: '위반 유형 분포',
    statusPipeline: '신고 상태',
    topViolations: 'TOP 위반 유형',
    aiPerformance: 'AI 성과',
    avgConfidence: '평균 확신도',
    disagreementRate: '불일치율',
    approveRate: '승인',
    rewriteRate: '재작성',
    rejectRate: '반려',
    decisionBreakdown: '판정 분포',
    total: '합계',
    noData: '차트 데이터가 없습니다',
  },
}
```

---

## 7. Implementation Order

### Phase A: Setup + Types + Demo Data (~100 LoC)
1. `pnpm add recharts` — Recharts 설치
2. `src/types/dashboard.ts` — DashboardStats, PeriodFilter 타입
3. `src/constants/chart-colors.ts` — 차트 색상 상수
4. `src/lib/demo/dashboard.ts` — Demo 데이터 생성 함수

### Phase B: API (~50 LoC)
5. `src/app/api/dashboard/stats/route.ts` — Dashboard stats API

### Phase C: Chart Components (~500 LoC)
6. `src/components/features/charts/ReportTrendChart.tsx` — 신고 추이 Area Chart
7. `src/components/features/charts/ViolationDistChart.tsx` — 위반 유형 Donut Chart
8. `src/components/features/charts/StatusPipelineChart.tsx` — 상태 Pipeline Bar
9. `src/components/features/charts/TopViolationsChart.tsx` — TOP 위반 유형 Bar
10. `src/components/features/charts/AiPerformanceCard.tsx` — AI 성과 카드

### Phase D: Dashboard Redesign (~200 LoC)
11. `src/app/(protected)/dashboard/page.tsx` — Server Component 수정 (initialStats 전달)
12. `src/app/(protected)/dashboard/DashboardContent.tsx` — 차트 통합 + Period filter

### Phase E: i18n + Polish (~80 LoC)
13. `src/lib/i18n/locales/en.ts` — 영문 키 추가
14. `src/lib/i18n/locales/ko.ts` — 한국어 키 추가
15. 반응형 최적화 + 접근성

**총 예상**: ~930 LoC (Plan 예상 1,130보다 축소 — 기존 코드 재사용)

---

## 8. Recharts Import Strategy

번들 크기 최적화를 위해 tree-shaking + dynamic import:

```typescript
// 각 차트 컴포넌트에서 필요한 것만 import
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
```

차트 컴포넌트 자체를 `dynamic(() => import(...), { ssr: false })`로 lazy load:

```typescript
// DashboardContent.tsx
import dynamic from 'next/dynamic'

const ReportTrendChart = dynamic(
  () => import('@/components/features/charts/ReportTrendChart').then(m => ({ default: m.ReportTrendChart })),
  { ssr: false, loading: () => <ChartSkeleton height={280} /> }
)
```

`ssr: false`인 이유: Recharts는 DOM 의존적이므로 서버 렌더링 불가.

---

## 9. Mobile Responsive Design

| 구간 | Breakpoint | Stats Grid | Chart Layout |
|------|-----------|------------|--------------|
| Mobile | < 768px | 2×3 | 1열 스택 |
| Tablet | 768~1024px | 3×2 | 1열 스택 |
| Desktop | > 1024px | 6×1 | 2열 그리드 |

**모바일 차트 높이**: 220px (데스크탑 280px에서 축소)

Tailwind 클래스:
```html
<!-- Stats -->
<div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">

<!-- Chart Grid -->
<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
  <div class="lg:col-span-2">ReportTrend</div>
  <div>ViolationDist</div>
</div>
<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
  <div>StatusPipeline</div>
  <div>AiPerformance</div>
</div>
```

---

## 10. Accessibility

- 모든 차트에 `role="img"` + `aria-label` 속성
- Tooltip: 키보드 접근 가능 (Recharts 기본 지원)
- 색상 대비: 다크/라이트 모드 모두 WCAG AA 충족하는 색상 사용
- Screen reader: 차트 아래에 `<span className="sr-only">` 텍스트 요약

---

## 11. File List

| # | File | Action | LoC |
|---|------|--------|-----|
| 1 | `src/types/dashboard.ts` | CREATE | ~30 |
| 2 | `src/constants/chart-colors.ts` | CREATE | ~25 |
| 3 | `src/lib/demo/dashboard.ts` | CREATE | ~120 |
| 4 | `src/app/api/dashboard/stats/route.ts` | CREATE | ~40 |
| 5 | `src/components/features/charts/ReportTrendChart.tsx` | CREATE | ~70 |
| 6 | `src/components/features/charts/ViolationDistChart.tsx` | CREATE | ~80 |
| 7 | `src/components/features/charts/StatusPipelineChart.tsx` | CREATE | ~70 |
| 8 | `src/components/features/charts/TopViolationsChart.tsx` | CREATE | ~60 |
| 9 | `src/components/features/charts/AiPerformanceCard.tsx` | CREATE | ~80 |
| 10 | `src/app/(protected)/dashboard/page.tsx` | MODIFY | ~30 delta |
| 11 | `src/app/(protected)/dashboard/DashboardContent.tsx` | MODIFY | ~150 delta |
| 12 | `src/lib/i18n/locales/en.ts` | MODIFY | ~25 delta |
| 13 | `src/lib/i18n/locales/ko.ts` | MODIFY | ~25 delta |
| **Total** | | **9 CREATE + 4 MODIFY** | **~805** |

---

## 12. Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| recharts | ^2.x | Chart library (Plan에서 지정) |

```bash
pnpm add recharts
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-02 | Initial design | Claude (PDCA) |
