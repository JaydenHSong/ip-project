# Phase 4: Report Sync + Data Integration + Code Cleanup — Design

> **Feature**: phase4-report-sync-data-integration
> **Plan**: `.claude/plans/federated-bubbling-star.md`
> **Date**: 2026-04-07
> **Status**: In Progress

---

## 1. Overview

Amazon Ads API를 통해 캠페인 2,423개를 sync 했으나 **성과 데이터(ACoS, ROAS, Spend, Orders)가 비어 있다**. Report Sync를 수정하여 `ads.report_snapshots`에 일별 데이터를 채우고, 이를 Dashboard/Campaign 화면에 연결한다. 이후 200줄 초과 대형 파일 5개를 분리하여 코드 품질을 맞춘다.

---

## 2. Track 1: Report Sync

### 2.1 데이터 흐름

```
Vercel Cron (30분) ─── POST /api/ads/cron/sync-reports
        │
        ▼
  syncReports()  ← src/modules/ads/cron/sync-reports.ts
        │
        ├─ SELECT ads_profile_id FROM ads.marketplace_profiles WHERE is_active = true
        │
        ▼  (for each profile)
  createSyncService(profileId)
        │
        ├─ AMAZON_ADS_ENABLED=true → AmazonAdsAdapter (real)
        └─ AMAZON_ADS_ENABLED≠true → MockAdsAdapter (mock)
        │
        ▼
  syncService.syncReports(profileId, yesterday)
        │
        ├─ 1) SELECT id, brand_market_id FROM ads.marketplace_profiles WHERE ads_profile_id = ?
        ├─ 2) SELECT id, amazon_campaign_id FROM ads.campaigns WHERE marketplace_profile_id = ?
        ├─ 3) adapter.requestReport('sp_campaigns', { start: date, end: date })
        │      └─ POST https://advertising-api.amazon.com/reporting/reports
        │         columns: impressions, clicks, cost, purchases1d, sales1d
        │
        ├─ 4) adapter.downloadReport(reportId)
        │      ├─ GET /reporting/reports/{id} (poll 10회, 3초 간격)
        │      ├─ Download S3 gzipped JSON
        │      └─ Return: AmazonReportMetrics[] (campaign_id, impressions, clicks,
        │                 cost, sales, orders, acos, roas, ctr, cpc, conversion_rate)
        │
        └─ 5) UPSERT ads.report_snapshots
               ON CONFLICT (campaign_id, ad_group_id, keyword_id, report_date, report_level)
               columns: campaign_id, brand_market_id, report_date, report_level='campaign',
                        impressions, clicks, spend(←cost), sales, orders, acos, cpc, ctr, roas
```

### 2.2 버그 수정: sync-reports.ts

**파일**: `src/modules/ads/cron/sync-reports.ts`

| 줄 | 현재 (버그) | 수정 |
|----|-------------|------|
| 13 | `.select('profile_id')` | `.select('ads_profile_id')` |
| 14 | (없음) | `.not('ads_profile_id', 'is', null)` 추가 |
| 28 | `profile.profile_id` | `profile.ads_profile_id as string` |

패턴 참조: `src/modules/ads/cron/sync-campaigns.ts:11-14` (이미 수정됨)

### 2.3 수동 트리거 API

**파일**: `src/app/api/ads/amazon/sync-reports/route.ts` (신규)

```ts
// GET /api/ads/amazon/sync-reports — owner only
export const GET = withAuth(async () => {
  const result = await syncReports()
  return NextResponse.json({ success: true, data: result })
}, ['owner'])

export const maxDuration = 300  // 5분 타임아웃
```

**응답 스펙**:
```json
{
  "success": true,
  "data": { "synced": 2423, "created": 2423, "updated": 0, "errors": 0 }
}
```

### 2.4 DB 테이블: ads.report_snapshots

```
┌──────────────────────────────────────────────────────────┐
│ ads.report_snapshots                                     │
├──────────────────┬───────────┬────────────────────────────┤
│ Column           │ Type      │ Source                     │
├──────────────────┼───────────┼────────────────────────────┤
│ id               │ uuid PK   │ gen_random_uuid()          │
│ campaign_id      │ uuid FK   │ campaignMap[row.campaign_id]│
│ ad_group_id      │ uuid      │ null (campaign-level)      │
│ keyword_id       │ uuid      │ null (campaign-level)      │
│ brand_market_id  │ uuid FK   │ marketplace_profiles lookup│
│ report_date      │ date      │ yesterday                  │
│ report_level     │ text      │ 'campaign'                 │
│ impressions      │ bigint    │ row.impressions             │
│ clicks           │ bigint    │ row.clicks                 │
│ spend            │ numeric   │ row.cost                   │
│ sales            │ numeric   │ row.sales                  │
│ orders           │ integer   │ row.orders                 │
│ acos             │ numeric   │ row.acos (cost/sales×100)  │
│ cpc              │ numeric   │ row.cpc (cost/clicks)      │
│ ctr              │ numeric   │ row.ctr (clicks/impr×100)  │
│ cvr              │ numeric   │ row.conversion_rate        │
│ roas             │ numeric   │ row.roas (sales/cost)      │
│ fetched_at       │ timestamptz│ now()                     │
├──────────────────┴───────────┴────────────────────────────┤
│ UNIQUE (campaign_id, ad_group_id, keyword_id,            │
│         report_date, report_level)                        │
│ INDEX (campaign_id, report_date)                         │
│ INDEX (brand_market_id, report_date)                     │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Track 2: Dashboard/Campaign 데이터 연결

### 3.1 CEO Dashboard (`getCeoDashboard`)

**파일**: `src/modules/ads/features/dashboard/queries.ts`

#### 3.1.1 ROAS Trend 30d

```
report_snapshots
  .select('report_date, brand_market_id, spend, sales')
  .in('brand_market_id', bmIds)
  .eq('report_level', 'campaign')
  .gte('report_date', 30일전)
         │
         ▼
  brand_market_id → brand_name 매핑 (bms 배열)
         │
         ▼
  일별 × 브랜드별 집계
  { date, spend, sales } → roas = sales / spend
         │
         ▼
  RoasTrendPoint[] = [{ date, spigen, legato, cyrill }]
```

**타입**: `RoasTrendPoint = { date: string; spigen: number; legato: number; cyrill: number }`
- 현재 하드코딩된 3개 브랜드명 (spigen, legato, cyrill)
- 차트 컴포넌트(`roas-trend-chart.tsx`)도 같은 키 사용

#### 3.1.2 ACoS Heatmap Delta

```
현재 월 ACoS:  report_snapshots WHERE report_date >= 이번달 1일
전월 ACoS:     report_snapshots WHERE report_date BETWEEN 전월 1일 AND 전월 말일
         │
         ▼
  delta = 현재 ACoS - 전월 ACoS  (양수: 악화, 음수: 개선)
```

### 3.2 Director Dashboard (`getDirectorDashboard`)

**파일**: `src/modules/ads/features/dashboard/queries.ts`

#### 3.2.1 Market Performance 버그

| 줄 | 현재 (버그) | 수정 |
|----|-------------|------|
| 140-142 | `.select('brand_market_id, spend')` | `.select('brand_market_id, spend, sales')` |
| 177 | `sum + (s.spend ?? 0)` ← sales 변수에 spend 대입 | `sum + (s.sales ?? 0)` |

**영향**: ACoS = spend/sales 인데, sales에 spend를 넣으니 항상 ACoS = 100%

#### 3.2.2 Team Performance

```
org_units (parent_id = orgUnitId)  → team 목록
         │
campaigns (org_unit_id IN teamIds) → team별 캠페인 매핑
         │
report_snapshots (campaign_id IN allCampaignIds, report_date >= 이번달 1일)
         │
         ▼
  campaignId → teamId 매핑으로 team별 spend/sales 집계
  TeamPerformanceItem = {
    org_unit_id, team_name,
    spend,                              // MTD
    acos: spend > 0 ? spend/sales×100 : 0,
    delta_acos: 0,                      // 전월 비교 (후속)
    campaigns_count                     // 팀 소속 캠페인 수
  }
```

### 3.3 Campaign List KPI

**파일**: `src/modules/ads/features/campaigns/queries.ts`

```
getCampaigns(query)
  │
  ├─ 1) SELECT * FROM ads.campaigns WHERE brand_market_id = ? ...
  │      → campaigns[] (기존)
  │
  ├─ 2) SELECT campaign_id, spend, sales, orders
  │     FROM ads.report_snapshots
  │     WHERE campaign_id IN (campaignIds)
  │       AND report_level = 'campaign'
  │       AND report_date >= 7일전
  │      → kpiMap<campaign_id, { spend, sales, orders }>
  │
  └─ 3) Enrich
        campaigns.map(c => ({
          ...c,
          spend_7d: kpi.spend,
          sales_7d: kpi.sales,
          orders_7d: kpi.orders,
          acos: sales > 0 ? spend/sales×100 : null,
          roas: spend > 0 ? sales/spend : null,
        }))
```

**참고**: `CampaignListItem` 타입에 `spend_today`, `orders_7d`, `acos`, `roas` 필드가 이미 정의됨.
campaigns 테이블에 이 컬럼들이 없으므로 report_snapshots에서 계산하여 주입.

---

## 4. Track 3: Code Cleanup

### 4.1 sync-service.ts (505 LOC → 5파일)

```
src/modules/ads/api/services/
├── sync-service.ts              (orchestrator, 타입 re-export)
│   └── class SyncService { ... }  포트/DB 주입, 각 sync 모듈 위임
│
├── campaigns-sync.ts            (syncCampaigns 메서드 추출)
│   └── syncCampaigns(adsPort, db, publicDb, profileId): SyncResult
│
├── reports-sync.ts              (syncReports 메서드 추출)
│   └── syncReports(adsPort, db, profileId, date): SyncResult
│
├── brand-analytics-sync.ts      (syncBrandAnalytics + syncOrderPatterns)
│   └── syncBrandAnalytics(spApiPort, db, profileId, date): SyncResult
│   └── syncOrderPatterns(spApiPort, db, profileId): SyncResult
│
└── keyword-analysis.ts          (analyzeKeywords 메서드 추출)
    └── analyzeKeywords(adsPort, db, profileId): AnalysisResult
```

**분리 원칙**: 각 함수는 포트(adapter)와 DB 클라이언트를 파라미터로 받음. SyncService 클래스는 thin orchestrator.

### 4.2 campaign-create-modal.tsx (565 LOC → 6파일)

```
src/modules/ads/features/campaigns/components/
├── campaign-create-modal.tsx     (state 관리 + step 라우팅)
│
├── create-steps/
│   ├── step-team-name.tsx        (Step 1: 팀/브랜드/마켓/마케팅코드/캠페인명)
│   ├── step-mode.tsx             (Step 2: Manual vs AutoPilot + 경고)
│   ├── step-targeting.tsx        (Step 3: 타입/타겟팅/예산/키워드)
│   └── step-review.tsx           (Step 4: 리뷰 요약 + 제출)
│
└── keyword-input.tsx             (키워드 입력/목록 관리 서브컴포넌트)
```

**공유 상태**: 부모 modal이 `formState`를 관리하고, 각 step에 props로 전달.

### 4.3 campaign-detail-panel.tsx (500 LOC → 5파일)

```
src/modules/ads/features/campaigns/components/
├── campaign-detail-panel.tsx     (SlidePanel + 탭 전환)
│
└── detail-tabs/
    ├── overview-tab.tsx          (KPI 카드, 예산, AI 점수, 최근 액션)
    ├── ad-groups-tab.tsx         (광고그룹 목록 + 키워드 수)
    ├── ai-activity-tab.tsx       (자동화 로그)
    └── settings-tab.tsx          (설정 폼 + 수정/저장)
```

### 4.4 shared/types.ts (401 LOC → 6파일)

```
src/modules/ads/shared/types/
├── index.ts                (barrel export)
├── campaigns.ts            (Campaign, AdGroup, Keyword, CampaignType, CampaignMode, ...)
├── reporting.ts            (ReportSnapshot, KpiMetrics, ReportLevel, SearchTermReport)
├── automation.ts           (Rule, AutomationLogEntry, KeywordRecommendation, ActionType, ...)
├── optimization.ts         (DaypartingSchedule, HourlyWeight, SpendDiagnostic, SpendTrend)
└── infrastructure.ts       (MarketplaceProfile, ApiToken, OrdersDailyCache, ...)
```

**마이그레이션**: `shared/types.ts` → `shared/types/index.ts`로 barrel export. 기존 import 경로 `@/modules/ads/shared/types`는 변경 없음 (index.ts가 자동 resolve).

### 4.5 amazon-ads-adapter.ts (382 LOC → 4파일)

```
src/modules/ads/api/adapters/
├── amazon-ads-adapter.ts   (클래스 + base HTTP + 각 resource 위임)
│
└── resources/
    ├── campaigns-api.ts    (listCampaigns, updateCampaign)
    ├── keywords-api.ts     (listKeywords, updateKeywordBid, createKeywords, archiveKeyword)
    └── reports-api.ts      (requestReport, downloadReport, getSearchTermReport)
```

**분리 원칙**: base 클래스의 `request()`, `getHeaders()` 메서드를 protected로 유지. resource 파일은 함수 단위로 export하고, adapter가 위임.

---

## 5. File Change Manifest

| Action | File | Description |
|--------|------|-------------|
| **MODIFY** | `src/modules/ads/cron/sync-reports.ts` | profile_id → ads_profile_id 버그 수정 |
| **NEW** | `src/app/api/ads/amazon/sync-reports/route.ts` | 수동 report sync 트리거 |
| **NEW** | `src/app/api/users/me/route.ts` | 현재 사용자 정보 API (ModuleAccessGate 의존) |
| **MODIFY** | `src/modules/ads/features/dashboard/queries.ts` | sales 버그, ROAS trend, ACoS delta, Team perf |
| **MODIFY** | `src/modules/ads/features/campaigns/queries.ts` | Campaign list KPI enrichment |
| **MODIFY→SPLIT** | `src/modules/ads/api/services/sync-service.ts` | 5개 파일로 분리 |
| **MODIFY→SPLIT** | `src/modules/ads/features/campaigns/components/campaign-create-modal.tsx` | 6개 파일로 분리 |
| **MODIFY→SPLIT** | `src/modules/ads/features/campaigns/components/campaign-detail-panel.tsx` | 5개 파일로 분리 |
| **MODIFY→SPLIT** | `src/modules/ads/shared/types.ts` | 6개 파일로 분리 |
| **MODIFY→SPLIT** | `src/modules/ads/api/adapters/amazon-ads-adapter.ts` | 4개 파일로 분리 |

---

## 6. Implementation Sequence

| Step | Track | Action | 검증 |
|------|-------|--------|------|
| 1 | T1 | sync-reports.ts 버그 수정 | typecheck |
| 2 | T1 | 수동 트리거 API 생성 | typecheck |
| 3 | T1 | 브라우저에서 /api/ads/amazon/sync-reports 호출 | report_snapshots rows 확인 |
| 4 | T2 | Director Dashboard sales 버그 수정 | typecheck |
| 5 | T2 | Campaign List KPI 연결 | typecheck + UI 확인 |
| 6 | T2 | CEO ROAS Trend 30d 구현 | typecheck + UI 차트 확인 |
| 7 | T2 | ACoS delta + Team perf 구현 | typecheck + UI 확인 |
| 8 | T3 | sync-service.ts 분리 | typecheck + lint + build |
| 9 | T3 | campaign-create-modal.tsx 분리 | typecheck + lint + build |
| 10 | T3 | campaign-detail-panel.tsx 분리 | typecheck + lint + build |
| 11 | T3 | types.ts 분리 | typecheck + lint + build |
| 12 | T3 | amazon-ads-adapter.ts 분리 | typecheck + lint + build |
| 13 | ALL | `pnpm typecheck && pnpm lint && pnpm build` | 전체 빌드 성공 |

---

## 7. Verification Checklist

- [ ] `ads.report_snapshots`에 rows 존재 (Supabase MCP로 확인)
- [ ] CEO Dashboard: Brand Pulse 카드에 spend/sales/acos/roas 표시
- [ ] CEO Dashboard: ROAS Trend 30d 차트 데이터 존재
- [ ] CEO Dashboard: ACoS Heatmap delta 값 ≠ 0
- [ ] Director Dashboard: Market Performance ACoS ≠ 100%
- [ ] Director Dashboard: Team Performance spend/acos/campaigns_count 표시
- [ ] Campaign List: 각 캠페인에 spend_7d, acos, roas, orders_7d 표시
- [ ] Campaign Detail: metrics_7d 섹션 데이터 표시
- [ ] 모든 분리된 파일 200줄 이하
- [ ] `pnpm typecheck && pnpm lint && pnpm build` 통과

---

## 8. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-07 | Initial design — T1/T2/T3 전체 설계 |
