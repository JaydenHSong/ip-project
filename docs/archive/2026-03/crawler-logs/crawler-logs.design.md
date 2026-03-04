# Crawler Logs Design Document

> **Feature**: crawler-logs
> **Plan**: `docs/01-plan/features/crawler-logs.plan.md`
> **Date**: 2026-03-04
> **Status**: Draft

---

## 1. Implementation Items

| # | Item | File | Type |
|---|------|------|------|
| 1 | crawler_logs 테이블 DDL | Supabase SQL Editor | SQL |
| 2 | CrawlerLogRequest 타입 | `crawler/src/types/index.ts` | Modify |
| 3 | submitLog 메서드 | `crawler/src/api/sentinel-client.ts` | Modify |
| 4 | 잡 완료/에러 시 로그 전송 | `crawler/src/scheduler/jobs.ts` | Modify |
| 5 | POST /api/crawler/logs | `src/app/api/crawler/logs/route.ts` | New |
| 6 | GET /api/crawler/logs | `src/app/api/crawler/logs/route.ts` | New (같은 파일) |
| 7 | CrawlerLogsDashboard 컴포넌트 | `src/app/(protected)/settings/CrawlerLogsDashboard.tsx` | New |
| 8 | CrawlerSettings에 Logs 탭 추가 | `src/app/(protected)/settings/CrawlerSettings.tsx` | Modify |
| 9 | i18n EN 번역 | `src/lib/i18n/locales/en.ts` | Modify |
| 10 | i18n KO 번역 | `src/lib/i18n/locales/ko.ts` | Modify |

---

## 2. Database Design

### 2.1 crawler_logs 테이블

```sql
CREATE TABLE crawler_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  keyword TEXT,
  marketplace TEXT,

  -- 잡 완료 시 결과 요약
  pages_crawled INT,
  listings_found INT,
  listings_sent INT,
  new_listings INT,
  duplicates INT,
  errors INT,
  captchas INT,
  proxy_rotations INT,
  duration_ms INT,

  -- 에러/이벤트 상세
  message TEXT,
  asin TEXT,
  error_code TEXT,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_crawler_logs_type ON crawler_logs(type);
CREATE INDEX idx_crawler_logs_created ON crawler_logs(created_at DESC);
CREATE INDEX idx_crawler_logs_campaign ON crawler_logs(campaign_id);
```

### 2.2 로그 타입

```typescript
type CrawlerLogType =
  | 'crawl_complete'   // 잡 성공 완료
  | 'crawl_error'      // 잡 실패
  | 'proxy_ban'        // IP 차단
  | 'captcha'          // 캡차 감지
  | 'rate_limit'       // 속도 제한
  | 'api_error'        // Web API 전송 실패
```

---

## 3. API Design

### 3.1 POST `/api/crawler/logs` (Crawler → Web)

크롤러가 로그 이벤트를 전송하는 엔드포인트.

```typescript
// Auth: withServiceAuth (Service Token)
// Body:
type CrawlerLogRequest = {
  type: CrawlerLogType
  campaign_id?: string
  keyword?: string
  marketplace?: string

  // crawl_complete 전용
  pages_crawled?: number
  listings_found?: number
  listings_sent?: number
  new_listings?: number
  duplicates?: number
  errors?: number
  captchas?: number
  proxy_rotations?: number
  duration_ms?: number

  // 에러/이벤트 전용
  message?: string
  asin?: string
  error_code?: string
}

// Response: 201
{ ok: true, id: string }
```

**로직:**
1. 요청 바디 검증: `type` 필수
2. `createAdminClient()`로 Supabase insert
3. fire-and-forget 스타일로 크롤러에서 호출 (실패해도 크롤링 중단 안 함)

### 3.2 GET `/api/crawler/logs` (Web UI → API)

로그 목록 + 요약 통계 조회.

```typescript
// Auth: withAuth(['admin'])
// Query params:
//   type: string (optional) — 로그 타입 필터
//   keyword: string (optional) — 키워드 검색
//   days: number (default: 7) — 최근 N일
//   page: number (default: 1)
//   limit: number (default: 50, max: 100)

// Response:
{
  logs: CrawlerLog[],
  summary: {
    total_crawls: number,
    successful: number,
    failed: number,
    total_listings_found: number,
    total_new_listings: number,
    total_bans: number,
    total_captchas: number,
  },
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number,
  }
}
```

**로직:**
1. `days` 파라미터로 기간 필터 (`created_at >= now() - interval '{days} days'`)
2. summary는 같은 기간의 집계 (별도 쿼리)
3. logs는 `created_at DESC` 정렬 + 페이지네이션

### 3.3 Summary 집계 쿼리

```sql
-- total_crawls: type = 'crawl_complete' 또는 'crawl_error' 건수
-- successful: type = 'crawl_complete' 건수
-- failed: type = 'crawl_error' 건수
-- total_listings_found: SUM(listings_found) WHERE type = 'crawl_complete'
-- total_new_listings: SUM(new_listings) WHERE type = 'crawl_complete'
-- total_bans: type = 'proxy_ban' 건수
-- total_captchas: type = 'captcha' 건수
```

Supabase에서는 RPC 대신 여러 count 쿼리를 병렬로 실행:
```typescript
const [crawlComplete, crawlError, bans, captchas] = await Promise.all([
  supabase.from('crawler_logs').select('listings_found, new_listings', { count: 'exact' }).eq('type', 'crawl_complete').gte('created_at', sinceDate),
  supabase.from('crawler_logs').select('*', { count: 'exact', head: true }).eq('type', 'crawl_error').gte('created_at', sinceDate),
  supabase.from('crawler_logs').select('*', { count: 'exact', head: true }).eq('type', 'proxy_ban').gte('created_at', sinceDate),
  supabase.from('crawler_logs').select('*', { count: 'exact', head: true }).eq('type', 'captcha').gte('created_at', sinceDate),
])
```

---

## 4. Crawler Modifications

### 4.1 CrawlerLogRequest 타입 (types/index.ts)

```typescript
type CrawlerLogRequest = {
  type: 'crawl_complete' | 'crawl_error' | 'proxy_ban' | 'captcha' | 'rate_limit' | 'api_error'
  campaign_id?: string
  keyword?: string
  marketplace?: string
  pages_crawled?: number
  listings_found?: number
  listings_sent?: number
  new_listings?: number
  duplicates?: number
  errors?: number
  captchas?: number
  proxy_rotations?: number
  duration_ms?: number
  message?: string
  asin?: string
  error_code?: string
}
```

### 4.2 sentinel-client.ts — submitLog 추가

```typescript
submitLog: async (logData: CrawlerLogRequest): Promise<void> => {
  try {
    await fetch(`${baseUrl}/api/crawler/logs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(logData),
    })
  } catch {
    // fire-and-forget: 로그 전송 실패해도 크롤링 계속
    log('warn', 'api-client', 'Failed to submit crawler log (non-fatal)')
  }
}
```

### 4.3 jobs.ts — 로그 전송 포인트

**잡 성공 완료 시** (기존 `chatNotifier.notifyCrawlComplete` 근처):
```typescript
await sentinelClient.submitLog({
  type: 'crawl_complete',
  campaign_id: campaignId,
  keyword,
  marketplace,
  pages_crawled: pageNum,  // 마지막 페이지 번호
  listings_found: totalFound,
  listings_sent: totalSent,
  new_listings: totalSent,  // created = new
  duplicates,
  errors,
  captchas: retryCount,     // captcha로 인한 재시도 횟수
  proxy_rotations: retryCount,
  duration_ms: duration,
})
```

**CAPTCHA 감지 시** (기존 `CAPTCHA_DETECTED` catch 블록):
```typescript
sentinelClient.submitLog({
  type: 'captcha',
  campaign_id: campaignId,
  keyword,
  marketplace,
  asin: result.asin,
  message: 'CAPTCHA detected, switching proxy',
}).catch(() => {})  // fire-and-forget
```

**MAX_RETRIES 초과 시**:
```typescript
await sentinelClient.submitLog({
  type: 'crawl_error',
  campaign_id: campaignId,
  keyword,
  marketplace,
  message: 'Max retries exceeded',
  error_code: 'MAX_RETRIES_EXCEEDED',
  errors,
  duration_ms: Date.now() - startTime,
})
```

**배치 전송 실패 시** (기존 submitBatch catch 블록):
```typescript
sentinelClient.submitLog({
  type: 'api_error',
  campaign_id: campaignId,
  keyword,
  marketplace,
  message: error instanceof Error ? error.message : String(error),
  error_code: 'BATCH_SUBMIT_FAILED',
}).catch(() => {})
```

---

## 5. Component Design

### 5.1 CrawlerLogsDashboard.tsx

```
Props: (none — 자체 데이터 fetch)
State:
  - logs: CrawlerLog[]
  - summary: LogSummary
  - loading: boolean
  - filters: { type: string, keyword: string, days: number }
  - page: number

Layout:
  ┌─────────────────────────────────────────────────┐
  │ Crawler Logs                        [Refresh]    │
  ├─────────────────────────────────────────────────┤
  │  Summary Cards (4개)                             │
  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────┐│
  │  │ Crawls   │ │ Listings │ │ New      │ │ Bans││
  │  │ 6 total  │ │ 576      │ │ 42       │ │ 0   ││
  │  │ 5 ok/1 err│ │ found    │ │ new      │ │     ││
  │  └──────────┘ └──────────┘ └──────────┘ └─────┘│
  ├─────────────────────────────────────────────────┤
  │ Filters                                         │
  │ [All Types ▼] [All Keywords ▼]  [Last 7 days ▼] │
  ├─────────────────────────────────────────────────┤
  │ Log Table                                        │
  │ Time │ Keyword      │ Type │ New │ Err │ Duration│
  │ 9:12 │ iphone 17... │ ✅   │  42 │   0 │ 12m    │
  │ 9:25 │ iphone 17... │ ✅   │  38 │   1 │ 14m    │
  │ 9:40 │ iphone 17... │ ❌   │   - │   - │  2m    │
  │      │ └ 403 Prox.. │      │     │     │        │
  │ ...  │ ...          │ ...  │ ... │ ... │ ...    │
  ├─────────────────────────────────────────────────┤
  │ Pagination                                       │
  └─────────────────────────────────────────────────┘
```

### 5.2 Summary Cards

| Card | 표시 | 색상 |
|------|------|------|
| Crawls | `{successful} ok / {failed} err` out of `{total_crawls}` | 파랑 |
| Listings | `{total_listings_found} found` | 보라 |
| New | `{total_new_listings} new` | 초록 |
| Bans | `{total_bans}` + `{total_captchas} captcha` | 빨강 (0이면 초록) |

### 5.3 Log Table Row

**crawl_complete 타입:**
```
| 09:12 | iphone 17 case (US) | ✅ Complete | 42 | 0 | 12m 30s |
```

**crawl_error / proxy_ban 타입:**
```
| 09:40 | iphone 17 pro max case (US) | ❌ Error | - | - | 2m 15s |
|       | └ 403 Proxy ban - IP blocked   |         |   |   |        |
```

### 5.4 Type Badge 색상

| Type | Badge | Color |
|------|-------|-------|
| crawl_complete | Complete | `bg-green-500/10 text-green-400` |
| crawl_error | Error | `bg-red-500/10 text-red-400` |
| proxy_ban | Ban | `bg-red-500/10 text-red-400` |
| captcha | Captcha | `bg-yellow-500/10 text-yellow-400` |
| rate_limit | Rate Limit | `bg-yellow-500/10 text-yellow-400` |
| api_error | API Error | `bg-orange-500/10 text-orange-400` |

### 5.5 Duration 포맷

기존 `formatUptime` 재사용 (CrawlerSettings.tsx에 이미 있음):
```typescript
const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}
```

---

## 6. CrawlerSettings 수정

현재 CrawlerSettings.tsx는 Status + Setup 두 개 Card.
Logs 대시보드를 세 번째 Card로 추가:

```typescript
{/* 기존: Crawler Status Card */}
{/* 기존: Setup & Download Card (Admin only) */}

{/* 새로 추가: Crawler Logs Dashboard */}
<CrawlerLogsDashboard />
```

---

## 7. i18n Keys

```typescript
// settings.crawler.logs
{
  title: 'Crawler Logs',
  refresh: 'Refresh',
  summary: {
    crawls: 'Crawls',
    listings: 'Listings',
    newListings: 'New',
    bans: 'Bans',
    ok: '{n} ok',
    err: '{n} err',
    found: '{n} found',
    new: '{n} new',
    captcha: '{n} captcha',
  },
  filters: {
    allTypes: 'All Types',
    allKeywords: 'All Keywords',
    days7: 'Last 7 days',
    days30: 'Last 30 days',
    days90: 'Last 90 days',
    today: 'Today',
  },
  table: {
    time: 'Time',
    keyword: 'Keyword',
    type: 'Type',
    new: 'New',
    errors: 'Errors',
    duration: 'Duration',
    noLogs: 'No crawler logs found.',
  },
  types: {
    crawl_complete: 'Complete',
    crawl_error: 'Error',
    proxy_ban: 'Ban',
    captcha: 'Captcha',
    rate_limit: 'Rate Limit',
    api_error: 'API Error',
  },
}
```

---

## 8. Implementation Order

1. Supabase SQL Editor에서 `crawler_logs` 테이블 생성
2. `crawler/src/types/index.ts` — `CrawlerLogRequest` 타입 추가
3. `crawler/src/api/sentinel-client.ts` — `submitLog` 메서드 추가
4. `crawler/src/scheduler/jobs.ts` — 4개 포인트에서 로그 전송
5. `src/app/api/crawler/logs/route.ts` — POST + GET API
6. `src/app/(protected)/settings/CrawlerLogsDashboard.tsx` — 대시보드 UI
7. `src/app/(protected)/settings/CrawlerSettings.tsx` — 대시보드 import & 렌더
8. `src/lib/i18n/locales/en.ts` — 번역 추가
9. `src/lib/i18n/locales/ko.ts` — 번역 추가
10. typecheck 확인
