# Amazon Ads Integration Plan

> **Feature**: amazon-ads-integration
> **Created**: 2026-04-02
> **Phase**: Plan
> **Depends On**: AD Optimizer Phase 1 (archived, ~97% match)
> **Blocker**: Amazon Ads API OAuth authorization (pending)

---

## Executive Summary

| Perspective | Description |
|---|---|
| **Problem** | Phase 1의 14개 화면과 37개 API는 모두 로컬 DB 데이터만 사용. Amazon Ads/SP-API 실제 데이터가 흐르지 않아 운영 불가능 |
| **Solution** | OAuth 인증 + Marketing Stream 실시간 수집 + Write-back 엔진으로 Amazon ↔ A.R.C. 양방향 데이터 파이프라인 구축 |
| **Function UX Effect** | 현재 빈 대시보드/테이블이 실제 캠페인 데이터로 채워지고, Approve/Apply 버튼이 실제 Amazon에 반영됨 |
| **Core Value** | 수동 Seller Central 작업 시간 90% 절감. Auto Pilot 캠페인은 24/7 자율 최적화 |

---

## Context Anchor

| Anchor | Content |
|---|---|
| **WHY** | Phase 1 UI/엔진은 완성됐지만 실제 Amazon 데이터 없이는 운영 불가. API 연동이 Phase 2의 유일한 목표 |
| **WHO** | AD 팀 매니저 3명 (US 중심), Director 1명, CEO (대시보드 뷰) |
| **RISK** | Amazon Ads API OAuth 인가 지연, Rate Limit (10 req/sec/profile), Marketing Stream SQS 비용, Token 만료 |
| **SUCCESS** | 1) US 캠페인 100% 실시간 동기화 2) Approve→Amazon 반영 <30초 3) Mock↔Real 전환 무중단 |
| **SCOPE** | US 마켓 우선. Ads API + SP-API. Manual=승인 후 적용, AutoPilot=자동. Marketing Stream 실시간 |

---

## 1. Background & Motivation

### 1.1 Phase 1 완료 상태

Phase 1에서 구축된 인프라:

| 카테고리 | 구현 상태 | 파일 수 |
|----------|----------|---------|
| UI (14 screens + 5 modals) | ✅ 완성, mock 데이터 표시 가능 | ~60 |
| API Routes (37 endpoints) | ✅ 완성, DB CRUD 동작 | ~33 |
| DB Schema (22 tables) | ✅ 완성, RLS 적용 | - |
| Engine (10 guardrails) | ✅ 스켈레톤, 로직 구현 | ~10 |
| Amazon API Client | ⚠️ Stub (throw) | 4 |
| Cron Jobs | ⚠️ Stub (DB만, API 미호출) | 6 |

### 1.2 현재 Stub 파일 목록

```
src/modules/ads/api/
├── ads-api.ts          — AmazonAdsApi class (9 methods, all throw)
├── sp-api.ts           — AmazonSpApi class (4 methods, all throw)
├── token-manager.ts    — TokenManager (exchange/refresh 미구현)
└── types.ts            — 15 Amazon types (완성)

src/modules/ads/cron/
├── sync-campaigns.ts   — hourly campaign sync (stub)
├── sync-reports.ts     — daily report download (stub)
├── keyword-analysis.ts — daily keyword stats (stub)
├── brand-analytics.ts  — daily Brand Analytics (stub)
├── orders-pattern.ts   — daily dayparting patterns (stub)
└── dayparting-apply.ts — hourly schedule apply (stub)
```

### 1.3 API 인가 현황

| API | 마켓 | 상태 | 비고 |
|-----|------|------|------|
| SP-API | US | ✅ 연결 | Refresh token 보유 |
| SP-API | EU | ✅ 연결 | Refresh token 보유 |
| SP-API | UK | ✅ 연결 | Refresh token 보유 |
| Ads API | ALL | ❌ 401 | Advertising scope 인가 대기. Client ID 공유 |

---

## 2. Requirements

### 2.1 Functional Requirements

#### FR-01: OAuth Token Management
- Amazon OAuth 2.0 code exchange 구현
- Refresh token 자동 갱신 (만료 60초 전)
- Multi-profile 토큰 저장 (`ads.marketplace_profiles` 테이블)
- Feature Flag: `AMAZON_ADS_ENABLED` (false=mock, true=real)

#### FR-02: Marketing Stream Integration (실시간 데이터)
- Amazon Marketing Stream via SQS 구독
- Hourly granularity: impressions, clicks, cost, sales, orders
- Campaign/AdGroup/Keyword 레벨 메트릭
- `ads.report_snapshots` 테이블에 실시간 upsert
- Fallback: Reporting API v3 polling (Stream 장애 시)

#### FR-03: Campaign Sync (Read)
- Amazon → `ads.campaigns` 양방향 매핑 (amazon_campaign_id)
- Campaign state/budget/bid strategy 동기화
- Ad Group, Keyword 동기화
- 신규 캠페인 자동 감지 및 등록
- Sync 주기: 15분 (Marketing Stream 보완)

#### FR-04: Write-back Engine
- **Manual 캠페인**: UI Approve → Amazon API 호출 → DB 업데이트
  - Bid 변경 (`updateKeywordBid`)
  - Campaign pause/resume (`updateCampaign.state`)
  - Keyword 추가/제거 (`createKeywords`, `archiveKeyword`)
  - Budget 변경 (`updateCampaign.budget`)
- **Auto Pilot 캠페인**: Engine 결정 → 즉시 Amazon API 호출
  - Guardrail 통과 필수 (FR-G01~G10)
  - 모든 자동 액션 `ads.automation_logs`에 기록
  - Rollback 가능 (최근 5건)

#### FR-05: SP-API Integration
- Brand Analytics 검색어 보고서 (daily)
- Orders API → dayparting 패턴 분석 (daily)
- Catalog API → ASIN 메타데이터 (on-demand)

#### FR-06: Error Handling & Resilience
- Rate Limit: 429 → exponential backoff (1s, 2s, 4s, 8s, max 32s)
- Token 만료: 자동 refresh, 실패 시 alert 생성
- Sync 실패: `ads.alerts` 테이블에 기록, 3회 연속 실패 시 Slack 알림
- Partial failure: 개별 캠페인 실패 시 나머지 계속 진행

#### FR-07: Mock Mode (Feature Flag)
- `AMAZON_ADS_ENABLED=false` 시:
  - API 호출 대신 realistic mock 데이터 반환
  - Cron 실행 시 mock 데이터 생성하여 DB에 저장
  - Write-back 시 DB만 업데이트 (Amazon 미호출)
  - UI에 "Mock Mode" 배지 표시
- `AMAZON_ADS_ENABLED=true` 시:
  - 실제 Amazon API 호출
  - Mock 배지 숨김

### 2.2 Non-Functional Requirements

| NFR | Target | Rationale |
|-----|--------|-----------|
| Write-back latency | <30초 (Approve→Amazon 반영) | UX 체감 즉시 |
| Sync freshness | <5분 (Marketing Stream) | 실시간 의사결정 |
| Rate limit headroom | <60% utilization (10 req/sec) | burst 여유 |
| Token refresh | 0 downtime | 만료 전 자동 갱신 |
| Mock↔Real 전환 | 환경변수만 변경, 재배포 | 무중단 전환 |

---

## 3. Architecture

### 3.1 Data Flow

```
                    ┌─────────────────────────┐
                    │   Amazon Ads Platform    │
                    └────┬──────────┬─────────┘
                         │          │
              ┌──────────┘          └──────────┐
              ▼                                ▼
   ┌──────────────────┐             ┌──────────────────┐
   │ Marketing Stream  │             │  Ads API v3      │
   │ (SQS → Webhook)  │             │  (REST)          │
   └────────┬─────────┘             └────────┬─────────┘
            │ Real-time                      │ On-demand
            │ push                           │ read/write
            ▼                                ▼
   ┌──────────────────────────────────────────────────┐
   │              A.R.C. Integration Layer             │
   │  ┌────────────┐  ┌───────────┐  ┌─────────────┐  │
   │  │ Stream     │  │ Sync      │  │ Write-back  │  │
   │  │ Receiver   │  │ Engine    │  │ Engine      │  │
   │  └─────┬──────┘  └─────┬─────┘  └──────┬──────┘  │
   │        │               │               │          │
   │        └───────┬───────┘               │          │
   │                ▼                       ▼          │
   │  ┌──────────────────────────────────────────────┐ │
   │  │          ads.* DB Tables (Supabase)          │ │
   │  │  campaigns │ report_snapshots │ keywords     │ │
   │  │  ad_groups │ automation_logs  │ alerts       │ │
   │  └──────────────────────────────────────────────┘ │
   │                ▲                                  │
   │                │                                  │
   │  ┌──────────────────────────────────────────────┐ │
   │  │     Feature Flag: AMAZON_ADS_ENABLED         │ │
   │  │     false → MockProvider │ true → RealAPI    │ │
   │  └──────────────────────────────────────────────┘ │
   └──────────────────────────────────────────────────┘
              ▲                         │
              │                         ▼
   ┌──────────────────┐      ┌──────────────────┐
   │  Phase 1 UI      │      │  SP-API          │
   │  (14 screens)    │      │  (Brand Anal.)   │
   │  (5 modals)      │      │  (Orders)        │
   │  (37 endpoints)  │      │  (Catalog)       │
   └──────────────────┘      └──────────────────┘
```

### 3.2 Provider Pattern (Feature Flag)

```typescript
// src/modules/ads/api/provider.ts
type AdsProvider = {
  listCampaigns(): Promise<AmazonPaginatedResponse<AmazonCampaign>>
  updateKeywordBid(keywordId: string, bid: number): Promise<AmazonKeyword>
  // ... all methods
}

// Feature flag switch
export function getAdsProvider(profileId: string): AdsProvider {
  if (process.env.AMAZON_ADS_ENABLED === 'true') {
    return new AmazonAdsApi(profileId)  // Real API
  }
  return new MockAdsProvider(profileId)  // Mock data
}
```

### 3.3 Marketing Stream Architecture

```
Amazon Marketing Stream
  → SQS Queue (us-east-1)
    → API Gateway webhook endpoint
      → /api/ads/stream/webhook (POST)
        → Validate signature
        → Parse metric payload
        → Upsert ads.report_snapshots
        → Update ads.campaigns (budget utilization)
        → Trigger real-time alerts if thresholds breached
```

---

## 4. Implementation Modules

### Module 1: Foundation (API 인가 전 구현 가능)
**Provider Pattern + Mock + Feature Flag**

| Item | File | Description |
|------|------|-------------|
| Provider interface | `api/provider.ts` | AdsProvider + SpApiProvider 타입 |
| Mock provider | `api/mock-provider.ts` | Realistic mock 데이터 생성기 |
| Feature flag | `api/config.ts` | AMAZON_ADS_ENABLED 관리 |
| Mock data seed | `api/mock-data.ts` | 캠페인 50개, 키워드 500개 mock |
| UI Mock badge | shared component | "Mock Mode" 표시 |

### Module 2: OAuth & Token (API 인가 후)
**Token Manager 실구현**

| Item | File | Description |
|------|------|-------------|
| OAuth callback | `app/api/ads/amazon/callback/route.ts` | Code → token exchange |
| Token refresh | `api/token-manager.ts` | refresh 로직 + DB 저장 |
| Profile setup | `app/api/ads/amazon/profiles/route.ts` | 프로필 목록 + 연결 |
| Connection UI | settings page component | 마켓별 연결 상태 표시 |

### Module 3: Marketing Stream (실시간 수집)
**SQS → Webhook → DB**

| Item | File | Description |
|------|------|-------------|
| Stream webhook | `app/api/ads/stream/webhook/route.ts` | SQS webhook 수신 |
| Stream processor | `api/stream-processor.ts` | 메트릭 파싱 + DB upsert |
| Signature validator | `api/stream-validator.ts` | Amazon signature 검증 |
| Fallback sync | `cron/sync-reports.ts` | Reporting API v3 fallback |

### Module 4: Sync Engine (Campaign/Keyword/AdGroup)
**Amazon → DB 동기화**

| Item | File | Description |
|------|------|-------------|
| Campaign sync | `cron/sync-campaigns.ts` | 15분 주기, upsert |
| Keyword sync | `cron/sync-keywords.ts` | (신규) daily, bulk |
| AdGroup sync | `cron/sync-ad-groups.ts` | (신규) daily |
| SP-API Brand | `cron/brand-analytics.ts` | daily, search terms |
| SP-API Orders | `cron/orders-pattern.ts` | daily, dayparting |

### Module 5: Write-back Engine
**DB → Amazon 변경 적용**

| Item | File | Description |
|------|------|-------------|
| Write-back dispatcher | `api/write-back.ts` | Action → API 매핑 |
| Bid updater | `api/actions/update-bid.ts` | Keyword bid 변경 |
| Campaign updater | `api/actions/update-campaign.ts` | State/budget 변경 |
| Keyword manager | `api/actions/manage-keywords.ts` | 추가/제거/negate |
| Auto Pilot executor | `api/actions/autopilot-executor.ts` | 자동 실행 + guardrail |
| Approve route update | existing route | Approve → write-back 호출 |

### Module 6: Error Handling & Monitoring
**Resilience layer**

| Item | File | Description |
|------|------|-------------|
| Rate limiter | `api/rate-limiter.ts` | Token bucket (10 req/sec) |
| Retry handler | `api/retry.ts` | Exponential backoff |
| Sync monitor | `api/sync-monitor.ts` | 실패 추적 + alert 생성 |
| Health check | `app/api/ads/health/route.ts` | (신규) API 연결 상태 |

---

## 5. Phased Rollout

API 인가 상태에 따른 단계별 실행:

### Phase 2a: Mock Foundation (API 인가 전, 즉시 시작 가능)
- Module 1: Provider Pattern + Mock + Feature Flag
- Module 6: Rate limiter + Retry (인프라)
- SP-API 실연동: Brand Analytics + Orders (토큰 있음)
- 예상: 2-3 세션

### Phase 2b: OAuth + Stream (API 인가 직후)
- Module 2: OAuth callback + Token refresh
- Module 3: Marketing Stream webhook
- US 프로필 연결 + 실시간 데이터 수신 시작
- 예상: 2 세션

### Phase 2c: Full Sync + Write-back (데이터 안정화 후)
- Module 4: Campaign/Keyword/AdGroup sync
- Module 5: Write-back engine
- Auto Pilot 자동 실행 활성화
- 예상: 2-3 세션

### Phase 2d: Multi-market Expansion (US 안정화 후)
- EU/UK/JP/CA 마켓 추가
- 마켓별 Rate limit 분리
- 다국어 알림 지원
- 예상: 1-2 세션

---

## 6. Success Criteria

| # | Criteria | Measurement |
|---|----------|-------------|
| SC-01 | Mock↔Real 무중단 전환 | 환경변수만 변경, 재배포 후 정상 동작 |
| SC-02 | US 캠페인 100% 실시간 동기화 | Marketing Stream → DB <5분 latency |
| SC-03 | Write-back <30초 | Approve 클릭 → Amazon 반영 시간 측정 |
| SC-04 | Rate Limit 60% 이하 | 10 req/sec 중 6 이하 사용 |
| SC-05 | Auto Pilot 자동 실행 정상 | Guardrail 통과 → Amazon 적용 → 로그 기록 |
| SC-06 | Token 자동 갱신 0 downtime | 1주일간 401 에러 0건 |
| SC-07 | Sync 실패 자동 복구 | 3회 연속 실패 시 alert + 자동 재시도 |
| SC-08 | Mock 데이터 현실적 | 50 캠페인, 500 키워드, 30일 메트릭 |

---

## 7. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Ads API 인가 지연 | Phase 2b/c 블로킹 | High | Phase 2a (Mock + SP-API) 먼저 진행 |
| Marketing Stream SQS 비용 | 월 $50-200 예상 | Medium | 비용 모니터링 + 불필요 메트릭 필터 |
| Rate limit (10 req/sec) | 대량 write-back 시 지연 | Medium | Token bucket + batch API 활용 |
| Token 만료 race condition | 동시 요청 시 중복 refresh | Low | Mutex lock + single refresh |
| Amazon API 스키마 변경 | 파싱 실패 | Low | 방어적 파싱 + alert |
| Marketing Stream 장애 | 실시간 데이터 중단 | Low | Reporting API v3 fallback (자동) |

---

## 8. Environment Variables (신규)

```env
# Feature Flag
AMAZON_ADS_ENABLED=false          # true: real API, false: mock

# Marketing Stream
AMAZON_STREAM_SQS_URL=            # SQS queue URL
AMAZON_STREAM_SECRET=             # Webhook signature secret

# Health Check
AMAZON_ADS_HEALTH_CHECK_URL=      # /api/ads/health endpoint
```

기존 변수 (Phase 1에서 정의됨):
```env
AMAZON_CLIENT_ID=amzn1.application-oa2-client.655c21cd...
AMAZON_CLIENT_SECRET=amzn1.oa2-cs.v1.xxxxx
AMAZON_SP_API_REFRESH_TOKEN_US=Atzr|xxxxx
# AMAZON_ADS_REFRESH_TOKEN_US=     # 인가 후 추가
# AMAZON_ADS_PROFILE_ID_US=        # 인가 후 추가
```

---

## 9. Dependencies

| Dependency | Status | Required For |
|-----------|--------|-------------|
| Amazon Ads API OAuth | ❌ Pending | Module 2, 3, 4, 5 |
| SP-API tokens (US/EU/UK) | ✅ Ready | Module 4 (Brand Analytics, Orders) |
| Phase 1 code (archived) | ✅ Complete | All modules |
| AWS SQS access | ❓ TBD | Module 3 (Marketing Stream) |
| Supabase Edge Functions (optional) | ❓ TBD | Module 3 (webhook) |

---

## 10. File Impact Summary

| Category | New Files | Modified Files | Estimated LOC |
|----------|-----------|---------------|--------------|
| Module 1: Foundation | 4 | 2 | ~400 |
| Module 2: OAuth | 3 | 1 | ~300 |
| Module 3: Stream | 3 | 1 | ~350 |
| Module 4: Sync | 2 (new) + 4 (rewrite) | 0 | ~600 |
| Module 5: Write-back | 5 | 3 | ~500 |
| Module 6: Error Handling | 4 | 0 | ~300 |
| **Total** | **~21** | **~7** | **~2,450** |
