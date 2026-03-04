# Crawler Design Document

> **Summary**: 아마존 마켓플레이스 리스팅 자동 수집 크롤러 — Playwright + BullMQ + Anti-bot 상세 설계
>
> **Project**: Sentinel (센티널)
> **Version**: 0.1
> **Author**: Claude (AI)
> **Date**: 2026-03-01
> **Status**: Draft
> **Planning Doc**: [crawler.plan.md](../../01-plan/features/crawler.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- Crawler를 독립 패키지(`crawler/`)로 구성하되, Sentinel Web API 경유로 DB 접근 (DD-01)
- BullMQ + Upstash Redis로 캠페인별 스케줄링 및 재시도 관리
- Anti-bot 회피 전략을 모듈화하여 교체/확장 용이하게 설계
- 기존 Web API(`POST /api/listings`, `GET /api/campaigns`)와 완전 호환

### 1.2 Design Principles

- **셀렉터 분리**: HTML 파싱 로직과 CSS 셀렉터를 분리하여 아마존 구조 변경 시 셀렉터만 수정
- **재시도 우선**: 네트워크 오류, CAPTCHA, 차단 발생 시 자동 재시도 (최대 3회)
- **환경 변수 엄격 검증**: 시작 시 모든 필수 환경 변수 존재 확인, 누락 시 즉시 종료
- **CLAUDE.md 컨벤션 준수**: type only, no enum, no any, named export, no console.log

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Sentinel Crawler                           │
│                                                                 │
│  ┌─────────────┐    ┌─────────────────┐    ┌────────────────┐  │
│  │ Scheduler    │───▶│  Job Processor  │───▶│  API Client    │  │
│  │ (BullMQ)     │    │  (Crawl Job)    │    │  (Web API)     │  │
│  └──────┬──────┘    └────────┬────────┘    └───────┬────────┘  │
│         │                    │                      │           │
│         │           ┌───────▼────────┐              │           │
│         │           │  Scraper       │              │           │
│         │           │ ┌────────────┐ │              │           │
│         │           │ │ Search Page│ │              │           │
│         │           │ │ Detail Page│ │              │           │
│         │           │ │ Screenshot │ │              │           │
│         │           │ └────────────┘ │              │           │
│         │           └───────┬────────┘              │           │
│         │                   │                       │           │
│         │           ┌───────▼────────┐              │           │
│         │           │  Anti-Bot      │              │           │
│         │           │ ┌────────────┐ │              │           │
│         │           │ │ Proxy Mgr  │ │              │           │
│         │           │ │ Fingerprint│ │              │           │
│         │           │ │ Stealth    │ │              │           │
│         │           │ │ Human Sim  │ │              │           │
│         │           │ └────────────┘ │              │           │
│         │           └────────────────┘              │           │
│         │                                           │           │
│  ┌──────▼──────────────────────────────────────────▼──────┐    │
│  │                    Upstash Redis                        │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
         │                                           │
         │  캠페인 조회                                │ 리스팅 전송
         ▼                                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Sentinel Web (Next.js API Routes)                  │
│  GET /api/campaigns?status=active    POST /api/listings         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
1. Scheduler 시작
   └─▶ GET /api/campaigns?status=active (활성 캠페인 목록 조회)
   └─▶ 각 캠페인별 BullMQ 반복 잡 등록 (daily/every_12h/every_6h)

2. 잡 실행 (캠페인 1건)
   └─▶ 브라우저 인스턴스 생성 (Stealth + Fingerprint + Proxy)
   └─▶ 아마존 검색 URL 접속 (keyword + marketplace)
   └─▶ 검색 결과 1~N 페이지 순회
       ├─▶ ASIN 목록 추출 (search-page.ts)
       ├─▶ 각 ASIN 상세 페이지 방문 (detail-page.ts)
       │   ├─▶ 상세 데이터 파싱 (제목, 가격, 이미지, 셀러 등)
       │   ├─▶ 스크린샷 캡처 (1280x800)
       │   └─▶ 사람 행동 모방 (랜덤 딜레이, 스크롤)
       └─▶ POST /api/listings (수집 데이터 전송)

3. 에러 발생 시
   └─▶ CAPTCHA/차단 감지 → 현재 프록시 블랙리스트
   └─▶ 다른 프록시로 재시도 (최대 3회)
   └─▶ 3회 실패 → 잡 실패 기록 + BullMQ 자동 재시도 (backoff)
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| Scheduler | Upstash Redis, Web API | 잡 큐 저장, 캠페인 조회 |
| Job Processor | Scraper, Anti-Bot, API Client | 크롤링 오케스트레이션 |
| Scraper | Playwright, Selectors | HTML 파싱, 데이터 추출 |
| Anti-Bot | Playwright, Proxy Service | 탐지 회피 |
| API Client | Sentinel Web API | 데이터 전송 |

---

## 3. Data Model

### 3.1 Crawler 내부 타입

```typescript
// crawler/src/types/index.ts

// 검색 결과에서 추출한 리스팅 요약
type SearchResult = {
  asin: string
  title: string
  price: string | null
  imageUrl: string | null
  sponsored: boolean
  pageNumber: number
  positionInPage: number
}

// 상세 페이지에서 추출한 전체 데이터
type ListingDetail = {
  asin: string
  title: string
  description: string | null
  bulletPoints: string[]
  images: { url: string; position: number; alt?: string }[]
  priceAmount: number | null
  priceCurrency: string
  sellerName: string | null
  sellerId: string | null
  brand: string | null
  category: string | null
  rating: number | null
  reviewCount: number | null
  rawHtml?: string
}

// 캠페인 정보 (Web API 응답)
type Campaign = {
  id: string
  keyword: string
  marketplace: string
  frequency: string
  max_pages: number
  status: string
  start_date: string
  end_date: string | null
}

// 크롤링 잡 데이터
type CrawlJobData = {
  campaignId: string
  keyword: string
  marketplace: string
  maxPages: number
}

// 크롤링 결과
type CrawlResult = {
  campaignId: string
  totalFound: number
  totalSent: number
  duplicates: number
  errors: number
  duration: number
}

// 프록시 설정
type ProxyConfig = {
  host: string
  port: number
  username: string
  password: string
  protocol: 'http' | 'https'
}

// 마켓플레이스별 도메인 매핑
const MARKETPLACE_DOMAINS = {
  US: 'www.amazon.com',
  UK: 'www.amazon.co.uk',
  JP: 'www.amazon.co.jp',
  DE: 'www.amazon.de',
  FR: 'www.amazon.fr',
  IT: 'www.amazon.it',
  ES: 'www.amazon.es',
  CA: 'www.amazon.ca',
  AU: 'www.amazon.com.au',
} as const

type Marketplace = keyof typeof MARKETPLACE_DOMAINS
```

### 3.2 기존 DB 스키마 참조

Crawler는 직접 DB에 접근하지 않습니다 (DD-01). 아래는 Web API가 사용하는 기존 테이블입니다.

| 테이블 | Crawler 관련 | 접근 방식 |
|--------|-------------|----------|
| `campaigns` | 캠페인 조회 | `GET /api/campaigns?status=active` |
| `listings` | 수집 데이터 저장 | `POST /api/listings` |
| `campaign_listings` | 캠페인-리스팅 매핑 | Web API 내부 처리 (향후) |

---

## 4. API Specification

### 4.1 Crawler가 호출하는 Web API

Crawler는 기존 Sentinel Web API의 클라이언트입니다.

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | /api/campaigns?status=active | 활성 캠페인 목록 조회 | Service Token |
| POST | /api/listings | 수집 리스팅 저장 | Service Token |

### 4.2 Service Token 인증

Crawler는 일반 사용자가 아닌 시스템 서비스입니다. 기존 `withAuth` 미들웨어는 Supabase 세션 기반이므로, Crawler 전용 인증이 필요합니다.

**방안: Crawler 전용 API Route (`/api/crawler/*`)**

```typescript
// src/app/api/crawler/campaigns/route.ts
// 서비스 토큰 기반 인증 미들웨어

type ServiceAuthContext = {
  service: 'crawler'
}

const withServiceAuth = (
  handler: (req: NextRequest, ctx: ServiceAuthContext) => Promise<NextResponse>
): ((req: NextRequest) => Promise<NextResponse>) => {
  return async (req: NextRequest) => {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')

    if (!token || token !== process.env.CRAWLER_SERVICE_TOKEN) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid service token' } },
        { status: 401 },
      )
    }

    return handler(req, { service: 'crawler' })
  }
}
```

### 4.3 Crawler 전용 API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/crawler/campaigns | 활성 캠페인 목록 (status=active 전용) | Service Token |
| POST | /api/crawler/listings | 리스팅 배치 저장 (bulk insert) | Service Token |
| POST | /api/crawler/listings/batch | 여러 리스팅 한번에 전송 | Service Token |

#### `GET /api/crawler/campaigns`

```typescript
// Response 200
type CrawlerCampaignsResponse = {
  campaigns: {
    id: string
    keyword: string
    marketplace: string
    frequency: string
    max_pages: number
  }[]
}
```

#### `POST /api/crawler/listings`

기존 `POST /api/listings`와 동일한 Request 형식이지만 `source: 'crawler'`로 고정.

```typescript
// Request
type CrawlerListingRequest = {
  asin: string
  marketplace: string
  title: string
  description?: string
  bullet_points?: string[]
  images?: { url: string; position: number }[]
  price_amount?: number
  price_currency?: string
  seller_name?: string
  seller_id?: string
  brand?: string
  category?: string
  rating?: number
  review_count?: number
  source_campaign_id: string    // 필수 (어떤 캠페인에서 수집했는지)
  screenshot_base64?: string    // 스크린샷 (선택)
  raw_data?: unknown
}

// Response 201
type CrawlerListingResponse = {
  id: string
  asin: string
  is_suspect: boolean
  suspect_reasons: string[]
  created_at: string
}

// 409: 중복 (동일 ASIN+marketplace+날짜)
// 400: 필수 필드 누락
```

#### `POST /api/crawler/listings/batch`

```typescript
// Request
type CrawlerBatchRequest = {
  listings: CrawlerListingRequest[]
}

// Response 200
type CrawlerBatchResponse = {
  created: number
  duplicates: number
  errors: { asin: string; error: string }[]
}
```

---

## 5. Module Design

### 5.1 Config (`config.ts`)

```typescript
type CrawlerConfig = {
  sentinelApiUrl: string
  serviceToken: string
  redis: {
    url: string
    token: string
  }
  proxy: {
    host: string
    port: number
    username: string
    password: string
  }
  concurrency: number         // 동시 크롤링 수 (기본: 3)
  pageDelayMin: number        // 페이지 간 최소 딜레이 ms (기본: 2000)
  pageDelayMax: number        // 페이지 간 최대 딜레이 ms (기본: 5000)
  detailDelayMin: number      // 상세페이지 간 최소 딜레이 ms (기본: 1500)
  detailDelayMax: number      // 상세페이지 간 최대 딜레이 ms (기본: 4000)
  maxRetries: number          // 프록시 재시도 (기본: 3)
  screenshotWidth: number     // 기본: 1280
  screenshotHeight: number    // 기본: 800
}

// 환경 변수에서 로드 + 필수 값 검증
// 누락 시 throw + 상세 에러 메시지
const loadConfig = (): CrawlerConfig => { ... }
```

### 5.2 Selectors (`selectors.ts`)

아마존 HTML 구조 변경에 대비하여 셀렉터를 한 곳에 모아 관리합니다.

```typescript
// 검색 결과 페이지 셀렉터
const SEARCH_SELECTORS = {
  resultItems: '[data-component-type="s-search-result"]',
  asin: '[data-asin]',                        // data-asin 속성
  title: 'h2 a span',
  price: '.a-price .a-offscreen',
  image: '.s-image',
  sponsored: '.puis-label-popover',
  nextPage: '.s-pagination-next',
  noResults: '.s-no-results-filler',
  captcha: '#captchacharacters',
} as const

// 상세 페이지 셀렉터
const DETAIL_SELECTORS = {
  title: '#productTitle',
  price: '.a-price .a-offscreen',
  listPrice: '.a-text-price .a-offscreen',
  description: '#productDescription',
  bulletPoints: '#feature-bullets li span',
  images: '#imgTagWrapperId img, #altImages .a-button-thumbnail img',
  mainImage: '#landingImage',
  sellerName: '#sellerProfileTriggerId, #merchant-info a',
  sellerId: '#sellerProfileTriggerId',         // href에서 추출
  brand: '#bylineInfo',
  category: '#wayfinding-breadcrumbs_container li a',
  rating: '#acrPopover .a-size-base',
  reviewCount: '#acrCustomerReviewText',
  unavailable: '#availability .a-color-state',
  captcha: '#captchacharacters',
} as const
```

### 5.3 Search Page Scraper (`search-page.ts`)

```typescript
// 검색 결과 페이지 파싱
const scrapeSearchPage = async (
  page: Page,
  marketplace: Marketplace,
  keyword: string,
  pageNumber: number,
): Promise<SearchResult[]> => { ... }

// 검색 URL 생성
const buildSearchUrl = (
  marketplace: Marketplace,
  keyword: string,
  pageNumber: number,
): string => {
  const domain = MARKETPLACE_DOMAINS[marketplace]
  const params = new URLSearchParams({
    k: keyword,
    page: String(pageNumber),
  })
  return `https://${domain}/s?${params.toString()}`
}

// CAPTCHA/차단 감지
const detectBlock = async (page: Page): Promise<boolean> => { ... }
```

### 5.4 Detail Page Scraper (`detail-page.ts`)

```typescript
// 리스팅 상세 페이지 파싱
const scrapeDetailPage = async (
  page: Page,
  marketplace: Marketplace,
  asin: string,
): Promise<ListingDetail> => { ... }

// 상세 URL 생성
const buildDetailUrl = (
  marketplace: Marketplace,
  asin: string,
): string => {
  const domain = MARKETPLACE_DOMAINS[marketplace]
  return `https://${domain}/dp/${asin}`
}
```

### 5.5 Screenshot (`screenshot.ts`)

```typescript
// 페이지 스크린샷 캡처
const captureScreenshot = async (
  page: Page,
  width: number,
  height: number,
): Promise<string> => {
  // JPEG 포맷, quality 80
  // base64 인코딩 반환
  // 2MB 초과 시 quality 단계 하향 (80 → 60 → 40)
}
```

### 5.6 Proxy Manager (`proxy.ts`)

```typescript
type ProxyStatus = 'active' | 'blocked' | 'cooldown'

type ManagedProxy = {
  config: ProxyConfig
  status: ProxyStatus
  failCount: number
  lastUsed: number
  blockedUntil: number | null
}

// 프록시 매니저
// - 여러 프록시 풀 관리 (Bright Data 세션 ID 기반)
// - 실패 시 블랙리스트 + 쿨다운 (5분)
// - getNextProxy(): 사용 가능한 프록시 라운드 로빈
// - reportFailure(proxy): 실패 횟수 증가, 3회 이상 시 blocked
// - reportSuccess(proxy): 실패 횟수 리셋

const createProxyManager = (baseConfig: ProxyConfig, poolSize: number): ProxyManager => { ... }
```

### 5.7 Fingerprint (`fingerprint.ts`)

```typescript
type BrowserFingerprint = {
  userAgent: string
  viewport: { width: number; height: number }
  locale: string
  timezone: string
  platform: string
  webglVendor: string
  webglRenderer: string
}

// 랜덤 Fingerprint 생성
// - 실제 브라우저 User-Agent 풀에서 랜덤 선택
// - viewport: 1366x768, 1920x1080, 1440x900 등 실제 해상도
// - locale/timezone: marketplace에 맞게 설정
const generateFingerprint = (marketplace: Marketplace): BrowserFingerprint => { ... }
```

### 5.8 Human Behavior (`human-behavior.ts`)

```typescript
// 사람처럼 행동하는 유틸리티
const humanBehavior = {
  // 랜덤 딜레이 (min~max ms)
  delay: (min: number, max: number): Promise<void> => { ... },

  // 자연스러운 마우스 움직임 (현재 위치 → 대상 요소)
  moveMouse: (page: Page, selector: string): Promise<void> => { ... },

  // 자연스러운 스크롤 (전체 페이지의 일부를 점진적 스크롤)
  scrollPage: (page: Page, scrollPercent: number): Promise<void> => { ... },

  // 자연스러운 타이핑 (키 사이 30~120ms 랜덤 간격)
  typeText: (page: Page, selector: string, text: string): Promise<void> => { ... },
}
```

### 5.9 Stealth (`stealth.ts`)

```typescript
// Playwright 브라우저 Stealth 설정
// - webdriver 프로퍼티 숨기기
// - navigator.plugins 위장
// - chrome.runtime 위장
// - WebGL 렌더러 위장
// - canvas fingerprint 노이즈 추가
const applyStealthSettings = async (context: BrowserContext): Promise<void> => { ... }

// Stealth + Fingerprint + Proxy가 적용된 브라우저 컨텍스트 생성
const createStealthContext = async (
  browser: Browser,
  fingerprint: BrowserFingerprint,
  proxy?: ProxyConfig,
): Promise<BrowserContext> => { ... }
```

### 5.10 Sentinel API Client (`sentinel-client.ts`)

```typescript
type SentinelClient = {
  getActiveCampaigns: () => Promise<Campaign[]>
  submitListing: (data: CrawlerListingRequest) => Promise<CrawlerListingResponse>
  submitBatch: (listings: CrawlerListingRequest[]) => Promise<CrawlerBatchResponse>
}

const createSentinelClient = (apiUrl: string, serviceToken: string): SentinelClient => {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceToken}`,
  }

  return {
    getActiveCampaigns: async () => { ... },
    submitListing: async (data) => { ... },
    submitBatch: async (listings) => { ... },
  }
}
```

### 5.11 BullMQ Queue (`queue.ts`)

```typescript
import { Queue, Worker } from 'bullmq'

const QUEUE_NAME = 'sentinel-crawl'

// 큐 생성
const createCrawlQueue = (redisUrl: string): Queue<CrawlJobData> => { ... }

// 워커 생성 (잡 프로세서)
const createCrawlWorker = (
  redisUrl: string,
  processor: (job: Job<CrawlJobData>) => Promise<CrawlResult>,
  concurrency: number,
): Worker => { ... }

// 워커 이벤트 핸들링
// - completed: 결과 로그
// - failed: 에러 로그 + 재시도 카운트
// - stalled: 스톨 감지 알림
```

### 5.12 Campaign Job (`jobs.ts`)

```typescript
// 캠페인 1건 크롤링 잡 프로세서
const processCrawlJob = async (
  job: Job<CrawlJobData>,
  config: CrawlerConfig,
  sentinelClient: SentinelClient,
): Promise<CrawlResult> => {
  // 1. 브라우저 인스턴스 생성 (stealth + fingerprint + proxy)
  // 2. 검색 결과 1~maxPages 페이지 순회
  //    - 각 페이지에서 ASIN 목록 추출
  //    - 차단 감지 시 프록시 교체 후 재시도
  // 3. 각 ASIN 상세 페이지 방문
  //    - 데이터 파싱 + 스크린샷 캡처
  //    - 사람 행동 모방 (딜레이, 스크롤)
  // 4. sentinelClient.submitListing() 또는 submitBatch()
  // 5. 브라우저 종료
  // 6. CrawlResult 반환
}
```

### 5.13 Scheduler (`scheduler.ts`)

```typescript
// 캠페인 스케줄 매니저
// - 주기적으로 활성 캠페인 조회 (5분마다)
// - 신규/변경 캠페인에 대해 BullMQ 반복 잡 등록
// - 비활성 캠페인의 잡 제거
// - 빈도 매핑: daily → 24h, every_12h → 12h, every_6h → 6h

const FREQUENCY_MS = {
  daily: 24 * 60 * 60 * 1000,
  every_12h: 12 * 60 * 60 * 1000,
  every_6h: 6 * 60 * 60 * 1000,
} as const

const startScheduler = async (
  queue: Queue<CrawlJobData>,
  sentinelClient: SentinelClient,
): Promise<void> => {
  // 1. 활성 캠페인 조회
  // 2. 각 캠페인별 BullMQ repeatableJob 등록
  //    - jobId: `campaign-${campaignId}`
  //    - repeat: { every: FREQUENCY_MS[frequency] }
  // 3. 5분마다 캠페인 목록 재조회 → 변경 감지 → 잡 갱신
}
```

### 5.14 Main Entry (`index.ts`)

```typescript
// 1. 환경 변수 검증 (loadConfig)
// 2. Sentinel API Client 생성
// 3. BullMQ Queue + Worker 생성
// 4. Scheduler 시작
// 5. Graceful Shutdown 핸들링 (SIGTERM, SIGINT)
//    - Worker 중지 (진행 중 잡 완료 대기)
//    - Queue 연결 종료
//    - 브라우저 인스턴스 정리
//    - Redis 연결 종료
```

---

## 6. Error Handling

### 6.1 에러 분류

| 에러 유형 | 원인 | 재시도 | 처리 |
|----------|------|:------:|------|
| `CAPTCHA_DETECTED` | 아마존 봇 탐지 | O | 프록시 교체 후 재시도 |
| `IP_BLOCKED` | IP 차단 (403/503) | O | 프록시 블랙리스트 + 교체 |
| `PAGE_NOT_FOUND` | 리스팅 삭제/404 | X | 스킵, 로그 |
| `SELECTOR_FAILED` | HTML 구조 변경 | X | 경고 로그, 부분 데이터로 진행 |
| `NETWORK_ERROR` | 네트워크 타임아웃 | O | 30초 후 재시도 |
| `API_ERROR` | Sentinel API 오류 | O | 5초 후 재시도 (최대 3회) |
| `API_DUPLICATE` | 409 중복 | X | 스킵, 카운트 |
| `BROWSER_CRASH` | 브라우저 크래시 | O | 새 인스턴스 생성 후 재시도 |

### 6.2 재시도 정책

```typescript
// BullMQ 잡 레벨 재시도
const JOB_RETRY_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 60_000,       // 1분 → 2분 → 4분
  },
}

// 프록시 레벨 재시도 (잡 내부)
const PROXY_RETRY_MAX = 3

// API 호출 재시도
const API_RETRY_MAX = 3
const API_RETRY_DELAY = 5_000   // 5초
```

### 6.3 로깅

```typescript
// 구조화 로그 (JSON)
type LogEntry = {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  module: string
  campaignId?: string
  asin?: string
  message: string
  error?: string
  duration?: number
}

// pino 또는 간단한 커스텀 로거
// stdout으로 JSON 출력 (Railway/Docker 로그 수집 호환)
```

---

## 7. Security Considerations

- [x] 서비스 토큰 인증 (환경 변수, 코드에 하드코딩 금지)
- [x] 프록시 크레덴셜 환경 변수 관리
- [x] Sentinel API URL HTTPS 강제
- [x] 수집 raw_data에 민감 정보(쿠키, 세션) 포함 금지
- [x] 브라우저 프로필/쿠키 영속화 금지 (매번 새 컨텍스트)
- [x] Rate limiting 준수 (페이지 간 2~5초 딜레이)

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Method |
|------|--------|--------|
| Unit | Selector 파싱, URL 생성, Config 검증 | Vitest |
| Integration | API Client → Mock Server | Vitest + msw |
| E2E | 실제 아마존 검색 1페이지 | Playwright (수동) |

### 8.2 Test Cases

- [x] 검색 URL 생성: marketplace별 올바른 도메인
- [x] Config 검증: 필수 환경 변수 누락 시 에러
- [x] CAPTCHA 감지: `#captchacharacters` 셀렉터 존재 시 true
- [x] 프록시 매니저: 3회 실패 시 blocked 상태
- [x] 프록시 매니저: blocked 프록시 스킵
- [x] API Client: 201 응답 파싱
- [x] API Client: 409 중복 처리
- [x] Fingerprint: marketplace별 locale/timezone 매칭

---

## 9. Web API 추가 사항

Crawler 전용 API 엔드포인트를 Sentinel Web에 추가합니다.

### 9.1 추가 파일

```
src/app/api/crawler/
  campaigns/route.ts         # GET — 활성 캠페인 조회
  listings/route.ts          # POST — 단건 리스팅 저장
  listings/batch/route.ts    # POST — 배치 리스팅 저장
```

### 9.2 Service Auth Middleware

```
src/lib/auth/service-middleware.ts   # Service Token 인증
```

### 9.3 환경 변수 추가 (Web)

```
CRAWLER_SERVICE_TOKEN=<생성할_랜덤_토큰>
```

---

## 10. Implementation Order

### Phase 1: 프로젝트 셋업 (4 items)

| # | 파일 | 설명 |
|---|------|------|
| 1 | `crawler/package.json` | 패키지 정의 + 의존성 |
| 2 | `crawler/tsconfig.json` | TypeScript 설정 |
| 3 | `crawler/.env.example` | 환경 변수 템플릿 |
| 4 | `crawler/src/config.ts` | 환경 변수 로드 + 검증 |

### Phase 2: 타입 + 셀렉터 (3 items)

| # | 파일 | 설명 |
|---|------|------|
| 5 | `crawler/src/types/index.ts` | 내부 타입 정의 |
| 6 | `crawler/src/scraper/selectors.ts` | CSS 셀렉터 모듈 |
| 7 | `crawler/src/scraper/screenshot.ts` | 스크린샷 캡처 |

### Phase 3: Anti-bot (4 items)

| # | 파일 | 설명 |
|---|------|------|
| 8 | `crawler/src/anti-bot/stealth.ts` | Playwright stealth |
| 9 | `crawler/src/anti-bot/fingerprint.ts` | Fingerprint 랜덤화 |
| 10 | `crawler/src/anti-bot/proxy.ts` | 프록시 매니저 |
| 11 | `crawler/src/anti-bot/human-behavior.ts` | 사람 행동 모방 |

### Phase 4: Scraper (2 items)

| # | 파일 | 설명 |
|---|------|------|
| 12 | `crawler/src/scraper/search-page.ts` | 검색 결과 파싱 |
| 13 | `crawler/src/scraper/detail-page.ts` | 상세 페이지 파싱 |

### Phase 5: Web API + Client (5 items)

| # | 파일 | 설명 |
|---|------|------|
| 14 | `src/lib/auth/service-middleware.ts` | Service Token 미들웨어 |
| 15 | `src/app/api/crawler/campaigns/route.ts` | 활성 캠페인 조회 |
| 16 | `src/app/api/crawler/listings/route.ts` | 단건 리스팅 저장 |
| 17 | `src/app/api/crawler/listings/batch/route.ts` | 배치 리스팅 저장 |
| 18 | `crawler/src/api/sentinel-client.ts` | API 클라이언트 |

### Phase 6: BullMQ 스케줄러 (4 items)

| # | 파일 | 설명 |
|---|------|------|
| 19 | `crawler/src/scheduler/queue.ts` | BullMQ 큐 + 워커 |
| 20 | `crawler/src/scheduler/jobs.ts` | 크롤링 잡 프로세서 |
| 21 | `crawler/src/scheduler/scheduler.ts` | 캠페인 스케줄 매니저 |
| 22 | `crawler/src/index.ts` | 메인 엔트리 |

### Phase 7: pnpm workspace 통합 (1 item)

| # | 파일 | 설명 |
|---|------|------|
| 23 | `pnpm-workspace.yaml` | workspace에 crawler 추가 |

**총 23개 구현 항목** (Crawler 18개 + Web API 5개)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-01 | Initial draft — Crawler 상세 설계 (23 impl items) | Claude (AI) |
