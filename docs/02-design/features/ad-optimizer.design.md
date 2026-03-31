# AD Optimizer — Design Document

> **Feature**: AD Optimizer Module
> **Date**: 2026-03-30
> **Author**: Jayden Song
> **Project**: A.R.C. (Amazon Resource Controller)
> **Version**: 0.1
> **Plan**: `docs/01-plan/features/ad-optimizer.plan.md`
> **Architecture**: Option C — Feature-Based Module

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 수동 광고 운영의 비효율 제거 + 외부 SaaS 비용 절감 + 내부 데이터 통합 차별화 |
| **WHO** | Spigen 마케팅/광고 운영팀 (3 브랜드 × 4+ 마켓 = 12+ 계정, 팀별 권한) |
| **RISK** | Amazon API 인증 미확보, Marketing Stream AWS 인프라 셋업, 자동화 안전장치 미흡 시 예산 낭비 |
| **SUCCESS** | 광고 운영 시간 70% 절감, 키워드 발굴 자동화율 80%+, 예산 소진율 90%+ (Daily Pacing) |
| **SCOPE** | Phase 1: Campaign Mgmt + Optimization Engine MVP → Phase 2: Full Auto Pilot + Marketing Stream 고도화 |

---

## Design Anchor

| Token | Value | Note |
|-------|-------|------|
| **Grayscale** | #18181B / #6B7280 / #9CA3AF / #D1D5DB / #E5E7EB / #F3F4F6 / #F9FAFB / #FFFFFF | Monotone 기반 |
| **Accent** | #F97316 (Primary) / #FDBA74 (Light) / #92400E (Dark) | 오렌지만 |
| **Semantic** | #059669 (Positive) / #B91C1C (Negative) / #F97316 (Warning) | 텍스트+dot만, 배경 X |
| **Typography** | Inter / System UI, 32px hero → 18px title → 14px body → 12px caption | |
| **Spacing** | 4px grid, 16/24/32px 간격 | |
| **Radius** | 8px (cards) / 6px (buttons) / 4px (inputs/badges) | |
| **Tone** | Professional, data-dense, visual-first ("읽지 않는 비주얼 인포") | |
| **Layout** | 1440px total = 220px sidebar + 1220px content, 52px top bar | |

---

## 1. Overview

### 1.1 Design Goals

1. **Feature-Based Module 구조** — 화면 단위 독립 개발, PM 협업 충돌 최소화
2. **Multi-Account First** — 12+ Amazon 계정의 인증/데이터를 안전하게 분리
3. **Phase 1 독립 동작** — Ads API 인가 전에도 내부 DB 기능 동작 (예산, 규칙, 시뮬레이션)
4. **3-Tier Automation** — Rule Engine → Algorithm → ML 단계적 자동화
5. **안전장치 내장** — 10개 Guardrail이 모든 자동화 액션에 선행

### 1.2 Design Principles

- **Server Components 기본** — 데이터 fetching은 서버에서, 인터랙션 필요한 부분만 `"use client"`
- **Colocation** — 한 feature의 components/queries/types를 같은 폴더에 배치
- **Module Isolation** — `modules/ads/`는 `modules/ip/`를 절대 참조하지 않음
- **Supabase RLS** — org_unit_id + brand_market_id 기반 자동 행 필터링

---

## 2. Architecture

### 2.1 Selected: Option C — Feature-Based Module

```
src/modules/ads/
├── features/                         ← 화면/기능 단위
│   ├── dashboard/                    ← S01 CEO, S02 Director
│   │   ├── components/
│   │   │   ├── ceo-dashboard.tsx        S01
│   │   │   ├── director-dashboard.tsx   S02
│   │   │   ├── brand-pulse-card.tsx
│   │   │   ├── budget-pacing-bar.tsx
│   │   │   ├── acos-heatmap.tsx
│   │   │   └── roas-trend-chart.tsx
│   │   ├── queries.ts
│   │   └── types.ts
│   │
│   ├── campaigns/                    ← S03 Marketer + M01 Create + M02 Detail
│   │   ├── components/
│   │   │   ├── campaign-table.tsx       S03 메인 테이블
│   │   │   ├── campaign-status-strip.tsx
│   │   │   ├── campaign-create-modal.tsx  M01a-d (4 step wizard)
│   │   │   ├── campaign-detail-panel.tsx  M02 (slide panel)
│   │   │   ├── marketing-code-input.tsx   6자리 코드 생성기
│   │   │   └── ai-queue-preview.tsx
│   │   ├── queries.ts
│   │   └── types.ts
│   │
│   ├── optimization/                 ← S04 Bidding, S05 Budget, S06 Keywords, S07 Dayparting, S11 AI Rec
│   │   ├── components/
│   │   │   ├── optimization-layout.tsx    공통 레이아웃 (탭 + context bar)
│   │   │   ├── bid-optimization.tsx       S04
│   │   │   ├── daily-budget-pacing.tsx    S05
│   │   │   ├── keywords-management.tsx    S06
│   │   │   ├── dayparting-schedule.tsx    S07
│   │   │   ├── ai-recommendations.tsx     S11
│   │   │   ├── keyword-action-queue.tsx
│   │   │   ├── heatmap-grid.tsx           24h×7d 히트맵
│   │   │   ├── hourly-spend-chart.tsx
│   │   │   ├── rule-create-modal.tsx      M03
│   │   │   ├── alert-detail-modal.tsx     M04
│   │   │   └── underspend-modal.tsx       M05
│   │   ├── queries.ts
│   │   └── types.ts
│   │
│   ├── autopilot/                    ← S08 Main, S09 Detail
│   │   ├── components/
│   │   │   ├── autopilot-list.tsx         S08 테이블
│   │   │   ├── autopilot-detail.tsx       S09
│   │   │   ├── ai-activity-log.tsx        S09 hero
│   │   │   ├── confidence-bar.tsx
│   │   │   └── rollback-button.tsx
│   │   ├── queries.ts
│   │   └── types.ts
│   │
│   ├── budget-planning/              ← S13 Annual Budget Planning
│   │   ├── components/
│   │   │   ├── budget-grid.tsx            12개월 입력 그리드
│   │   │   ├── budget-kpi-strip.tsx
│   │   │   ├── plan-vs-actual-chart.tsx
│   │   │   ├── channel-breakdown.tsx
│   │   │   ├── change-log-viewer.tsx
│   │   │   └── excel-import-modal.tsx
│   │   ├── queries.ts
│   │   └── types.ts
│   │
│   └── spend-intelligence/           ← S12 Spend Intelligence
│       ├── components/
│       │   ├── spend-leak-summary.tsx
│       │   ├── top-wasters-table.tsx
│       │   ├── trend-alerts.tsx
│       │   ├── ai-diagnosis-card.tsx
│       │   └── quick-fix-actions.tsx
│       ├── queries.ts
│       └── types.ts
│
├── shared/                           ← 모듈 내 공통
│   ├── components/
│   │   ├── kpi-card.tsx                 KPI 숫자 카드 (재사용)
│   │   ├── campaign-badge.tsx           Auto Pilot / Manual 뱃지
│   │   ├── market-selector.tsx          마켓 셀렉터 (단일 선택)
│   │   ├── campaign-selector.tsx        캠페인 셀렉터 (단일)
│   │   ├── bulk-action-bar.tsx          다크 벌크 액션 바
│   │   ├── status-badge.tsx             Running/Learning/Paused 등
│   │   ├── progress-bar.tsx             예산 소진율 등
│   │   ├── trend-tag.tsx                Rising/Emerging/Stable/Declining
│   │   ├── semantic-dot.tsx             컬러 dot (Bid/Keyword/Budget 등)
│   │   └── empty-state.tsx              빈 상태 메시지
│   ├── hooks/
│   │   ├── use-market-context.ts        현재 선택된 마켓 컨텍스트
│   │   ├── use-campaigns.ts             캠페인 목록 훅
│   │   └── use-guardrails.ts            안전장치 검증 훅
│   └── types.ts                         Campaign, Keyword 등 공통 타입
│
├── api/                              ← Amazon API 클라이언트
│   ├── ads-api.ts                       Ads API v1 wrapper
│   ├── sp-api.ts                        SP-API wrapper (Orders, Catalog, Notifications)
│   ├── token-manager.ts                 OAuth 토큰 관리 (multi-account, 캐시)
│   └── types.ts                         API 응답 타입
│
├── engine/                           ← 자동화 엔진 (Tier 1-3)
│   ├── rule-engine.ts                   IF/THEN 규칙 실행기
│   ├── bid-calculator.ts                ACoS 기반 bid 계산 (bid = target_acos × AOV × CVR)
│   ├── budget-pacer.ts                  Daily pacing 로직
│   ├── keyword-scorer.ts                키워드 점수화 (CVR × relevance / ACoS)
│   ├── dayparting-engine.ts             시간대별 bid multiplier
│   ├── guardrails.ts                    10개 안전장치 (FR-G01~G10)
│   └── types.ts
│
└── cron/                             ← 배치 크론잡 로직
    ├── sync-campaigns.ts                Ads API → ads.campaigns (1시간)
    ├── sync-reports.ts                  Reporting → ads.report_snapshots (새벽 2시)
    ├── brand-analytics.ts               Brand Analytics → keyword_rankings (월요일)
    ├── keyword-analysis.ts              Search Term → keyword_recommendations (매일)
    ├── dayparting-apply.ts              bid multiplier 적용 (매 시간)
    └── orders-pattern.ts                Orders DB → dayparting_hourly_weights (주 1회)
```

### 2.2 Page Routes (App Router)

```
src/app/(protected)/ads/
├── layout.tsx                        ← 사이드바 + 헤더 + MarketProvider
├── page.tsx                          ← /ads → 역할별 리다이렉트
├── dashboard/
│   └── page.tsx                      ← /ads/dashboard → S01 or S02 (역할별)
├── campaigns/
│   ├── page.tsx                      ← /ads/campaigns → S03 (Campaigns | Budget Planning 탭)
│   └── [id]/
│       └── page.tsx                  ← /ads/campaigns/[id] → M02 (or S09 if autopilot)
├── optimization/
│   ├── page.tsx                      ← /ads/optimization → S04 기본 (Bidding 탭)
│   └── recommendations/
│       └── page.tsx                  ← /ads/optimization/recommendations → S11
├── autopilot/
│   ├── page.tsx                      ← /ads/autopilot → S08
│   └── [id]/
│       └── page.tsx                  ← /ads/autopilot/[id] → S09
└── reports/
    └── page.tsx                      ← /ads/reports → S12
```

### 2.3 API Routes

```
src/app/api/ads/
├── campaigns/
│   ├── route.ts                      GET (목록) / POST (생성)
│   └── [id]/
│       └── route.ts                  GET / PUT / DELETE
├── keywords/
│   ├── route.ts                      GET / POST (벌크)
│   └── [id]/
│       └── route.ts                  PUT / DELETE
├── recommendations/
│   ├── route.ts                      GET (목록)
│   └── [id]/
│       └── approve/
│           └── route.ts              POST (승인 실행)
├── rules/
│   ├── route.ts                      GET / POST
│   ├── [id]/
│   │   └── route.ts                  PUT / DELETE
│   └── simulate/
│       └── route.ts                  POST (영향도 미리보기)
├── budgets/
│   ├── route.ts                      GET / POST / PUT
│   ├── import/
│   │   └── route.ts                  POST (엑셀 import)
│   └── change-log/
│       └── route.ts                  GET
├── alerts/
│   ├── route.ts                      GET (목록)
│   └── [id]/
│       ├── route.ts                  GET (상세)
│       └── action/
│           └── route.ts              POST (Quick Action 실행)
├── autopilot/
│   ├── route.ts                      GET (AP 캠페인 목록 + KPI)
│   └── [id]/
│       ├── route.ts                  GET (상세 + 로그)
│       ├── rollback/
│       │   └── route.ts              POST (롤백 실행)
│       └── settings/
│           └── route.ts              PUT (Target ACoS, Weekly Budget)
├── reports/
│   ├── snapshots/
│   │   └── route.ts                  GET (성과 스냅샷)
│   ├── spend-intelligence/
│   │   └── route.ts                  GET (누수 진단)
│   └── export/
│       └── route.ts                  POST (CSV/Google Sheets)
├── dayparting/
│   ├── heatmap/
│   │   └── route.ts                  GET (히트맵 데이터)
│   ├── schedules/
│   │   └── route.ts                  GET / PUT (그룹별 스케줄)
│   └── ai-schedule/
│       └── route.ts                  GET (AI 추천) / POST (적용)
├── dashboard/
│   ├── ceo/
│   │   └── route.ts                  GET (CEO 집계)
│   ├── director/
│   │   └── route.ts                  GET (Director 집계)
│   └── marketer/
│       └── route.ts                  GET (Marketer 집계)
├── amazon/
│   ├── token/
│   │   └── route.ts                  POST (토큰 교환/갱신)
│   └── sync/
│       └── route.ts                  POST (수동 동기화 트리거)
└── cron/
    ├── sync-campaigns/
    │   └── route.ts                  POST (Vercel Cron)
    ├── sync-reports/
    │   └── route.ts                  POST
    ├── brand-analytics/
    │   └── route.ts                  POST
    ├── keyword-analysis/
    │   └── route.ts                  POST
    ├── dayparting-apply/
    │   └── route.ts                  POST
    └── orders-pattern/
        └── route.ts                  POST
```

### 2.4 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         App Router Layer                         │
│  /ads/dashboard  /ads/campaigns  /ads/optimization  /ads/auto..  │
│  (Server Components — data fetching + layout)                    │
└──────────────┬──────────────────────────────────────────────────┘
               │ import
┌──────────────▼──────────────────────────────────────────────────┐
│                    modules/ads/features/*                         │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌─────────┐           │
│  │dashboard/│ │campaigns/│ │optimization│ │autopilot│ ...        │
│  │ queries  │ │ queries  │ │  queries   │ │ queries │           │
│  │ comps    │ │ comps    │ │  comps     │ │ comps   │           │
│  │ types    │ │ types    │ │  types     │ │ types   │           │
│  └────┬─────┘ └────┬─────┘ └─────┬──────┘ └────┬────┘           │
│       │             │              │              │               │
│  ┌────▼─────────────▼──────────────▼──────────────▼────┐         │
│  │              modules/ads/shared/                     │         │
│  │  components/ (KPI Card, Badge, Selector...)          │         │
│  │  hooks/ (useMarketContext, useCampaigns...)           │         │
│  │  types.ts (Campaign, Keyword, Budget...)             │         │
│  └──────────────────┬──────────────────────────────────┘         │
└─────────────────────┼────────────────────────────────────────────┘
                      │ import
┌─────────────────────▼────────────────────────────────────────────┐
│                    modules/ads/api/                                │
│  ads-api.ts ←→ Amazon Ads API v1                                  │
│  sp-api.ts  ←→ Amazon SP-API (Orders, Catalog, Brand Analytics)   │
│  token-manager.ts ←→ OAuth2 Token Exchange (multi-account)        │
└─────────────────────┬────────────────────────────────────────────┘
                      │ import
┌─────────────────────▼────────────────────────────────────────────┐
│                    modules/ads/engine/                             │
│  rule-engine.ts    — Tier 1: IF/THEN deterministic                │
│  bid-calculator.ts — Tier 2: Statistical optimization             │
│  budget-pacer.ts   — Tier 2: 24h even/weighted distribution       │
│  keyword-scorer.ts — Tier 2: (CVR × relevance) / ACoS            │
│  guardrails.ts     — 10 safety checks (FR-G01~G10)               │
└─────────────────────┬────────────────────────────────────────────┘
                      │ import
┌─────────────────────▼────────────────────────────────────────────┐
│                    modules/ads/cron/                               │
│  sync-campaigns.ts  — 1h cycle                                    │
│  sync-reports.ts    — daily 2AM                                   │
│  keyword-analysis.ts — daily                                      │
│  dayparting-apply.ts — hourly                                     │
│  brand-analytics.ts  — weekly (Monday)                            │
│  orders-pattern.ts   — weekly                                     │
└──────────────────────────────────────────────────────────────────┘

External Dependencies (OK):
  modules/ads/ → components/ui/      (공통 UI)
  modules/ads/ → lib/auth/           (withAuth)
  modules/ads/ → lib/supabase/       (createClient)

FORBIDDEN:
  modules/ads/ ✕→ modules/ip/
```

---

## 3. Data Model (ERD)

### 3.1 Schema Overview

모든 테이블은 `ads` 스키마에 생성. `public.*` 테이블은 READ ONLY.

```
┌─────────── public (READ ONLY) ───────────┐
│ users ── org_units ── user_org_units      │
│ brands ── brand_markets                   │
│ brand_market_permissions                  │
│ module_access_configs                     │
│ system_configs                            │
└───────────────────────────────────────────┘
         │ FK (org_unit_id, brand_market_id)
         ▼
┌─────────── ads schema ────────────────────────────────────────┐
│                                                                │
│  ┌──────────────────┐     ┌──────────────────┐                │
│  │ marketplace_     │     │  api_tokens       │                │
│  │ profiles         │──┐  │  (OAuth 캐시)     │                │
│  └──────────────────┘  │  └──────────────────┘                │
│           │            │                                       │
│  ┌────────▼─────────┐  │  ┌──────────────────┐                │
│  │   campaigns      │◄─┘  │    budgets        │                │
│  │   (핵심 엔티티)   │     │  (연간 예산)      │                │
│  └──┬───┬───┬───┬───┘     └────────┬─────────┘                │
│     │   │   │   │                  │                           │
│     │   │   │   │         ┌────────▼─────────┐                │
│     │   │   │   │         │ budget_change_log │                │
│     │   │   │   │         └──────────────────┘                │
│     │   │   │   │                                              │
│  ┌──▼┐ ┌▼──┐ ┌▼────────┐  ┌──────────────┐                   │
│  │ad_│ │key│ │report_   │  │  rules        │                   │
│  │grp│ │wds│ │snapshots │  │  (자동화 규칙) │                   │
│  └───┘ └───┘ └──────────┘  └──────────────┘                   │
│                                                                │
│  ┌──────────────────┐  ┌────────────────────┐                  │
│  │ automation_log   │  │ keyword_            │                  │
│  │ (AI 활동 이력)    │  │ recommendations    │                  │
│  └──────────────────┘  └────────────────────┘                  │
│                                                                │
│  ┌──────────────────┐  ┌────────────────────┐                  │
│  │ keyword_rankings │  │ search_term_reports │                  │
│  └──────────────────┘  └────────────────────┘                  │
│                                                                │
│  ┌──────────────────┐  ┌────────────────────┐                  │
│  │ dayparting_      │  │ dayparting_         │                  │
│  │ schedules        │  │ hourly_weights      │                  │
│  └──────────────────┘  └────────────────────┘                  │
│                                                                │
│  ┌──────────────────┐  ┌────────────────────┐                  │
│  │ alerts           │  │ spend_diagnostics   │                  │
│  └──────────────────┘  └────────────────────┘                  │
│                                                                │
│  ┌──────────────────┐  ┌────────────────────┐                  │
│  │ change_log       │  │ spend_trends        │                  │
│  └──────────────────┘  └────────────────────┘                  │
│                                                                │
│  ┌──────────────────┐  ┌────────────────────┐                  │
│  │ orders_daily_    │  │ marketing_stream_   │                  │
│  │ cache            │  │ hourly (Phase 2)    │                  │
│  └──────────────────┘  └────────────────────┘                  │
│                                                                │
│  ┌──────────────────┐  ┌────────────────────┐                  │
│  │ notifications_   │  │ cache_autopilot_    │                  │
│  │ log              │  │ summary             │                  │
│  └──────────────────┘  └────────────────────┘                  │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Table Definitions

#### ads.marketplace_profiles — 계정별 API 인증 정보

```sql
CREATE TABLE ads.marketplace_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  -- brand + marketplace 통합 (예: Spigen+US, Legato+JP)
  seller_id text,                       -- Amazon Seller ID
  ads_profile_id text,                  -- Amazon Ads Profile ID
  refresh_token_key text NOT NULL,      -- Doppler 환경변수 키 이름 (값은 Doppler에)
  sp_api_refresh_token_key text,        -- SP-API refresh token Doppler 키
  region text NOT NULL CHECK (region IN ('NA', 'EU', 'FE')),
  endpoint_url text NOT NULL,           -- API base URL (region별)
  is_active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_market_id)
);
```

#### ads.campaigns — 캠페인 (핵심 엔티티)

```sql
CREATE TABLE ads.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_unit_id uuid NOT NULL REFERENCES public.org_units(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  marketplace_profile_id uuid NOT NULL REFERENCES ads.marketplace_profiles(id),

  -- Amazon 원본 데이터
  amazon_campaign_id text,              -- Amazon 캠페인 ID (sync 후 채워짐)
  amazon_state text CHECK (amazon_state IN ('enabled', 'paused', 'archived')),

  -- 내부 관리 데이터
  marketing_code text NOT NULL,         -- 6자리 코드 (예: 111112)
  name text NOT NULL,                   -- 전체 캠페인명 (코드+태그+제품+담당자+날짜)
  campaign_type text NOT NULL CHECK (campaign_type IN ('sp', 'sb', 'sd')),
  mode text NOT NULL CHECK (mode IN ('autopilot', 'manual')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'learning', 'archived')),

  -- 타겟/예산
  target_acos numeric(5,2),             -- 목표 ACoS %
  daily_budget numeric(12,2),           -- 일일 예산 ($)
  weekly_budget numeric(12,2),          -- 주간 예산 (Auto Pilot 전용)
  max_bid_cap numeric(8,2),             -- 캠페인별 최대 bid (FR-G01)

  -- Auto Pilot 메타
  confidence_score numeric(5,2),        -- AI 자신감 점수 (0-100)
  learning_day integer DEFAULT 0,       -- 학습 진행 일수 (14일 기준)

  -- 담당자
  created_by uuid NOT NULL REFERENCES public.users(id),
  assigned_to uuid REFERENCES public.users(id),

  -- 타임스탬프
  launched_at timestamptz,
  paused_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_org ON ads.campaigns(org_unit_id);
CREATE INDEX idx_campaigns_bm ON ads.campaigns(brand_market_id);
CREATE INDEX idx_campaigns_mode ON ads.campaigns(mode);
CREATE INDEX idx_campaigns_status ON ads.campaigns(status);
CREATE INDEX idx_campaigns_code ON ads.campaigns(marketing_code);
```

#### ads.ad_groups — 광고 그룹

```sql
CREATE TABLE ads.ad_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES ads.campaigns(id) ON DELETE CASCADE,
  amazon_ad_group_id text,
  name text NOT NULL,
  default_bid numeric(8,2),
  state text CHECK (state IN ('enabled', 'paused', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_groups_campaign ON ads.ad_groups(campaign_id);
```

#### ads.keywords — 키워드

```sql
CREATE TABLE ads.keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES ads.campaigns(id) ON DELETE CASCADE,
  ad_group_id uuid NOT NULL REFERENCES ads.ad_groups(id) ON DELETE CASCADE,
  amazon_keyword_id text,
  keyword_text text NOT NULL,
  match_type text NOT NULL CHECK (match_type IN ('broad', 'phrase', 'exact', 'negative', 'negative_phrase')),
  bid numeric(8,2),
  state text CHECK (state IN ('enabled', 'paused', 'archived')),
  -- 안전장치 메타
  manual_override_until timestamptz,    -- FR-G06: 수동 변경 후 잠금 해제일
  last_auto_adjusted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_keywords_campaign ON ads.keywords(campaign_id);
CREATE INDEX idx_keywords_ad_group ON ads.keywords(ad_group_id);
CREATE INDEX idx_keywords_text ON ads.keywords(keyword_text);
```

#### ads.report_snapshots — 일일 성과 스냅샷 (Ads Reporting 캐시)

```sql
CREATE TABLE ads.report_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES ads.campaigns(id) ON DELETE CASCADE,
  ad_group_id uuid REFERENCES ads.ad_groups(id),
  keyword_id uuid REFERENCES ads.keywords(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  report_date date NOT NULL,
  report_level text NOT NULL CHECK (report_level IN ('campaign', 'ad_group', 'keyword', 'search_term')),

  -- 지표
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  spend numeric(12,2) DEFAULT 0,
  sales numeric(12,2) DEFAULT 0,         -- attributed sales (14d)
  orders integer DEFAULT 0,
  acos numeric(5,2),                     -- spend/sales * 100
  cpc numeric(8,2),                      -- spend/clicks
  ctr numeric(5,2),                      -- clicks/impressions * 100
  cvr numeric(5,2),                      -- orders/clicks * 100
  roas numeric(8,2),                     -- sales/spend

  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, ad_group_id, keyword_id, report_date, report_level)
);

CREATE INDEX idx_snapshots_campaign_date ON ads.report_snapshots(campaign_id, report_date);
CREATE INDEX idx_snapshots_bm_date ON ads.report_snapshots(brand_market_id, report_date);
CREATE INDEX idx_snapshots_date ON ads.report_snapshots(report_date);
```

#### ads.rules — 자동화 규칙 (Tier 1: Rule Engine)

```sql
CREATE TABLE ads.rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_unit_id uuid NOT NULL REFERENCES public.org_units(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  name text NOT NULL,
  template text NOT NULL CHECK (template IN (
    'high_acos_pause', 'winner_promote', 'low_ctr_negate', 'budget_guard', 'custom'
  )),
  condition_json jsonb NOT NULL,        -- {"metric": "acos", "operator": ">", "value": 40, "days": 7}
  action text NOT NULL,                 -- 'pause_keyword' | 'promote_keyword' | 'negate_keyword' | 'adjust_budget' | 'adjust_bid'
  action_params jsonb,                  -- {"percentage": -30} 등
  scope text NOT NULL DEFAULT 'all',    -- 'all' | 'selected'
  scope_campaign_ids uuid[],            -- scope='selected'일 때 대상 캠페인
  look_back_days integer NOT NULL DEFAULT 7,
  run_frequency text NOT NULL DEFAULT 'daily'
    CHECK (run_frequency IN ('hourly', 'daily', 'weekly')),
  is_active boolean NOT NULL DEFAULT false,  -- Draft로 시작
  last_run_at timestamptz,
  last_affected_count integer DEFAULT 0,
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rules_org ON ads.rules(org_unit_id);
CREATE INDEX idx_rules_active ON ads.rules(is_active) WHERE is_active = true;
```

#### ads.automation_log — AI 활동 이력 (모든 자동화 액션)

```sql
CREATE TABLE ads.automation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES ads.campaigns(id),
  keyword_id uuid REFERENCES ads.keywords(id),
  rule_id uuid REFERENCES ads.rules(id),
  batch_id uuid NOT NULL,               -- 같은 배치의 연관 액션 그룹핑

  action_type text NOT NULL CHECK (action_type IN (
    'bid_adjust', 'keyword_add', 'keyword_negate', 'keyword_promote',
    'budget_adjust', 'campaign_pause', 'campaign_resume', 'dayparting_apply'
  )),
  action_detail jsonb NOT NULL,         -- {"old_bid": 1.50, "new_bid": 1.80, "change_pct": 20}
  reason text NOT NULL,                 -- AI 결정 이유 (필수 — FR-D06)
  source text NOT NULL CHECK (source IN ('rule_engine', 'algorithm', 'ml', 'manual')),

  -- 안전장치
  guardrail_blocked boolean NOT NULL DEFAULT false,
  guardrail_id text,                    -- 'FR-G01' 등
  guardrail_reason text,

  -- 롤백
  is_rolled_back boolean NOT NULL DEFAULT false,
  rolled_back_at timestamptz,
  rolled_back_by uuid REFERENCES public.users(id),

  -- Amazon API 실행 결과
  api_request jsonb,
  api_response jsonb,
  api_success boolean,

  executed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_automation_campaign ON ads.automation_log(campaign_id, executed_at DESC);
CREATE INDEX idx_automation_batch ON ads.automation_log(batch_id);
CREATE INDEX idx_automation_type ON ads.automation_log(action_type);
CREATE INDEX idx_automation_blocked ON ads.automation_log(guardrail_blocked) WHERE guardrail_blocked = true;
```

#### ads.keyword_recommendations — AI 키워드 추천

```sql
CREATE TABLE ads.keyword_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES ads.campaigns(id),
  keyword_id uuid REFERENCES ads.keywords(id),   -- 기존 키워드 (bid 조정 시)
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),

  recommendation_type text NOT NULL CHECK (recommendation_type IN (
    'bid_adjust', 'promote', 'negate', 'new_keyword', 'trend_alert'
  )),
  keyword_text text NOT NULL,
  match_type text,                      -- 추천 매치 타입
  suggested_bid numeric(8,2),
  current_bid numeric(8,2),
  estimated_impact numeric(12,2),       -- 예상 주간 수익/절감 ($)
  impact_level text CHECK (impact_level IN ('high', 'medium', 'low')),
  reason text NOT NULL,                 -- 추천 이유 한 문장

  -- 메트릭 근거
  source text NOT NULL,                 -- 'search_term' | 'brand_analytics' | 'algorithm'
  look_back_days integer NOT NULL DEFAULT 14,
  metrics jsonb,                        -- {"clicks": 42, "conv": 3, "acos": 18.5, "spend": 63.0}

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'skipped', 'expired')),
  approved_by uuid REFERENCES public.users(id),
  approved_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX idx_recommendations_campaign ON ads.keyword_recommendations(campaign_id, status);
CREATE INDEX idx_recommendations_bm ON ads.keyword_recommendations(brand_market_id, status);
CREATE INDEX idx_recommendations_status ON ads.keyword_recommendations(status) WHERE status = 'pending';
```

#### ads.keyword_rankings — Brand Analytics 주간 데이터

```sql
CREATE TABLE ads.keyword_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  keyword_text text NOT NULL,
  week_start date NOT NULL,             -- 주 시작일 (일요일)
  search_frequency_rank integer,
  click_share numeric(5,2),
  conversion_share numeric(5,2),
  top_clicked_asins text[],             -- Top 3 ASINs
  trend_signal text CHECK (trend_signal IN ('rising', 'emerging', 'stable', 'declining')),
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_market_id, keyword_text, week_start)
);

CREATE INDEX idx_rankings_bm_week ON ads.keyword_rankings(brand_market_id, week_start);
CREATE INDEX idx_rankings_keyword ON ads.keyword_rankings(keyword_text);
```

#### ads.search_term_reports — 검색어 리포트 캐시

```sql
CREATE TABLE ads.search_term_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES ads.campaigns(id),
  ad_group_id uuid NOT NULL REFERENCES ads.ad_groups(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  search_term text NOT NULL,
  report_date date NOT NULL,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  spend numeric(12,2) DEFAULT 0,
  sales numeric(12,2) DEFAULT 0,
  orders integer DEFAULT 0,
  acos numeric(5,2),
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, ad_group_id, search_term, report_date)
);

CREATE INDEX idx_search_terms_campaign ON ads.search_term_reports(campaign_id, report_date);
```

#### ads.dayparting_schedules — 그룹별 스케줄

```sql
CREATE TABLE ads.dayparting_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_unit_id uuid NOT NULL REFERENCES public.org_units(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  group_name text NOT NULL,             -- 'Brand Defense' | 'Category' | 'Generic' | 'Conquest'
  campaign_ids uuid[] NOT NULL,         -- 이 그룹에 속한 캠페인들
  is_enabled boolean NOT NULL DEFAULT false,
  -- 24h × 7d 스케줄 (168 슬롯)
  schedule jsonb NOT NULL DEFAULT '{}', -- {"mon": {"0": 0, "1": 0, ..., "10": 1.4, "11": 1.4, ...}, ...}
  -- 값: 0 = OFF, 0.2~2.0 = bid multiplier
  ai_recommended_schedule jsonb,        -- AI 추천 스케줄 (같은 형식)
  last_applied_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dayparting_org ON ads.dayparting_schedules(org_unit_id);
```

#### ads.dayparting_hourly_weights — 시간대별 매출 패턴

```sql
CREATE TABLE ads.dayparting_hourly_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  asin text,                            -- NULL이면 마켓 전체 평균
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  hour integer NOT NULL CHECK (hour BETWEEN 0 AND 23),
  order_count integer NOT NULL DEFAULT 0,
  revenue numeric(12,2) NOT NULL DEFAULT 0,
  weight numeric(5,3) NOT NULL DEFAULT 1.0, -- 상대 가중치 (1.0 = 평균)
  source text NOT NULL DEFAULT 'orders_db',  -- 'orders_db' | 'marketing_stream'
  period_start date NOT NULL,           -- 분석 기간 시작
  period_end date NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_market_id, asin, day_of_week, hour, source)
);

CREATE INDEX idx_weights_bm ON ads.dayparting_hourly_weights(brand_market_id);
```

#### ads.budgets — 연간 예산

```sql
CREATE TABLE ads.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_unit_id uuid NOT NULL REFERENCES public.org_units(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  channel text NOT NULL CHECK (channel IN ('sp', 'sb', 'sd')),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  is_actual boolean NOT NULL DEFAULT false,  -- true=전년 실집행, false=계획
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_unit_id, brand_market_id, year, month, channel, is_actual)
);

CREATE INDEX idx_budgets_org_year ON ads.budgets(org_unit_id, year);
CREATE INDEX idx_budgets_bm ON ads.budgets(brand_market_id, year);
```

#### ads.budget_change_log — 예산 변경 이력

```sql
CREATE TABLE ads.budget_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES ads.budgets(id),
  user_id uuid NOT NULL REFERENCES public.users(id),
  field text NOT NULL,                  -- 'amount' 등
  old_value text,
  new_value text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_budget_log_budget ON ads.budget_change_log(budget_id);
```

#### ads.alerts — 예산/성과 알림

```sql
CREATE TABLE ads.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES ads.campaigns(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  alert_type text NOT NULL CHECK (alert_type IN (
    'budget_runout', 'spend_spike', 'acos_spike', 'zero_sales',
    'buybox_lost', 'stock_low', 'cpc_surge', 'cvr_drop'
  )),
  severity text NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,                           -- 알림 관련 데이터
  is_read boolean NOT NULL DEFAULT false,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_campaign ON ads.alerts(campaign_id, created_at DESC);
CREATE INDEX idx_alerts_unread ON ads.alerts(is_read) WHERE is_read = false;
```

#### ads.spend_diagnostics — AI 누수 분석

```sql
CREATE TABLE ads.spend_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES ads.campaigns(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  diagnosis_type text NOT NULL CHECK (diagnosis_type IN (
    'underspend', 'overspend', 'waste', 'trend_decline'
  )),
  root_causes jsonb NOT NULL,           -- [{"cause": "Low bids", "contribution_pct": 62, "detail": "...", "fix_action": "raise_bids", "est_impact": 120}]
  utilization_pct numeric(5,2),
  analyzed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_diagnostics_campaign ON ads.spend_diagnostics(campaign_id);
```

#### ads.spend_trends — 주간 트렌드 분석

```sql
CREATE TABLE ads.spend_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES ads.campaigns(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  metric text NOT NULL,                 -- 'acos' | 'spend' | 'roas' | 'cvr'
  week_start date NOT NULL,
  value numeric(12,2) NOT NULL,
  prev_week_value numeric(12,2),
  trend_direction text CHECK (trend_direction IN ('improving', 'stable', 'worsening')),
  consecutive_weeks_worsening integer DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trends_bm ON ads.spend_trends(brand_market_id, week_start);
```

#### ads.change_log — 범용 변경 이력

```sql
CREATE TABLE ads.change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,            -- 'campaign' | 'keyword' | 'budget' | 'rule'
  entity_id uuid NOT NULL,
  action text NOT NULL,                 -- 'create' | 'update' | 'delete' | 'approve'
  changes jsonb NOT NULL,               -- {"field": "bid", "old": 1.5, "new": 1.8}
  source text NOT NULL DEFAULT 'manual', -- 'manual' | 'rule_engine' | 'algorithm' | 'cron'
  user_id uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_changelog_entity ON ads.change_log(entity_type, entity_id, created_at DESC);
```

#### ads.api_tokens — OAuth 토큰 캐시

```sql
CREATE TABLE ads.api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_profile_id uuid NOT NULL REFERENCES ads.marketplace_profiles(id),
  token_type text NOT NULL CHECK (token_type IN ('ads', 'sp')),
  access_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (marketplace_profile_id, token_type)
);
```

#### ads.orders_daily_cache — Orders DB 일별 캐시

```sql
CREATE TABLE ads.orders_daily_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  order_date date NOT NULL,
  total_orders integer NOT NULL DEFAULT 0,
  total_revenue numeric(12,2) NOT NULL DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_market_id, order_date)
);

CREATE INDEX idx_orders_cache_bm ON ads.orders_daily_cache(brand_market_id, order_date);
```

#### ads.notifications_log — SP-API 알림 수신 로그

```sql
CREATE TABLE ads.notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  notification_type text NOT NULL,      -- 'BUYBOX_STATUS_CHANGE' 등
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  received_at timestamptz NOT NULL DEFAULT now()
);
```

#### ads.cache_autopilot_summary — Auto Pilot KPI 캐시

```sql
CREATE TABLE ads.cache_autopilot_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_unit_id uuid NOT NULL REFERENCES public.org_units(id),
  brand_market_id uuid NOT NULL REFERENCES public.brand_markets(id),
  active_count integer DEFAULT 0,
  learning_count integer DEFAULT 0,
  paused_count integer DEFAULT 0,
  total_weekly_budget numeric(12,2) DEFAULT 0,
  total_spend_7d numeric(12,2) DEFAULT 0,
  avg_acos numeric(5,2),
  ai_actions_7d integer DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_unit_id, brand_market_id)
);
```

### 3.3 RLS Policies

```sql
-- 모든 ads.* 핵심 테이블에 동일 패턴 적용
-- Layer 1 (org_unit) + Layer 2 (brand_market) 조합

ALTER TABLE ads.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ads_campaigns_select" ON ads.campaigns
  FOR SELECT USING (
    org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
    AND brand_market_id IN (SELECT get_accessible_brand_markets(auth.uid(), 'ads'))
  );

CREATE POLICY "ads_campaigns_insert" ON ads.campaigns
  FOR INSERT WITH CHECK (
    org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
    AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  );

CREATE POLICY "ads_campaigns_update" ON ads.campaigns
  FOR UPDATE USING (
    org_unit_id IN (SELECT get_accessible_org_units(auth.uid(), 'ads'))
    AND brand_market_id IN (SELECT get_editable_brand_markets(auth.uid(), 'ads'))
  );

-- 동일 패턴을 budgets, rules, keyword_recommendations 등에 적용
-- report_snapshots, automation_log 등은 campaign FK를 통해 간접 필터
```

---

## 4. API Specification

### 4.1 공통 규칙

| 항목 | 규칙 |
|------|------|
| **Base Path** | `/api/ads/*` |
| **Auth** | `withAuth(handler, ['editor', 'admin', 'owner'])` — viewer는 GET만 |
| **Market Context** | 모든 요청에 `x-brand-market-id` 헤더 또는 쿼리 파라미터 필수 |
| **Pagination** | `?page=1&limit=20` → `{ data: [], pagination: { page, limit, total } }` |
| **Error Format** | `{ error: { code, message, details? } }` |
| **Rate Limit** | Amazon API proxy는 내부 큐 처리 (클라이언트는 즉시 응답) |

### 4.2 주요 엔드포인트

#### GET /api/ads/dashboard/ceo

CEO 대시보드 집계 (S01).

```typescript
// Response
type CeoDashboardResponse = {
  data: {
    brands: {
      brand_id: string
      brand_name: string
      markets: {
        market: string
        spend_mtd: number
        sales_mtd: number
        acos: number
        tacos: number
        roas: number
        roas_trend: number[]  // 30일 스파크라인
        orders_mtd: number
      }[]
    }[]
    alerts_count: number
    ai_status: 'healthy' | 'warning' | 'error'
    roas_trend_30d: { date: string; spigen: number; legato: number; cyrill: number }[]
    acos_heatmap: { brand: string; market: string; acos: number; delta: number }[]
  }
}
```

#### GET /api/ads/dashboard/director

Director 대시보드 집계 (S02).

```typescript
type DirectorDashboardResponse = {
  data: {
    budget_pacing: {
      brand_market_id: string
      brand: string
      market: string
      channel: string
      planned: number
      actual: number
      pacing_pct: number
      on_track: boolean
    }[]
    market_performance: { brand: string; market: string; acos: number }[]
    autopilot_impact: { acos_change: number; savings: number; actions_7d: number }
    team_performance: {
      org_unit_id: string
      team_name: string
      spend: number
      acos: number
      delta_acos: number
      campaigns_count: number
    }[]
    pending_actions: {
      id: string
      type: string
      severity: 'critical' | 'warning' | 'info'
      title: string
      campaign_name: string
    }[]
  }
}
```

#### GET /api/ads/campaigns

캠페인 목록 (S03).

```typescript
// Query params
type CampaignListQuery = {
  brand_market_id: string
  mode?: 'autopilot' | 'manual'
  status?: 'active' | 'paused' | 'learning' | 'archived'
  assigned_to?: string           // user_id (팀장: 팀원 필터)
  search?: string
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
  page?: number
  limit?: number
}

// Response
type CampaignListResponse = {
  data: {
    id: string
    marketing_code: string
    name: string
    mode: 'autopilot' | 'manual'
    status: string
    campaign_type: 'sp' | 'sb' | 'sd'
    daily_budget: number
    spend_today: number
    acos: number
    target_acos: number
    roas: number
    orders_7d: number
    assigned_to: { id: string; name: string }
    confidence_score?: number    // autopilot only
    last_action?: string         // autopilot only
  }[]
  pagination: { page: number; limit: number; total: number }
}
```

#### POST /api/ads/campaigns

캠페인 생성 (M01).

```typescript
type CreateCampaignRequest = {
  brand_market_id: string
  campaign_type: 'sp' | 'sb' | 'sd'
  mode: 'autopilot' | 'manual'
  marketing_code: string
  name: string
  target_acos: number
  daily_budget?: number          // manual
  weekly_budget?: number         // autopilot
  max_bid_cap?: number
  // Manual 전용 추가 필드
  targeting_type?: 'keyword' | 'product'
  keywords?: { text: string; match_type: string; bid: number }[]
  negative_keywords?: { text: string; match_type: string }[]
  product_asins?: string[]
}

// Response: 201
type CreateCampaignResponse = {
  data: {
    id: string
    marketing_code: string
    name: string
    amazon_campaign_id?: string   // Ads API 생성 시
  }
}
```

#### GET /api/ads/recommendations

AI 추천 목록 (S04 Top 3, S06 Action Queue, S11 전체).

```typescript
type RecommendationListQuery = {
  brand_market_id: string
  campaign_id?: string           // 특정 캠페인만
  type?: 'bid_adjust' | 'promote' | 'negate' | 'new_keyword'
  status?: 'pending'
  limit?: number
}

type RecommendationListResponse = {
  data: {
    id: string
    campaign_id: string
    campaign_name: string
    recommendation_type: string
    keyword_text: string
    current_bid?: number
    suggested_bid?: number
    estimated_impact: number
    impact_level: 'high' | 'medium' | 'low'
    reason: string
    metrics: { clicks?: number; conv?: number; acos?: number; spend?: number }
    source: string
    created_at: string
  }[]
  summary: {
    total_pending: number
    est_acos_impact: number
    est_revenue_impact: number
    est_waste_reduction: number
  }
}
```

#### POST /api/ads/recommendations/[id]/approve

AI 추천 승인 실행.

```typescript
type ApproveRequest = {
  adjusted_bid?: number          // 사용자가 수정한 bid (Adjust 패턴)
}

// Response: 200
type ApproveResponse = {
  data: {
    success: boolean
    action_taken: string         // "Bid adjusted $1.50 → $1.80"
    automation_log_id: string
    api_success?: boolean        // Ads API 호출 결과
  }
}
```

#### GET /api/ads/budgets

연간 예산 조회 (S13).

```typescript
type BudgetListQuery = {
  brand_market_id: string
  year: number
  org_unit_id?: string           // Director: 팀별 필터
}

type BudgetListResponse = {
  data: {
    plans: {
      channel: 'sp' | 'sb' | 'sd'
      months: { month: number; amount: number }[]
      annual_total: number
    }[]
    actuals: {                   // 전년 또는 올해 실집행
      channel: 'sp' | 'sb' | 'sd'
      months: { month: number; amount: number }[]
      annual_total: number
    }[]
    autopilot_monthly: number[]  // 12개월 Auto Pilot 환산 예산
    ytd: {
      planned: number
      spent: number
      remaining: number
      pacing_pct: number
    }
  }
}
```

#### PUT /api/ads/budgets

예산 저장 (S13 Save Changes).

```typescript
type SaveBudgetRequest = {
  brand_market_id: string
  year: number
  entries: {
    channel: 'sp' | 'sb' | 'sd'
    month: number
    amount: number
  }[]
}

// Response: 200
// 자동으로 budget_change_log에 변경 기록
```

#### POST /api/ads/budgets/import

엑셀 import (S13).

```typescript
// multipart/form-data
// file: .csv or .xlsx

type ImportBudgetResponse = {
  data: {
    imported_count: number
    skipped_count: number
    errors: { row: number; message: string }[]
  }
}
```

#### POST /api/ads/rules

규칙 생성 (M03).

```typescript
type CreateRuleRequest = {
  brand_market_id: string
  name: string
  template: 'high_acos_pause' | 'winner_promote' | 'low_ctr_negate' | 'budget_guard' | 'custom'
  condition_json: {
    metric: string
    operator: '>' | '<' | '>=' | '<='
    value: number
    days: number
  }
  action: string
  action_params?: Record<string, unknown>
  scope: 'all' | 'selected'
  scope_campaign_ids?: string[]
  look_back_days: number
  run_frequency: 'hourly' | 'daily' | 'weekly'
}
```

#### POST /api/ads/rules/simulate

규칙 시뮬레이션 (M03 Simulate).

```typescript
type SimulateRuleRequest = {
  brand_market_id: string
  condition_json: object
  scope: 'all' | 'selected'
  scope_campaign_ids?: string[]
  look_back_days: number
}

type SimulateRuleResponse = {
  data: {
    affected_keywords: number
    affected_campaigns: number
    sample_keywords: { keyword: string; campaign: string; current_value: number }[]
  }
}
```

#### GET /api/ads/dayparting/heatmap

히트맵 데이터 (S07).

```typescript
type HeatmapQuery = {
  brand_market_id: string
  asin?: string                  // 특정 ASIN 또는 전체
}

type HeatmapResponse = {
  data: {
    weights: {
      day_of_week: number        // 0-6
      hour: number               // 0-23
      weight: number             // 상대 가중치
      order_count: number
      revenue: number
    }[]
    source: 'orders_db' | 'marketing_stream'
    period: { start: string; end: string }
  }
}
```

#### POST /api/ads/autopilot/[id]/rollback

Auto Pilot 롤백 (S09).

```typescript
type RollbackRequest = {
  batch_id?: string              // 특정 batch 롤백
  last_n?: number                // 마지막 N개 액션 롤백
}

type RollbackResponse = {
  data: {
    rolled_back_count: number
    actions: { id: string; action_type: string; detail: string }[]
    api_results: { success: number; failed: number }
  }
}
```

### 4.3 Cron Jobs (Vercel Cron)

| Route | Schedule | 설명 |
|-------|----------|------|
| `POST /api/ads/cron/sync-campaigns` | `0 * * * *` (매시간) | Ads API → ads.campaigns sync |
| `POST /api/ads/cron/sync-reports` | `0 2 * * *` (새벽 2시) | Ads Reporting → ads.report_snapshots |
| `POST /api/ads/cron/brand-analytics` | `0 6 * * 1` (월요일 6시) | Brand Analytics → ads.keyword_rankings |
| `POST /api/ads/cron/keyword-analysis` | `0 4 * * *` (매일 4시) | Search Term 분석 → ads.keyword_recommendations |
| `POST /api/ads/cron/dayparting-apply` | `0 * * * *` (매시간) | bid multiplier 적용 |
| `POST /api/ads/cron/orders-pattern` | `0 3 * * 0` (일요일 3시) | Orders DB → dayparting_hourly_weights |

Cron Auth: `CRON_SECRET` 환경변수 검증 (Vercel Cron 헤더).

---

## 5. UI/UX Design

### 5.1 Screen-Route Mapping

| Screen | Route | Feature Folder | 역할 제한 |
|--------|-------|----------------|----------|
| S01 CEO Dashboard | /ads/dashboard | dashboard/ | owner |
| S02 Director Dashboard | /ads/dashboard | dashboard/ | admin |
| S03 Marketer Dashboard | /ads/campaigns | campaigns/ | editor+ |
| S04 Bid Optimization | /ads/optimization | optimization/ | editor+ |
| S05 Daily Budget Pacing | /ads/optimization | optimization/ | editor+ |
| S06 Keywords | /ads/optimization | optimization/ | editor+ |
| S07 Dayparting Schedule | /ads/optimization | optimization/ | editor+ |
| S08 Auto Pilot Main | /ads/autopilot | autopilot/ | editor+ |
| S09 Auto Pilot Detail | /ads/autopilot/[id] | autopilot/ | editor+ |
| S11 AI Recommendations | /ads/optimization/recommendations | optimization/ | editor+ |
| S12 Spend Intelligence | /ads/reports | spend-intelligence/ | editor+ |
| S13 Annual Budget Planning | /ads/campaigns | budget-planning/ | admin+ (팀장 이상) |
| M01 Campaign Create | Modal on S03/S08 | campaigns/ | editor+ |
| M02 Campaign Detail | Slide panel on S03 | campaigns/ | editor+ |
| M03 Rule Create | Modal on S04 | optimization/ | editor+ |
| M04 Alert Detail | Modal on S03/S05 | optimization/ | editor+ |
| M05 Underspend Analysis | Modal on S05 | optimization/ | editor+ |

### 5.2 User Flows

#### Flow 1: 캠페인 생성 (Manual)
```
S03 [+ New Campaign] → M01a (Team & Name, 6자리 코드)
  → M01b (Choose Mode: Manual 선택)
  → M01c (Type & Targeting)
  → M01d (Products, Budget, Keywords)
  → M01e (Review & Create)
  → S03 (새 캠페인 행 추가)
```

#### Flow 2: 캠페인 생성 (Auto Pilot)
```
S03/S08 [+ New Campaign] → M01a (Team & Name)
  → M01b (Choose Mode: Auto Pilot 선택, ⚠ Permanent 경고)
  → M01c-AP (주간 예산만)
  → M01d-AP (Review & Launch)
  → S08 (새 AP 캠페인 Learning 상태)
```

#### Flow 3: 키워드 최적화 (Manual)
```
S03 (캠페인 클릭) → M02 (Overview 탭)
  → S04 (Bid Optimization 탭)
  → Today's Focus Top 3 → [Approve All]
  → Keyword Table 벌크 선택 → [Approve]
  → change_log 기록
```

#### Flow 4: 데이파팅 설정
```
S04 (Dayparting 탭 클릭) → S07
  → Group Selector (Brand Defense)
  → AI Schedule Strip [Apply AI Schedule]
  → 히트맵 확인/미세 조정
  → 변경 사항 자동 저장
```

#### Flow 5: 예산 미소진 대응
```
S05 (Underspend Watch에 캠페인 표시)
  → [Analyze →] → M05 (Root Causes + Fix CTAs)
  → [Apply All N Fixes] → Ads API 호출 → 결과 확인
```

#### Flow 6: Auto Pilot 모니터링
```
S08 (캠페인 목록) → 행 클릭 → S09
  → AI Activity Log 확인
  → Guardrail Blocked 행 확인
  → [Undo Last 5] batch rollback → 확인
```

### 5.3 Page UI Checklist

#### S01 — CEO Dashboard
- [ ] Brand Pulse Card × 3 (Spigen, Legato, Cyrill) — ROAS 숫자 + TACoS 게이지 + 스파크라인 3종
- [ ] AI Status 신호등 (healthy/warning/error)
- [ ] Alert 카운트 뱃지
- [ ] ROAS Trend 30d 3-line 차트 + 타겟 기준선
- [ ] Brand×Market ACoS 히트맵 3×4 (컬러 = semantic)
- [ ] Market Selector (단일)

#### S02 — Director Dashboard
- [ ] Budget Pacing 전폭 (브랜드×마켓 프로그레스바 + 타겟 마커)
- [ ] Market Performance ACoS 히트맵 3×4
- [ ] Auto Pilot Impact 요약 카드
- [ ] Team Performance 테이블 (심각도 순)
- [ ] Pending Actions 목록 (severity 그룹핑 + CTA)

#### S03 — Marketer Dashboard
- [ ] Status Strip (Active/Paused/Learning/Alerts 카운트)
- [ ] KPI 카드 8칸 (개인↔팀 전환)
- [ ] AI Queue 미리보기 4칸
- [ ] Campaign Table (체크박스, 정렬, 필터, 벌크 바)
- [ ] [+ New Campaign] CTA → M01
- [ ] Auto Pilot 뱃지 / Manual 뱃지
- [ ] Page Tabs: Campaigns | Budget Planning

#### S04 — Bid Optimization
- [ ] Campaign Selector (단일)
- [ ] Sub-tabs: Bidding(active) / Budget / Keywords / Dayparting
- [ ] Strategy Strip (Target ACoS / Max Bid / Daily Limit / Rule 상태)
- [ ] Today's Focus 카드 3장 (Impact bar + bid 변경 + Approve/Skip)
- [ ] Apply Top 3 Bar (#18181B 다크)
- [ ] Keyword Table (Impact 순 정렬, 벌크 선택, AI 추천 left border)
- [ ] Empty State ("All caught up")

#### S05 — Daily Budget Pacing
- [ ] Campaign Context Bar + Budget 탭 활성
- [ ] Strategy Strip (Distribution / Daily Cap / Pace Mode)
- [ ] AI Budget Recommendation 카드 (조건부)
- [ ] 24h Hourly Spend Chart (actual + predicted + Now marker)
- [ ] Today's Status (hero 숫자 + progress bar + Edit Budget)
- [ ] Underspend Watch (조건부, < 70%)
- [ ] Dayparting Signal (조건부)

#### S06 — Keywords
- [ ] Campaign Context Bar + Keywords 탭 활성 (pending count)
- [ ] Keyword Stats Strip 4-col (Auto/Broad/Phrase/Exact)
- [ ] AI Action Queue 테이블 (Promote/Negate 필터 탭)
- [ ] Promote 행: solid left border, +$ green
- [ ] Negate 행: dashed left border, -$ red
- [ ] 벌크 바 (#18181B): Approve All / Skip All

#### S07 — Dayparting Schedule
- [ ] Campaign Context Bar + Dayparting 탭 활성
- [ ] Phase 1 Notice ("Orders DB 기반 추정값")
- [ ] Group Selector + ON/OFF 토글 + campaign count
- [ ] 24h × 7d Heatmap Grid (grayscale intensity, 클릭 토글)
- [ ] "Active now" 오렌지 테두리 셀
- [ ] AI Schedule Strip (#18181B 다크 바, Apply/Adjust)
- [ ] Group Status Table

#### S08 — Auto Pilot Main
- [ ] Page Header + [+ New Auto Pilot Campaign] 오렌지 CTA
- [ ] KPI Strip 4카드
- [ ] Context Bar (Running/Learning/Paused/Alerts 카운트)
- [ ] Campaigns Table (Status 뱃지, Confidence bar, Last Action)
- [ ] 케밥 메뉴 (Pause/Resume/Emergency Stop)

#### S09 — Auto Pilot Detail
- [ ] Campaign Header (Back 링크 + [Pause] red + [Settings] ghost)
- [ ] KPI Strip 4카드 (ACoS Target / Budget / Confidence / Actions)
- [ ] AI Activity Log 테이블 8행 (컬러 dot + 뱃지 + 이유 + 타임스탬프)
- [ ] [Undo] 개별 롤백 버튼
- [ ] [Undo Last 5] batch 롤백
- [ ] Guardrail Blocked 행 (dashed border + ⚠ Blocked)

#### S11 — AI Recommendations
- [ ] Page Header + Beta 뱃지 (#F97316 border)
- [ ] "Manual campaigns only" 서브텍스트
- [ ] [Approve All] 오렌지 + [Skip All] ghost
- [ ] Impact Summary Bar (ACoS/Revenue/Waste)
- [ ] Filter Row (Campaign/Brand/Market)
- [ ] Category Groups: Bid Adjustments / Negative Keywords / Keyword Promotions
- [ ] 각 행: 추천 + 근거 + Impact + Approve/Skip

#### S12 — Spend Intelligence
- [ ] Spend Leak Summary (WoW 비교)
- [ ] Top Wasters 테이블 (전환 없는 키워드 TOP 10)
- [ ] Trend Alerts (3주 연속 악화)
- [ ] AI Diagnosis 카드
- [ ] Quick Fix Actions (Negate/Bid Down/Pause)
- [ ] Export 버튼 (CSV/Google Sheets)

#### S13 — Annual Budget Planning
- [ ] Page Header + [Import] + [View Change Log]
- [ ] Page Tabs: Campaigns | Budget Planning(active)
- [ ] Market Tabs (US/CA/DE/JP + 금액)
- [ ] KPI Strip 5카드 (Annual/YTD Spent/YTD Planned/Remaining/Auto Pilot)
- [ ] Monthly Budget Grid (채널 탭 SP/SB/SD)
- [ ] 3-Row per channel (Plan'25/Actual'25/Plan'26)
- [ ] Auto Pilot ⚡ 행 (#FFF7ED 배경)
- [ ] Total 행
- [ ] [Save Changes] CTA
- [ ] Plan vs Actual 바 차트
- [ ] Channel Breakdown YTD

#### M01 — Campaign Create (4-Step Wizard)
- [ ] Step 1 (M01a): Team auto-assign + Brand + Market + Product + 6자리 코드 생성 + Campaign Name Preview
- [ ] Step 2 (M01b): Auto Pilot vs Manual 선택 + ⚠ Permanent 경고
- [ ] Step 3 Manual (M01c): Campaign Type + Targeting Type + Keywords
- [ ] Step 4 Manual (M01d): Products + Budget + Review & Create
- [ ] Step 3 AP (M01c-AP): Weekly Budget만
- [ ] Step 4 AP (M01d-AP): Review & Launch

#### M02 — Campaign Detail Panel (480px slide)
- [ ] 탭 4개: Overview / Ad Groups / AI Activity / Settings
- [ ] 6자리 코드 뱃지
- [ ] KPI 5카드
- [ ] Budget Pacing bar
- [ ] AI Recommendations 미리보기 2건
- [ ] [Duplicate] 버튼 (Clone + Pause)

#### M03 — Rule Create
- [ ] 템플릿 5종 선택 카드
- [ ] 자연어 빌더 ("If [metric] is [op] [value] for [days], then [action]")
- [ ] When & Where (범위, 실행 주기, Look-back)
- [ ] [Simulate] 버튼 + 결과 표시
- [ ] [Save Draft] / [Create Rule]

#### M04 — Alert Detail (480px)
- [ ] Alert type dot + 캠페인명 + 메시지
- [ ] Hero 숫자 + Critical progress bar
- [ ] KPI 3카드 (Run Rate / Orders / ACoS)
- [ ] Spend Today 24h 라인 차트
- [ ] Quick Actions 3버튼 (RECOMMENDED 강조)

#### M05 — Underspend Analysis (520px)
- [ ] Underspend dot + 캠페인명 + utilization %
- [ ] Hero 숫자 + progress bar
- [ ] Root Causes 카드 (contribution %, 설명, CTA)
- [ ] [Apply All N Fixes] 오렌지 전폭 CTA

---

## 6. Error Handling

### 6.1 Error Codes

| Code | HTTP | Message | 대응 |
|------|------|---------|------|
| `ADS_AUTH_REQUIRED` | 401 | "Amazon API 인증 필요" | 토큰 재발급 시도 |
| `ADS_SCOPE_MISSING` | 403 | "Ads API scope 미인가" | Phase 1 제한 모드 안내 |
| `ADS_RATE_LIMITED` | 429 | "Amazon API rate limit" | exponential backoff + 큐 |
| `ADS_GUARDRAIL_BLOCKED` | 422 | "안전장치 발동: {guardrail}" | 사유 표시 + override 옵션(admin만) |
| `ADS_DATA_IMMATURE` | 422 | "데이터 성숙도 부족 ({hours}h < 72h)" | 대기 안내 |
| `ADS_CAMPAIGN_LOCKED` | 423 | "수동 변경 후 잠금 ({days}일 남음)" | FR-G06 |
| `ADS_BID_EXCEEDED` | 422 | "최대 bid cap 초과 (${max})" | FR-G01 |
| `ADS_BUDGET_EXCEEDED` | 422 | "예산 3배 초과 불가" | FR-G07 |
| `ADS_ROLLBACK_FAILED` | 500 | "롤백 실패 — Amazon API 오류" | 수동 조치 안내 |
| `ADS_IMPORT_INVALID` | 400 | "엑셀 형식 오류 (row {n})" | 오류 행 표시 |

### 6.2 Safe Mode

Amazon API 장애 시 자동 전환:
- 모든 자동화 액션 중단 (변경 없이 현상 유지)
- 대시보드는 캐시된 데이터로 표시 (last_sync_at 표시)
- 알림: "Amazon API 일시 장애 — 안전 모드 활성화"

---

## 7. Security Considerations

- [x] API 키/시크릿 환경변수 전용 (Doppler)
- [x] org_unit_id + brand_market_id RLS (모든 ads.* 테이블)
- [x] `withAuth()` 미들웨어 (역할 기반)
- [x] viewer 역할: GET만 허용
- [x] Amazon OAuth refresh_token 암호화 저장 (marketplace_profiles)
- [x] CRON_SECRET 검증 (cron 엔드포인트)
- [x] rate limit (API proxy 큐)
- [x] Input validation: Zod schema 검증 (모든 POST/PUT)
- [x] SQL injection 방지: Supabase Client (parameterized queries)
- [x] XSS 방지: Server Components + sanitize

---

## 8. Test Plan

### 8.1 L1 — API Endpoint Tests

| # | Endpoint | Method | Test | Expected |
|---|----------|--------|------|----------|
| 1 | /api/ads/campaigns | GET | 인증 없이 호출 | 401 |
| 2 | /api/ads/campaigns | GET | brand_market_id 없이 | 400 |
| 3 | /api/ads/campaigns | GET | 정상 호출 | 200 + data[] |
| 4 | /api/ads/campaigns | POST | 캠페인 생성 | 201 + marketing_code |
| 5 | /api/ads/campaigns | POST | marketing_code 형식 오류 | 400 + fieldErrors |
| 6 | /api/ads/recommendations | GET | pending 추천 조회 | 200 + summary |
| 7 | /api/ads/recommendations/[id]/approve | POST | bid 승인 | 200 + action_taken |
| 8 | /api/ads/recommendations/[id]/approve | POST | guardrail 발동 | 422 + ADS_GUARDRAIL_BLOCKED |
| 9 | /api/ads/budgets | GET | 연간 예산 조회 | 200 + plans + actuals |
| 10 | /api/ads/budgets | PUT | 예산 저장 | 200 + change_log 생성 |
| 11 | /api/ads/budgets/import | POST | CSV import | 200 + imported_count |
| 12 | /api/ads/rules | POST | 규칙 생성 | 201 |
| 13 | /api/ads/rules/simulate | POST | 시뮬레이션 | 200 + affected_keywords |
| 14 | /api/ads/autopilot/[id]/rollback | POST | 롤백 실행 | 200 + rolled_back_count |
| 15 | /api/ads/dayparting/heatmap | GET | 히트맵 데이터 | 200 + weights[] |
| 16 | /api/ads/cron/sync-campaigns | POST | CRON_SECRET 없이 | 401 |

### 8.2 L2 — UI Action Tests

| # | Page | Action | Assert |
|---|------|--------|--------|
| 1 | S03 | [+ New Campaign] 클릭 | M01 모달 열림 |
| 2 | M01a | 6자리 코드 자동 생성 | 코드 형식 검증 |
| 3 | M01b | Auto Pilot 선택 | Permanent 경고 표시 |
| 4 | S04 | Approve 클릭 | recommendation 상태 변경 |
| 5 | S04 | Apply All 클릭 | 모든 Top 3 승인 |
| 6 | S07 | 히트맵 셀 클릭 | ON/OFF 토글 |
| 7 | S07 | Apply AI Schedule | 스케줄 적용 |
| 8 | S09 | [Undo] 클릭 | 롤백 실행 + 상태 갱신 |
| 9 | S13 | 예산 셀 수정 + Save | 예산 저장 + change_log |
| 10 | S13 | Import 클릭 + CSV 업로드 | import 결과 표시 |

### 8.3 L3 — E2E Scenario Tests

| # | Scenario | Steps | Assert |
|---|----------|-------|--------|
| 1 | Manual 캠페인 생성 → 키워드 최적화 | M01 완료 → S04 → Approve → 확인 | 캠페인+키워드+change_log |
| 2 | Auto Pilot 생성 → 모니터링 → 롤백 | M01 AP → S08 → S09 → Undo | AP 상태+롤백 이력 |
| 3 | 연간 예산 입력 → Director 확인 | S13 입력 → S02 pacing 확인 | 예산 반영 |
| 4 | 규칙 생성 → 시뮬레이션 → 실행 | M03 생성 → Simulate → cron 실행 → S09 로그 | 규칙 적용 이력 |

---

## 9. Clean Architecture

### 9.1 Layer Structure

```
Page (App Router)       ← Server Component, data fetching
  └─ Feature Component  ← Client Component (인터랙션)
      └─ Shared Component ← 재사용 UI
      └─ queries.ts     ← Supabase 쿼리 (서버 전용)
      └─ types.ts       ← 타입 정의

API Route               ← withAuth + Zod validation
  └─ engine/*           ← 비즈니스 로직 (guardrails 포함)
  └─ api/*              ← Amazon API 호출
  └─ queries.ts         ← DB 쿼리
```

### 9.2 Dependency Rules

```
✅ Page → features/*/components    (UI)
✅ Page → features/*/queries       (데이터)
✅ features/* → shared/*           (공통)
✅ features/* → engine/*           (로직, API route에서만)
✅ API route → engine/*            (비즈니스 로직)
✅ engine/* → api/*                (Amazon API)
✅ 모든 곳 → @/components/ui/*    (플랫폼 공통 UI)
✅ 모든 곳 → @/lib/*              (플랫폼 공통 라이브러리)

❌ features/dashboard → features/campaigns   (feature 간 직접 참조 금지)
❌ shared/* → features/*                      (역방향 금지)
❌ engine/* → features/*                      (역방향 금지)
❌ modules/ads → modules/ip                   (모듈 격리)
```

### 9.3 File Import Rules

```typescript
// ✅ OK
import { KpiCard } from '@/modules/ads/shared/components/kpi-card'
import { getCampaigns } from '@/modules/ads/features/campaigns/queries'
import { checkGuardrails } from '@/modules/ads/engine/guardrails'
import { Button } from '@/components/ui/button'
import { withAuth } from '@/lib/auth'

// ❌ NEVER
import { something } from '@/modules/ip/...'
import { something } from '../dashboard/queries'  // feature 간 참조
```

---

## 10. Coding Convention Reference

### 10.1 Naming

| Category | Convention | Example |
|----------|-----------|---------|
| Component | PascalCase | `BidOptimization`, `CampaignTable` |
| Function | camelCase | `getCampaigns`, `checkGuardrails` |
| Constant | UPPER_SNAKE | `MAX_BID_CAP`, `CRON_SECRET` |
| File | kebab-case | `bid-optimization.tsx`, `campaign-table.tsx` |
| Type | PascalCase + `type` | `type Campaign = { ... }` |
| DB Table | snake_case | `ads.report_snapshots` |
| API Route | kebab-case | `/api/ads/spend-intelligence` |
| Environment | UPPER_SNAKE | `AMAZON_ADS_REFRESH_TOKEN_US` |

### 10.2 Import Order

```typescript
// 1. React/Next.js
import { Suspense } from 'react'
import { redirect } from 'next/navigation'

// 2. 플랫폼 공통
import { withAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

// 3. 모듈 공통
import { KpiCard } from '@/modules/ads/shared/components/kpi-card'
import type { Campaign } from '@/modules/ads/shared/types'

// 4. Feature 로컬
import { getCampaigns } from './queries'
import { CampaignTable } from './components/campaign-table'
```

---

## 11. Implementation Guide

### 11.1 File Structure Summary

| Category | Count | Key Files |
|----------|-------|-----------|
| Pages | 7 | dashboard, campaigns, optimization, autopilot, reports + nested |
| API Routes | ~25 | campaigns, recommendations, budgets, rules, dayparting, cron... |
| Feature Components | ~35 | 6 feature folders × ~6 components each |
| Shared Components | ~10 | KPI card, badges, selectors, bars |
| Engine | 6 | rule-engine, bid-calculator, budget-pacer, guardrails... |
| Cron | 6 | sync-campaigns, sync-reports, brand-analytics... |
| DB Tables | 20 | ads.* schema |
| Types | ~15 | per-feature + shared + API |

### 11.2 Implementation Order

```
Phase 0: 인프라 (Week 0)
  ├── ads 스키마 생성 (Supabase SQL Editor)
  ├── RLS 정책 적용
  ├── marketplace_profiles 시드 데이터
  ├── 모듈 status active 전환
  └── 기본 라우트 스캐폴딩

Phase 1-A: Campaign Management (Week 1-2)
  ├── shared/ 공통 컴포넌트 (KPI card, badge, selector)
  ├── features/campaigns/ (S03 + M01 + M02)
  ├── API: /api/ads/campaigns (CRUD)
  ├── Marketing Code 생성 로직
  └── engine/guardrails.ts (기본)

Phase 1-B: Dashboard (Week 2-3)
  ├── features/dashboard/ (S01 + S02)
  ├── API: /api/ads/dashboard/* (집계)
  └── 역할별 뷰 자동 전환

Phase 1-C: Optimization (Week 3-5)
  ├── features/optimization/ (S04 + S05 + S06 + S07 + S11)
  ├── API: /api/ads/recommendations, rules, dayparting
  ├── engine/bid-calculator.ts
  ├── engine/budget-pacer.ts
  ├── engine/rule-engine.ts
  ├── engine/dayparting-engine.ts
  └── M03 + M04 + M05 모달

Phase 1-D: Auto Pilot (Week 5-6)
  ├── features/autopilot/ (S08 + S09)
  ├── API: /api/ads/autopilot/*
  ├── automation_log + rollback
  └── confidence scoring

Phase 1-E: Budget + Reports (Week 6-7)
  ├── features/budget-planning/ (S13)
  ├── features/spend-intelligence/ (S12)
  ├── API: /api/ads/budgets, reports
  └── Excel import

Phase 1-F: Cron + API Integration (Week 7-8)
  ├── cron/ 전체 (Ads API 인가 후)
  ├── api/ Amazon API 클라이언트
  ├── token-manager (multi-account)
  └── 통합 테스트
```

### 11.3 Session Guide — 3-Person Parallel

> **작업 방식**: 3명이 각자 Claude Code 세션을 열고 동시 작업.
> **브랜치 전략**: `ads/track-a`, `ads/track-b`, `ads/track-c` → PR 후 `ads/main` 머지.
> **충돌 방지**: 각 트랙은 서로 다른 feature 폴더만 터치. `shared/` 수정 시 PR 필수.

#### Module Map

| Module Key | Feature Folder | Screens | Dependencies |
|------------|---------------|---------|--------------|
| `infra` | (schema + RLS + scaffold) | — | None |
| `shared` | shared/ | — | infra |
| `engine` | engine/ | — | shared |
| `campaigns` | campaigns/ | S03, M01, M02 | shared |
| `dashboard` | dashboard/ | S01, S02 | shared |
| `optimization` | optimization/ | S04-S07, S11, M03-M05 | shared, engine |
| `autopilot` | autopilot/ | S08, S09 | shared, engine |
| `budget` | budget-planning/ | S13 | shared |
| `reports` | spend-intelligence/ | S12 | shared |
| `api-client` | api/ | — | None |
| `cron` | cron/ | — | engine, api |

#### Phase 0: Foundation (Jayden 단독, 전원 대기)

모든 트랙의 선행 작업. 완료 후 3명 동시 시작.

```
Session 0: infra + shared + engine
├── ads 스키마 20 테이블 생성 (Supabase SQL Editor)
├── RLS 정책 적용
├── marketplace_profiles 시드 데이터
├── 모듈 status active 전환 (modules.ts)
├── 기본 라우트 스캐폴딩 (layout.tsx + 빈 page.tsx 7개)
├── shared/ 공통 컴포넌트 10종 (KPI card, badge, selector, progress bar...)
├── shared/types.ts (Campaign, Keyword, Budget 등 공통 타입)
├── shared/hooks/ (useMarketContext, useCampaigns)
└── engine/ 자동화 엔진 6종 (guardrails, bid-calculator, rule-engine...)
Est. ~30 files
```

#### Phase 1: 3-Track Parallel (Session 0 완료 후 동시 시작)

```
┌──────────────────────────┬──────────────────────────┬──────────────────────────┐
│  Track A (Jayden)        │  Track B (PM1)           │  Track C (PM2)           │
│  ads/track-a 브랜치      │  ads/track-b 브랜치      │  ads/track-c 브랜치      │
│  기술 집중               │  독립 화면               │  UI 집중                 │
├──────────────────────────┼──────────────────────────┼──────────────────────────┤
│                          │                          │                          │
│ A1: campaigns/           │ B1: dashboard/           │ C1: optimization/ pt.1   │
│  S03 Campaign Table      │  S01 CEO Dashboard       │  S04 Bid Optimization    │
│  M01 Create (4-step)     │  S02 Director Dashboard  │  S05 Daily Budget Pacing │
│  M02 Detail Panel        │  역할별 자동 뷰 전환     │  M04 Alert Detail        │
│  Marketing Code 생성     │                          │  M05 Underspend Analysis │
│  API: /campaigns/*       │  API: /dashboard/*       │  API: /recommendations/* │
│  ~15 files               │  ~10 files               │  ~15 files               │
│                          │                          │                          │
│ ▼ A1 완료 후             │ ▼ B1 완료 후             │ ▼ C1 완료 후             │
│                          │                          │                          │
│ A2: api/ + cron/         │ B2: budget-planning/     │ C2: optimization/ pt.2   │
│  Amazon Ads API client   │  S13 Annual Budget Plan  │  S06 Keywords            │
│  SP-API client           │  Excel Import 모달       │  S07 Dayparting Schedule │
│  Token Manager (multi)   │  Change Log Viewer       │  S11 AI Recommendations  │
│  6 cron jobs             │  API: /budgets/*         │  M03 Rule Create         │
│  ~12 files               │  ~10 files               │  API: /rules/*, /daypart │
│                          │                          │  ~12 files               │
│                          │ ▼ B2 완료 후             │                          │
│                          │                          │ ▼ C2 완료 후             │
│                          │ B3: spend-intelligence/  │                          │
│                          │  S12 Spend Intelligence  │ C3: autopilot/           │
│                          │  Top Wasters Table       │  S08 Auto Pilot Main     │
│                          │  Trend Alerts            │  S09 Auto Pilot Detail   │
│                          │  AI Diagnosis Card       │  AI Activity Log         │
│                          │  Quick Fix Actions       │  Rollback 시스템         │
│                          │  Export (CSV)            │  API: /autopilot/*       │
│                          │  API: /reports/*         │  ~10 files               │
│                          │  ~8 files                │                          │
│                          │                          │                          │
└──────────────────────────┴──────────────────────────┴──────────────────────────┘
```

#### 트랙 배정 근거

| Track | 담당 | 이유 |
|-------|------|------|
| **A: Jayden** | campaigns + API + cron | Amazon API 연동, 토큰 관리, cron = 가장 기술적. 개발자 필수 |
| **B: PM1** | dashboard + budget + spend-intel | 내부 DB만 사용, Ads API 불필요. 완전 독립적 |
| **C: PM2** | optimization + autopilot | UI 가장 복잡 (히트맵, 테이블, 모달 3개). 디자인 이해도 높은 PM |

#### 파일 소유권 (충돌 방지)

```
Jayden (Track A):
  ✅ features/campaigns/**
  ✅ api/**
  ✅ cron/**
  ❌ 나머지 feature 폴더 터치 금지

PM1 (Track B):
  ✅ features/dashboard/**
  ✅ features/budget-planning/**
  ✅ features/spend-intelligence/**
  ❌ 나머지 feature 폴더 터치 금지

PM2 (Track C):
  ✅ features/optimization/**
  ✅ features/autopilot/**
  ❌ 나머지 feature 폴더 터치 금지

공통 (PR 필수):
  ⚠ shared/ — 컴포넌트 추가/수정 시 PR 리뷰 후 머지
  ⚠ engine/ — 로직 수정 시 Jayden 리뷰 필수
  ⚠ API route 추가 — /api/ads/ 하위 새 경로 추가 시 알림
```

#### 의존성 다이어그램

```
                Session 0 (Jayden 단독)
               infra + shared + engine
                        │
            ┌───────────┼───────────┐
            ▼           ▼           ▼
       Track A      Track B      Track C
       ┌────┐      ┌────┐      ┌────┐
       │ A1 │      │ B1 │      │ C1 │   ← 3명 동시 시작
       └──┬─┘      └──┬─┘      └──┬─┘
          ▼           ▼           ▼
       ┌────┐      ┌────┐      ┌────┐
       │ A2 │      │ B2 │      │ C2 │   ← 각자 순서대로
       └────┘      └──┬─┘      └──┬─┘
                      ▼           ▼
                   ┌────┐      ┌────┐
                   │ B3 │      │ C3 │
                   └────┘      └────┘
                      │           │
                      ▼           ▼
              ┌────────────────────────┐
              │  Phase 2: 통합 테스트   │  ← 3 트랙 머지 후
              │  E2E + Cross-feature   │
              └────────────────────────┘
```

#### 예상 주간 일정

| Week | Jayden (A) | PM1 (B) | PM2 (C) |
|------|-----------|---------|---------|
| **W1** | Session 0 (전원 대기) | — | — |
| **W2** | A1: campaigns + M01/M02 | B1: dashboard S01+S02 | C1: optimization S04+S05 |
| **W3** | A2: API client + cron | B2: budget S13 | C2: optimization S06+S07+S11 |
| **W4** | 통합 테스트 + 버그 | B3: spend-intel S12 | C3: autopilot S08+S09 |
| **W5** | 통합 테스트 + 배포 | 통합 테스트 + 배포 | 통합 테스트 + 배포 |

#### 세션별 CLAUDE.md 가이드

각 트랙 시작 시 Claude Code에 알려줄 컨텍스트:

```markdown
# Track A (Jayden) 세션 컨텍스트
- Design: docs/02-design/features/ad-optimizer.design.md §2.1, §4.2 (campaigns API)
- 내 폴더: features/campaigns/, api/, cron/
- 터치 금지: features/dashboard/, features/optimization/, features/autopilot/
- shared/ 수정 시 PR 필수

# Track B (PM1) 세션 컨텍스트
- Design: docs/02-design/features/ad-optimizer.design.md §2.1, §4.2 (dashboard/budget API)
- 내 폴더: features/dashboard/, features/budget-planning/, features/spend-intelligence/
- 터치 금지: features/campaigns/, features/optimization/, features/autopilot/
- shared/ 수정 시 PR 필수

# Track C (PM2) 세션 컨텍스트
- Design: docs/02-design/features/ad-optimizer.design.md §2.1, §4.2 (recommendations/dayparting/autopilot API)
- 내 폴더: features/optimization/, features/autopilot/
- 터치 금지: features/campaigns/, features/dashboard/, features/budget-planning/
- shared/ 수정 시 PR 필수
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-30 | Initial design — Option C architecture, 20-table ERD, API spec, UI checklist, session guide | Jayden Song |
