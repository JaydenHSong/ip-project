# Amazon Ads Integration — Design Document

> **Feature**: amazon-ads-integration
> **Architecture**: Option B — Clean Architecture (Port/Adapter)
> **Created**: 2026-04-02
> **Plan Ref**: `docs/01-plan/features/amazon-ads-integration.plan.md`

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

## 1. Overview

### 1.1 Design Goal

Phase 1에서 만든 130개 파일(UI + API + Engine)을 **전혀 수정하지 않고**, Amazon API 연동 레이어만 추가하여 실데이터를 흘려보내는 것이 목표.

Port/Adapter 아키텍처를 채택하여:
- **Port**: 비즈니스 로직이 요구하는 인터페이스 (what)
- **Adapter**: Amazon API 또는 Mock 구현체 (how)
- **Service**: 비즈니스 오케스트레이션 (sync, write-back, stream)
- **Infra**: 횡단 관심사 (rate limit, retry, token)

### 1.2 Architecture Rationale

| Decision | Rationale |
|----------|-----------|
| Port/Adapter | Mock↔Real 전환 무중단 (SC-01), 향후 다른 ad platform 추가 가능 |
| Service layer | Cron/API route에서 직접 adapter 호출 방지, 비즈니스 로직 집중 |
| Infra layer | Rate limit, retry, token을 adapter와 분리하여 재사용 |
| Factory | Feature flag 기반 DI, 테스트 시 mock 주입 용이 |

---

## 2. File Structure

### 2.1 New Files (Clean Architecture Layer)

```
src/modules/ads/api/
├── ports/                         ← Interface definitions
│   ├── ads-port.ts                ← AdsPort interface (campaigns, keywords, reports)
│   ├── sp-api-port.ts             ← SpApiPort interface (orders, brand analytics, catalog)
│   └── stream-port.ts             ← StreamPort interface (subscribe, process)
│
├── adapters/                      ← Implementations
│   ├── amazon-ads-adapter.ts      ← Real Amazon Ads API v3 (implements AdsPort)
│   ├── amazon-sp-adapter.ts       ← Real Amazon SP-API (implements SpApiPort)
│   ├── amazon-stream-adapter.ts   ← Real Marketing Stream SQS (implements StreamPort)
│   ├── mock-ads-adapter.ts        ← Mock data generator (implements AdsPort)
│   └── mock-sp-adapter.ts         ← Mock SP-API data (implements SpApiPort)
│
├── services/                      ← Business orchestration
│   ├── sync-service.ts            ← Campaign/Keyword/AdGroup sync coordinator
│   ├── write-back-service.ts      ← Action → Amazon dispatcher
│   └── stream-service.ts          ← Marketing Stream processor
│
├── infra/                         ← Cross-cutting concerns
│   ├── rate-limiter.ts            ← Token bucket (10 req/sec per profile)
│   ├── retry.ts                   ← Exponential backoff with jitter
│   ├── token-store.ts             ← Token CRUD (DB + in-memory cache)
│   └── api-config.ts              ← Feature flag + environment config
│
├── factory.ts                     ← DI container (Feature flag → adapter selection)
│
├── ads-api.ts                     ← REWRITE: thin wrapper → delegates to adapter
├── sp-api.ts                      ← REWRITE: thin wrapper → delegates to adapter
├── token-manager.ts               ← REWRITE: delegates to infra/token-store
├── types.ts                       ← KEEP: existing types + new port types
└── mock-data.ts                   ← NEW: Realistic seed data (50 campaigns, 500 keywords)

src/modules/ads/cron/              ← REWRITE all 6 (delegate to services)
├── sync-campaigns.ts              ← syncService.syncCampaigns()
├── sync-reports.ts                ← syncService.syncReports() (fallback for Stream)
├── keyword-analysis.ts            ← syncService.analyzeKeywords()
├── brand-analytics.ts             ← syncService.syncBrandAnalytics()
├── orders-pattern.ts              ← syncService.syncOrderPatterns()
└── dayparting-apply.ts            ← writeBackService.applyDayparting()

src/app/api/ads/amazon/            ← Route updates + new routes
├── callback/route.ts              ← NEW: OAuth code exchange
├── profiles/route.ts              ← NEW: List/connect profiles
├── token/route.ts                 ← REWRITE: real token management
├── sync/route.ts                  ← REWRITE: manual sync trigger
└── health/route.ts                ← NEW: API connection health check

src/app/api/ads/stream/            ← NEW: Marketing Stream
└── webhook/route.ts               ← POST: SQS webhook receiver
```

### 2.2 File Count Summary

| Category | New | Rewrite | Keep | Total |
|----------|-----|---------|------|-------|
| Ports | 3 | - | - | 3 |
| Adapters | 5 | - | - | 5 |
| Services | 3 | - | - | 3 |
| Infra | 4 | - | - | 4 |
| Factory | 1 | - | - | 1 |
| API clients | - | 3 | 1 | 4 |
| Mock data | 1 | - | - | 1 |
| Cron | - | 6 | - | 6 |
| Routes | 3 | 2 | - | 5 |
| **Total** | **20** | **11** | **1** | **32** |

---

## 3. Port Definitions

### 3.1 AdsPort (ads-port.ts)

```typescript
// Design Ref: §3.1 — Core ads platform interface
type AdsPort = {
  // ─── Read ───
  listProfiles(): Promise<AmazonProfile[]>
  listCampaigns(nextToken?: string): Promise<AmazonPaginatedResponse<AmazonCampaign>>
  listAdGroups(campaignId: string): Promise<AmazonPaginatedResponse<AmazonAdGroup>>
  listKeywords(adGroupId: string): Promise<AmazonPaginatedResponse<AmazonKeyword>>

  // ─── Write ───
  updateCampaign(campaignId: string, updates: Partial<AmazonCampaign>): Promise<AmazonCampaign>
  updateKeywordBid(keywordId: string, bid: number): Promise<AmazonKeyword>
  createKeywords(keywords: Partial<AmazonKeyword>[]): Promise<AmazonKeyword[]>
  archiveKeyword(keywordId: string): Promise<void>

  // ─── Reports ───
  requestReport(reportType: string, dateRange: DateRange): Promise<string>
  downloadReport(reportId: string): Promise<AmazonReportMetrics[]>
  getSearchTermReport(campaignId: string, dateRange: DateRange): Promise<SearchTermRow[]>
}
```

### 3.2 SpApiPort (sp-api-port.ts)

```typescript
type SpApiPort = {
  listOrders(marketplaceId: string, createdAfter: string): Promise<AmazonPaginatedResponse<AmazonOrder>>
  getOrderItems(orderId: string): Promise<OrderItem[]>
  getBrandAnalyticsSearchTerms(marketplaceId: string, reportDate: string): Promise<AmazonBrandAnalyticsRow[]>
  getCatalogItem(asin: string, marketplaceId: string): Promise<CatalogItem>
}
```

### 3.3 StreamPort (stream-port.ts)

```typescript
type StreamPort = {
  validateSignature(payload: string, signature: string): boolean
  parseMetrics(payload: unknown): StreamMetricBatch
  processMetrics(batch: StreamMetricBatch): Promise<ProcessResult>
}

type StreamMetricBatch = {
  profile_id: string
  dataset_id: string
  metrics: Array<{
    campaign_id: string
    ad_group_id?: string
    keyword_id?: string
    date: string
    hour: number
    impressions: number
    clicks: number
    cost: number
    sales: number
    orders: number
  }>
}
```

---

## 4. API Contracts

### 4.1 OAuth Callback

```
GET /api/ads/amazon/callback
  Query: code, state
  Response: { data: { profile_id, marketplace_id, status } }
  Redirect: /ads/settings?connected=true
```

### 4.2 Profiles

```
GET /api/ads/amazon/profiles
  Auth: editor+
  Response: { data: AmazonProfile[] }

POST /api/ads/amazon/profiles/:id/connect
  Auth: admin+
  Body: { marketplace_id }
  Response: { data: { connected: true } }
```

### 4.3 Health Check

```
GET /api/ads/amazon/health
  Auth: editor+
  Response: {
    data: {
      ads_api: { status: 'connected' | 'disconnected' | 'error', last_sync: string }
      sp_api: { status: 'connected' | 'disconnected' | 'error', last_sync: string }
      stream: { status: 'active' | 'inactive', last_event: string }
      token: { valid: boolean, expires_in: number }
    }
  }
```

### 4.4 Marketing Stream Webhook

```
POST /api/ads/stream/webhook
  Headers: X-Amz-Firehose-Access-Key (signature)
  Body: StreamMetricBatch (raw SQS payload)
  Response: 200 OK | 401 Unauthorized
  No Auth (webhook — signature validated instead)
```

### 4.5 Manual Sync Trigger

```
POST /api/ads/amazon/sync
  Auth: admin+
  Body: { type: 'campaigns' | 'reports' | 'keywords' | 'all' }
  Response: { data: SyncResult }
```

### 4.6 Existing Approve Route Update

기존 `POST /api/ads/recommendations/approve` 에 write-back 호출 추가:

```
POST /api/ads/recommendations/:id/approve
  Existing: DB status → 'approved'
  New addition: → writeBackService.execute(recommendation)
    → If AutoPilot: immediate Amazon API call
    → If Manual: queue for batch (or immediate if user clicks)
  Response: { data: { id, status, amazon_applied: boolean } }
```

---

## 5. Service Layer Design

### 5.1 SyncService

```typescript
class SyncService {
  constructor(
    private adsPort: AdsPort,
    private spApiPort: SpApiPort,
    private db: SupabaseClient,
  ) {}

  // Campaign sync: Amazon → ads.campaigns
  async syncCampaigns(profileId: string): Promise<SyncResult> {
    // 1. adsPort.listCampaigns() with pagination
    // 2. For each: upsert ads.campaigns (match amazon_campaign_id)
    // 3. Detect new campaigns → create with defaults
    // 4. Detect removed campaigns → mark archived
    // 5. Return { synced, created, updated, errors }
  }

  // Report sync: Amazon → ads.report_snapshots (Reporting API fallback)
  async syncReports(profileId: string, date: string): Promise<SyncResult> {
    // 1. adsPort.requestReport('sp_campaigns', { start: date, end: date })
    // 2. Poll until ready (with retry)
    // 3. adsPort.downloadReport(reportId)
    // 4. Insert into ads.report_snapshots
    // 5. Calculate derived: ACoS, ROAS, CTR, CPC
  }

  // Keyword analysis: search terms → ads.recommendations
  async analyzeKeywords(profileId: string): Promise<AnalysisResult> {
    // 1. adsPort.getSearchTermReport()
    // 2. Score by clicks, orders, ACoS
    // 3. High performers → 'promote' recommendation
    // 4. Wasters → 'negate' recommendation
    // 5. Insert ads.recommendations
  }

  // Brand Analytics: SP-API → brand data
  async syncBrandAnalytics(profileId: string, date: string): Promise<SyncResult> {
    // 1. spApiPort.getBrandAnalyticsSearchTerms()
    // 2. Store in ads.brand_analytics_snapshots
  }

  // Order patterns: SP-API → dayparting analysis
  async syncOrderPatterns(profileId: string): Promise<SyncResult> {
    // 1. spApiPort.listOrders() last 30 days
    // 2. Aggregate by hour-of-day
    // 3. Update ads.dayparting_patterns
  }
}
```

### 5.2 WriteBackService

```typescript
class WriteBackService {
  constructor(
    private adsPort: AdsPort,
    private guardrails: GuardrailEngine,
    private db: SupabaseClient,
  ) {}

  // Execute a single approved action → Amazon
  async execute(action: WriteBackAction): Promise<WriteBackResult> {
    // 1. Guardrail check (FR-G01~G10)
    // 2. If blocked → log + return { applied: false, reason }
    // 3. Call adsPort method based on action.type:
    //    - bid_adjust → adsPort.updateKeywordBid()
    //    - campaign_state → adsPort.updateCampaign()
    //    - keyword_add → adsPort.createKeywords()
    //    - keyword_negate → adsPort.archiveKeyword()
    //    - budget_adjust → adsPort.updateCampaign()
    // 4. Update DB (ads.campaigns, ads.keywords)
    // 5. Log to ads.automation_logs
    // 6. Return { applied: true, amazon_response }
  }

  // Batch execute (for Auto Pilot bulk operations)
  async executeBatch(actions: WriteBackAction[]): Promise<WriteBackResult[]> {
    // Sequential with rate limit awareness
    // Each action: execute() + 100ms delay
  }

  // Apply dayparting schedule
  async applyDayparting(profileId: string): Promise<DaypartingResult> {
    // 1. Read ads.dayparting_schedules for current hour
    // 2. For each campaign with active schedule:
    //    - If current hour = "on" → resume campaign
    //    - If current hour = "off" → pause campaign
    // 3. Only for Auto Pilot campaigns
  }
}
```

### 5.3 StreamService

```typescript
class StreamService implements StreamPort {
  constructor(
    private db: SupabaseClient,
    private alertService: AlertService,
  ) {}

  validateSignature(payload: string, signature: string): boolean {
    // HMAC-SHA256 verification with AMAZON_STREAM_SECRET
  }

  parseMetrics(payload: unknown): StreamMetricBatch {
    // Parse SQS message format → StreamMetricBatch
    // Defensive: unknown fields ignored, required fields validated
  }

  async processMetrics(batch: StreamMetricBatch): Promise<ProcessResult> {
    // 1. Upsert ads.report_snapshots (hourly granularity)
    // 2. Update ads.campaigns budget utilization
    // 3. Check alert thresholds:
    //    - Budget >80% pacing → underspend/overspend alert
    //    - ACoS spike >2x target → alert
    //    - Impressions drop >50% → alert
    // 4. Return { processed, alerts_triggered }
  }
}
```

---

## 6. Infra Layer Design

### 6.1 Rate Limiter (Token Bucket)

```typescript
class RateLimiter {
  private buckets: Map<string, TokenBucket>  // keyed by profileId

  constructor(private maxRate: number = 10, private burstSize: number = 10) {}

  async acquire(profileId: string): Promise<void> {
    // Wait until token available
    // Track utilization for health check
  }

  getUtilization(profileId: string): number {
    // 0.0 ~ 1.0 (SC-04: must be <0.6)
  }
}
```

### 6.2 Retry with Exponential Backoff

```typescript
type RetryOptions = {
  maxRetries: number      // default: 4
  baseDelay: number       // default: 1000ms
  maxDelay: number        // default: 32000ms
  retryableStatuses: number[]  // [429, 500, 502, 503, 504]
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>,
): Promise<T> {
  // Exponential backoff: delay = min(baseDelay * 2^attempt + jitter, maxDelay)
  // 429 → use Retry-After header if present
  // Log each retry to console (not DB — too noisy)
}
```

### 6.3 Token Store

```typescript
class TokenStore {
  private cache: Map<string, AmazonTokenSet>  // in-memory

  constructor(private db: SupabaseClient) {}

  // Get valid token (refresh if needed)
  async getAccessToken(profileId: string): Promise<string> {
    // 1. Check cache (expires_at > now + 60s)
    // 2. If expired: read refresh_token from ads.marketplace_profiles
    // 3. Call Amazon OAuth refresh endpoint
    // 4. Update cache + DB
    // 5. Mutex lock to prevent concurrent refreshes
  }

  // Store new token set (after OAuth callback)
  async storeToken(profileId: string, tokenSet: AmazonTokenSet): Promise<void> {
    // Update ads.marketplace_profiles + cache
  }
}
```

### 6.4 API Config

```typescript
// src/modules/ads/api/infra/api-config.ts
export const adsConfig = {
  isEnabled: () => process.env.AMAZON_ADS_ENABLED === 'true',
  isStreamEnabled: () => Boolean(process.env.AMAZON_STREAM_SQS_URL),

  ads: {
    baseUrl: 'https://advertising-api.amazon.com',
    clientId: process.env.AMAZON_CLIENT_ID ?? '',
    clientSecret: process.env.AMAZON_CLIENT_SECRET ?? '',
    redirectUri: process.env.AMAZON_ADS_REDIRECT_URI ?? '',
  },

  spApi: {
    baseUrl: 'https://sellingpartnerapi-na.amazon.com',
  },

  stream: {
    sqsUrl: process.env.AMAZON_STREAM_SQS_URL ?? '',
    secret: process.env.AMAZON_STREAM_SECRET ?? '',
  },

  rateLimit: {
    maxRate: 10,       // requests per second per profile
    burstSize: 10,
    targetUtilization: 0.6,
  },
}
```

---

## 7. Factory (DI Container)

```typescript
// src/modules/ads/api/factory.ts
import { adsConfig } from './infra/api-config'

export function createAdsPort(profileId: string): AdsPort {
  if (adsConfig.isEnabled()) {
    return new AmazonAdsAdapter(profileId, rateLimiter, tokenStore)
  }
  return new MockAdsAdapter(profileId)
}

export function createSpApiPort(profileId: string): SpApiPort {
  // SP-API is always real if tokens exist (already authorized)
  if (process.env.AMAZON_SP_API_REFRESH_TOKEN_US) {
    return new AmazonSpAdapter(profileId, tokenStore)
  }
  return new MockSpAdapter(profileId)
}

export function createSyncService(profileId: string): SyncService {
  return new SyncService(
    createAdsPort(profileId),
    createSpApiPort(profileId),
    createAdminClient(),
  )
}

export function createWriteBackService(profileId: string): WriteBackService {
  return new WriteBackService(
    createAdsPort(profileId),
    guardrailEngine,
    createAdminClient(),
  )
}

export function createStreamService(): StreamService {
  return new StreamService(createAdminClient(), alertService)
}
```

---

## 8. Mock Adapter Design

### 8.1 MockAdsAdapter

Phase 1 UI가 현실적으로 보이도록 mock 데이터 생성:

```typescript
class MockAdsAdapter implements AdsPort {
  private data: MockDataStore  // in-memory

  constructor(profileId: string) {
    this.data = generateMockData(profileId)  // 50 campaigns, 500 keywords
  }

  async listCampaigns(): Promise<...> {
    return { data: this.data.campaigns, total_count: this.data.campaigns.length }
  }

  async updateKeywordBid(keywordId: string, bid: number): Promise<...> {
    // Update in-memory + simulate 200ms latency
    const kw = this.data.keywords.find(k => k.keyword_id === keywordId)
    if (kw) kw.bid = bid
    await delay(200)
    return kw!
  }
  // ... all methods return realistic mock data
}
```

### 8.2 Mock Data Spec

| Entity | Count | Realism |
|--------|-------|---------|
| Campaigns | 50 | SP/SB/SD mix, Spigen product names, realistic budgets |
| Ad Groups | 150 | 2-4 per campaign |
| Keywords | 500 | Real phone case search terms |
| Daily metrics | 30 days | Realistic ACoS 15-45%, seasonal patterns |
| Hourly metrics | 7 days | Dayparting patterns (peak: 10AM-2PM, 7PM-10PM) |
| Search terms | 200 | Mix of relevant + irrelevant queries |

---

## 9. Cron Rewrite Plan

기존 6개 cron → Service layer 호출로 단순화:

| Cron File | Current | Rewrite To |
|-----------|---------|-----------|
| `sync-campaigns.ts` | stub (DB only) | `syncService.syncCampaigns(profileId)` |
| `sync-reports.ts` | stub | `syncService.syncReports(profileId, yesterday)` |
| `keyword-analysis.ts` | stub | `syncService.analyzeKeywords(profileId)` |
| `brand-analytics.ts` | stub | `syncService.syncBrandAnalytics(profileId, yesterday)` |
| `orders-pattern.ts` | stub | `syncService.syncOrderPatterns(profileId)` |
| `dayparting-apply.ts` | stub | `writeBackService.applyDayparting(profileId)` |

Each cron:
1. Read active profiles from `ads.marketplace_profiles`
2. For each profile: call service method
3. Log result to `ads.sync_logs` (new table if needed)
4. On 3 consecutive failures: create `ads.alerts` entry

---

## 10. Write-back Integration Points

기존 Phase 1 컴포넌트에서 write-back이 필요한 곳:

| Component | Action | Write-back |
|-----------|--------|-----------|
| `bid-optimization.tsx` | Approve recommendation | `writeBack.execute({ type: 'bid_adjust' })` |
| `bid-optimization.tsx` | Apply Top 3 | `writeBack.executeBatch(top3)` |
| `ai-recommendations.tsx` | Approve / Approve All | `writeBack.execute/executeBatch()` |
| `campaign-detail-panel.tsx` | Save settings | `writeBack.execute({ type: 'budget_adjust' })` |
| `campaign-detail-panel.tsx` | Pause/Resume | `writeBack.execute({ type: 'campaign_state' })` |
| `keywords-management.tsx` | Promote/Negate | `writeBack.execute({ type: 'keyword_add/negate' })` |
| `underspend-modal.tsx` | Apply Fix | `writeBack.execute({ type: fix_action })` |
| `rule-engine.ts` | Auto execution | `writeBack.executeBatch(ruleActions)` (AutoPilot only) |

**Integration point**: API route level (not component level)

기존 `POST /api/ads/recommendations/:id/approve` 등의 route handler에서:
```typescript
// After DB update (existing)
await approveRecommendation(id)

// New: write-back to Amazon (if enabled)
const result = await writeBackService.execute(recommendation)
// Return amazon_applied: result.applied in response
```

---

## 11. Implementation Guide

### 11.1 Implementation Order

```
Phase 2a (API 인가 전, 즉시 시작)
  1. Ports (3 files)          — interface 정의
  2. Infra (4 files)          — rate-limiter, retry, token-store, config
  3. Mock adapters (2 files)  — mock-ads, mock-sp
  4. Factory (1 file)         — DI container
  5. Mock data (1 file)       — seed generator
  6. API rewrites (3 files)   — ads-api, sp-api, token-manager → delegate
  7. SP-API real adapter (1)  — amazon-sp-adapter (tokens ready)
  8. Brand Analytics cron     — syncBrandAnalytics (SP-API, 실연동)
  9. Orders Pattern cron      — syncOrderPatterns (SP-API, 실연동)

Phase 2b (API 인가 후)
  10. Amazon Ads adapter (1)  — amazon-ads-adapter (real API)
  11. OAuth callback route    — /api/ads/amazon/callback
  12. Profiles route          — /api/ads/amazon/profiles
  13. Health check route      — /api/ads/amazon/health
  14. Token-manager real      — exchange + refresh 실구현

Phase 2c (데이터 안정화 후)
  15. SyncService (1 file)    — full implementation
  16. Campaign sync cron      — syncCampaigns
  17. Report sync cron        — syncReports (fallback)
  18. Keyword analysis cron   — analyzeKeywords
  19. Stream adapter (1)      — amazon-stream-adapter
  20. Stream service (1)      — stream processor
  21. Stream webhook route    — /api/ads/stream/webhook
  22. WriteBackService (1)    — action dispatcher
  23. Write-back integration  — approve routes 업데이트
  24. Dayparting cron          — applyDayparting
```

### 11.2 Dependency Graph

```
Ports ─────────────────────────────────────────────┐
  │                                                 │
  ▼                                                 ▼
Infra (rate-limiter, retry, token-store, config)   Mock Adapters
  │                                                 │
  ▼                                                 ▼
Factory ◄──────────────────────────────────────────┘
  │
  ├──▶ Services (sync, write-back, stream)
  │         │
  │         ▼
  │    Cron rewrites (6 files)
  │
  ├──▶ Real Adapters (amazon-ads, amazon-sp, amazon-stream)
  │
  └──▶ Routes (callback, profiles, health, webhook, sync)
```

### 11.3 Session Guide

| Session | Scope | Files | LOC | API Required? |
|---------|-------|-------|-----|---------------|
| **S1: Foundation** | Ports + Infra + Mock + Factory | 11 | ~800 | No |
| **S2: SP-API Live** | SP adapter + Brand Analytics + Orders cron | 4 | ~400 | SP-API only |
| **S3: OAuth + Ads** | Ads adapter + OAuth + Profiles + Health routes | 5 | ~500 | Ads API |
| **S4: Sync Engine** | SyncService + 4 cron rewrites | 5 | ~600 | Ads API |
| **S5: Stream + WriteBack** | Stream adapter/service/route + WriteBackService + integration | 7 | ~700 | Ads API + SQS |

**Module Map**:
```
module-1: foundation    → S1 (즉시 가능)
module-2: sp-api-live   → S2 (즉시 가능, SP-API 토큰 있음)
module-3: oauth-ads     → S3 (API 인가 필요)
module-4: sync-engine   → S4 (API 인가 필요)
module-5: stream-writeback → S5 (API + SQS 필요)
```

---

## 12. DB Changes

### 12.1 New/Modified Tables

```sql
-- Marketing Stream 수신 로그 (선택적)
CREATE TABLE IF NOT EXISTS ads.stream_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL,
  dataset_id TEXT NOT NULL,
  received_at TIMESTAMPTZ DEFAULT now(),
  metrics_count INTEGER NOT NULL,
  processing_ms INTEGER,
  status TEXT DEFAULT 'processed' -- 'processed' | 'error'
);

-- Sync 로그 (cron 실행 결과)
CREATE TABLE IF NOT EXISTS ads.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL,
  sync_type TEXT NOT NULL, -- 'campaigns' | 'reports' | 'keywords' | 'brand_analytics' | 'orders'
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  synced INTEGER DEFAULT 0,
  created INTEGER DEFAULT 0,
  updated INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_details JSONB
);

-- marketplace_profiles 컬럼 추가 (이미 존재하면 ALTER)
-- ads_api_authorized BOOLEAN DEFAULT false
-- stream_enabled BOOLEAN DEFAULT false
-- last_sync_at TIMESTAMPTZ
-- last_stream_event_at TIMESTAMPTZ
```

### 12.2 Existing Table Usage

| Table | Read | Write | Service |
|-------|------|-------|---------|
| `ads.campaigns` | Sync | Sync, WriteBack | SyncService, WriteBackService |
| `ads.ad_groups` | Sync | Sync | SyncService |
| `ads.keywords` | Sync, Analysis | Sync, WriteBack | SyncService, WriteBackService |
| `ads.report_snapshots` | - | Stream, Sync | StreamService, SyncService |
| `ads.recommendations` | WriteBack | Analysis | WriteBackService, SyncService |
| `ads.automation_logs` | - | WriteBack | WriteBackService |
| `ads.alerts` | - | Stream, Sync | StreamService, SyncService |
| `ads.marketplace_profiles` | All | Token, Sync | TokenStore, SyncService |
| `ads.dayparting_schedules` | WriteBack | - | WriteBackService |

---

## 13. Error Handling Strategy

### 13.1 Error Categories

| Category | HTTP Status | Action | Alert? |
|----------|------------|--------|--------|
| Auth (401/403) | Token expired | Auto refresh → retry | Yes (if refresh fails) |
| Rate Limit (429) | Throttled | Backoff → retry | No (expected) |
| Server Error (5xx) | Amazon down | Retry 4x → fail | Yes (3 consecutive) |
| Validation (400) | Bad request | Log + skip | No |
| Network (timeout) | Connection issue | Retry → fail | Yes (3 consecutive) |

### 13.2 Circuit Breaker (per profile)

```
CLOSED → (3 consecutive failures) → OPEN
OPEN → (30s cooldown) → HALF_OPEN
HALF_OPEN → (1 success) → CLOSED
HALF_OPEN → (1 failure) → OPEN
```

---

## 14. Testing Strategy

### 14.1 Unit Tests

| Layer | Test Focus | Mock Strategy |
|-------|-----------|---------------|
| Adapters | API call format, response parsing | HTTP mock (msw) |
| Services | Business logic, error handling | Mock ports |
| Infra | Rate limit timing, retry backoff | Timer mock |
| Factory | Feature flag switching | Env var mock |

### 14.2 Integration Tests

| Test | Scope |
|------|-------|
| Mock→Real switch | Factory returns correct adapter based on env |
| Sync flow | Service → Port → DB (with mock adapter) |
| Write-back flow | Approve → Service → Port → DB (with mock adapter) |
| Stream webhook | POST → validate → process → DB |
| Cron e2e | Cron trigger → Service → DB update |

---

## 15. UI Changes (Minimal)

Phase 1 UI는 거의 수정 없음. 추가할 것:

| Component | Change | Scope |
|-----------|--------|-------|
| Layout header | "Mock Mode" badge when AMAZON_ADS_ENABLED=false | 1 line |
| Settings page | Amazon API connection status card | New section |
| Approve response | Show `amazon_applied` status | Tooltip |
| Campaign detail | "Last synced: X min ago" timestamp | 1 line |
