# Design: Extension Passive Collect (익스텐션 패시브 수집)

> Plan 참조: `docs/01-plan/features/extension-passive-collect.plan.md`

## 1. 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│  Amazon Browser Tab                                             │
│                                                                 │
│  ┌──────────────┐    ┌──────────────────┐                       │
│  │ /dp/* 페이지  │    │ /s?k=* 검색결과   │                       │
│  │ parser.ts    │    │ search-parser.ts │                       │
│  └──────┬───────┘    └────────┬─────────┘                       │
│         │ PASSIVE_PAGE_DATA   │ PASSIVE_SEARCH_DATA             │
│         └────────┬────────────┘                                 │
│                  ▼                                               │
│  ┌─────────────────────────────────┐                            │
│  │ Service Worker                   │                            │
│  │  ┌───────────┐ ┌──────────────┐ │                            │
│  │  │ Dedup     │ │ Batch Queue  │ │  chrome.alarms (5분)       │
│  │  │ Filter    │→│ (storage)    │─┼──→ flush                   │
│  │  └───────────┘ └──────┬───────┘ │                            │
│  │                       │ 10건 or 5분│                          │
│  │                       ▼         │                            │
│  │              POST /api/ext/     │                            │
│  │              passive-collect    │                            │
│  └─────────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Sentinel Web (Next.js)                                         │
│                                                                 │
│  POST /api/ext/passive-collect                                  │
│    → withAuth (Bearer token, viewer+)                           │
│    → 배치 검증 + 중복 체크 (UPSERT)                               │
│    → listings 테이블 저장 (source: 'extension_passive')           │
│    → 의심 리스팅 → AI 분석 fire-and-forget                        │
└─────────────────────────────────────────────────────────────────┘
```

## 2. 타입 정의

### 2.1 Extension 타입 (`extension/src/shared/types.ts`)

```typescript
// 패시브 수집 — 상품 상세 페이지 데이터 (이미지 제외)
export type PassivePageData = {
  asin: string
  title: string
  seller_name: string | null
  seller_id: string | null
  price_amount: number | null
  price_currency: string
  bullet_points: string[]
  brand: string | null
  rating: number | null
  review_count: number | null
  url: string
  marketplace: string
}

// 패시브 수집 — 검색 결과 페이지 아이템
export type PassiveSearchItem = {
  asin: string
  title: string
  price_amount: number | null
  price_currency: string
  brand: string | null
  rating: number | null
  review_count: number | null
  is_sponsored: boolean
  marketplace: string
}

// 패시브 수집 — 검색 결과 페이지 전체
export type PassiveSearchData = {
  search_term: string
  url: string
  marketplace: string
  items: PassiveSearchItem[]
  page_number: number
}

// 큐에 저장되는 단일 아이템
export type PassiveQueueItem = {
  id: string              // crypto.randomUUID()
  type: 'page' | 'search'
  data: PassivePageData | PassiveSearchData
  collected_at: string    // ISO 8601
}

// 중복 필터 엔트리
export type DedupeEntry = {
  key: string             // `${asin}:${marketplace}` or `search:${term}:${marketplace}:${page}`
  expires_at: number      // Date.now() + 24h
}
```

### 2.2 Extension Storage 키 확장 (`extension/src/shared/types.ts`)

```typescript
export type ExtensionStorage = {
  // 기존
  'auth.access_token': string
  'auth.refresh_token': string
  'auth.user': AuthUser
  'auth.expires_at': number
  // 패시브 수집 추가
  'passive.queue': PassiveQueueItem[]
  'passive.dedup': DedupeEntry[]
}
```

### 2.3 메시지 타입 확장 (`extension/src/shared/messages.ts`)

```typescript
// Content Script → Service Worker (패시브 수집)
export type ContentMessage =
  | { type: 'PAGE_DATA_READY'; data: ParsedPageData }
  | { type: 'OPEN_POPUP' }
  | { type: 'PASSIVE_PAGE_DATA'; data: PassivePageData }
  | { type: 'PASSIVE_SEARCH_DATA'; data: PassiveSearchData }
```

### 2.4 서버 API 타입 (`src/types/api.ts`)

```typescript
// POST /api/ext/passive-collect 요청
export type PassiveCollectRequest = {
  items: PassiveCollectItem[]
}

export type PassiveCollectItem = {
  type: 'page' | 'search'
  data: PassiveCollectPageData | PassiveCollectSearchData
  collected_at: string
}

export type PassiveCollectPageData = {
  asin: string
  title: string
  seller_name?: string
  seller_id?: string
  price_amount?: number
  price_currency?: string
  bullet_points?: string[]
  brand?: string
  rating?: number
  review_count?: number
  url: string
  marketplace: string
}

export type PassiveCollectSearchData = {
  search_term: string
  url: string
  marketplace: string
  page_number: number
  items: {
    asin: string
    title: string
    price_amount?: number
    price_currency?: string
    brand?: string
    rating?: number
    review_count?: number
    is_sponsored: boolean
  }[]
}

// POST /api/ext/passive-collect 응답
export type PassiveCollectResponse = {
  created: number
  duplicates: number
  errors: { asin: string; error: string }[]
}
```

### 2.5 ListingSource 타입 확장 (`src/types/listings.ts`)

```typescript
export type ListingSource = 'crawler' | 'extension' | 'extension_passive'
```

## 3. Extension 구현 상세

### 3.1 검색 결과 파서 (`extension/src/content/search-parser.ts`) — 신규

아마존 검색 결과 페이지(`/s?k=...`)에서 리스팅 목록을 파싱하는 모듈.

```
파싱 대상 셀렉터:
- 검색어: URL의 `k` 파라미터
- 리스팅 컨테이너: div[data-component-type="s-search-result"]
- ASIN: data-asin 속성
- 제목: h2 a span
- 가격: .a-price .a-offscreen
- 브랜드: h2 아래 텍스트 or .a-row .a-size-base
- 평점: .a-icon-alt (N out of 5 stars)
- 리뷰수: .a-size-base.s-underline-text
- 스폰서 여부: .puis-label-popover-default (Sponsored 텍스트)
- 페이지 번호: .s-pagination-selected
```

**반환**: `PassiveSearchData | null`

### 3.2 검색 결과 Content Script (`extension/src/content/search-content.ts`) — 신규

검색 결과 페이지 전용 Content Script 엔트리.

```typescript
// 동작:
// 1. requestIdleCallback으로 DOM 로드 후 파싱
// 2. 파싱 결과를 Service Worker로 전달
// 3. 메시지 타입: PASSIVE_SEARCH_DATA
```

### 3.3 Content Script 수정 (`extension/src/content/index.ts`)

기존 상품 상세 페이지 Content Script에 패시브 수집 로직 추가.

```typescript
// 변경 사항:
// 1. 기존 init() 내에서 parseAmazonPage() 결과를 Service Worker로 바로 전달
// 2. 이미지 배열 제외: images 필드를 빈 배열 또는 생략
// 3. requestIdleCallback 사용하여 메인 스레드 블로킹 방지
// 4. 메시지 타입: PASSIVE_PAGE_DATA

const init = (): void => {
  const pageData = parseAmazonPage()
  if (!pageData) return

  // 기존: 플로팅 버튼 + 메시지 리스너 (변경 없음)
  createFloatingButton()
  chrome.runtime.onMessage.addListener(...)

  // 추가: 패시브 수집 (idle 타임에 실행)
  requestIdleCallback(() => {
    const passiveData: PassivePageData = {
      asin: pageData.asin,
      title: pageData.title,
      seller_name: pageData.seller_name,
      seller_id: pageData.seller_id,
      price_amount: pageData.price_amount,
      price_currency: pageData.price_currency,
      bullet_points: pageData.bullet_points,
      brand: pageData.brand,
      rating: pageData.rating,
      review_count: pageData.review_count,
      url: pageData.url,
      marketplace: pageData.marketplace,
    }
    chrome.runtime.sendMessage({ type: 'PASSIVE_PAGE_DATA', data: passiveData })
  })
}
```

### 3.4 배치 큐 모듈 (`extension/src/background/passive-queue.ts`) — 신규

Service Worker에서 패시브 수집 데이터를 큐잉하고 배치 전송하는 핵심 모듈.

```
상수:
  BATCH_SIZE = 10          // 전송 트리거: N건 이상 누적
  FLUSH_INTERVAL_MIN = 5   // 전송 트리거: N분 주기 (chrome.alarms)
  MAX_QUEUE_SIZE = 100     // 큐 최대 크기 (FIFO)
  DEDUP_TTL_MS = 86400000  // 24시간 (중복 필터 유효기간)
  MAX_RETRIES = 3          // 전송 실패 시 최대 재시도

함수:
  enqueue(item)            // 중복 체크 → 큐 추가 → 조건 충족 시 flush
  flush()                  // 큐에서 최대 BATCH_SIZE개 추출 → API 전송
  isDuplicate(key)         // dedup 목록에서 확인
  addDedup(key)            // dedup 목록에 추가
  cleanExpiredDedup()      // 만료된 dedup 엔트리 제거
  getQueueSize()           // 현재 큐 사이즈 반환
```

**중복 키 생성 규칙**:
- 상품 페이지: `page:${asin}:${marketplace}`
- 검색 결과: `search:${searchTerm}:${marketplace}:${pageNumber}`

**배치 전송 흐름**:
```
enqueue() 호출
  → isDuplicate() 체크 → 중복이면 스킵
  → addDedup() 등록
  → 큐에 추가
  → 큐 크기 >= BATCH_SIZE?
    → Yes: flush() 호출
    → No: 대기 (alarm이 5분마다 flush)
```

### 3.5 Service Worker 수정 (`extension/src/background/service-worker.ts`)

```typescript
// 추가 사항:
// 1. PASSIVE_PAGE_DATA, PASSIVE_SEARCH_DATA 메시지 핸들러
// 2. chrome.alarms API로 5분 주기 flush
// 3. 24시간 주기 dedup 정리

// 새 메시지 핸들러:
case 'PASSIVE_PAGE_DATA':
  enqueue({ type: 'page', data: message.data, ... })
  return false  // 응답 불필요

case 'PASSIVE_SEARCH_DATA':
  enqueue({ type: 'search', data: message.data, ... })
  return false

// Alarm 등록 (서비스워커 시작 시):
chrome.alarms.create('passive-flush', { periodInMinutes: 5 })
chrome.alarms.create('passive-dedup-cleanup', { periodInMinutes: 60 })

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'passive-flush') flush()
  if (alarm.name === 'passive-dedup-cleanup') cleanExpiredDedup()
})
```

### 3.6 API 클라이언트 (`extension/src/background/api.ts`)

```typescript
// 추가 함수:
export const submitPassiveCollect = async (
  items: PassiveQueueItem[]
): Promise<PassiveCollectResponse> => {
  const headers = await getHeaders()
  const body = {
    items: items.map(item => ({
      type: item.type,
      data: item.data,
      collected_at: item.collected_at,
    }))
  }
  const response = await fetch(`${API_BASE}/ext/passive-collect`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!response.ok) { /* 기존 에러 처리 패턴 */ }
  return response.json()
}
```

### 3.7 manifest.json 변경

```jsonc
{
  "content_scripts": [
    // 기존: 상품 상세 페이지 (변경 없음)
    { "matches": ["https://www.amazon.*/dp/*", ...], "js": ["content.js"] },
    // 기존: SC 폼 필러 (변경 없음)
    { "matches": ["https://sellercentral.amazon.com/abuse-submission/*"], ... },
    // 추가: 검색 결과 페이지
    {
      "matches": [
        "https://www.amazon.com/s*",
        "https://www.amazon.co.uk/s*",
        "https://www.amazon.co.jp/s*",
        "https://www.amazon.de/s*",
        "https://www.amazon.fr/s*",
        "https://www.amazon.it/s*",
        "https://www.amazon.es/s*",
        "https://www.amazon.ca/s*"
      ],
      "js": ["search-content.js"],
      "run_at": "document_idle"
    }
  ],
  "permissions": [
    "activeTab", "tabs", "storage", "identity",
    "alarms"  // 추가: 주기적 flush용
  ]
}
```

### 3.8 Vite 빌드 설정 변경 (`extension/vite.config.ts`)

```typescript
// input에 search-content 엔트리 추가:
input: {
  popup: resolve(__dirname, 'src/popup/popup.html'),
  content: resolve(__dirname, 'src/content/index.ts'),
  'search-content': resolve(__dirname, 'src/content/search-content.ts'),  // 추가
  'sc-content': resolve(__dirname, 'src/content/sc-form-filler.ts'),
  background: resolve(__dirname, 'src/background/service-worker.ts'),
}
```

## 4. 서버 API 구현 상세

### 4.1 `POST /api/ext/passive-collect` (`src/app/api/ext/passive-collect/route.ts`) — 신규

```
인증: withAuth (Bearer 토큰, ['admin', 'editor', 'viewer'])
  → 기존 /api/ext/submit-report와 동일한 패턴

요청 검증:
  - items 배열 존재 + 비어있지 않음
  - 최대 100건 제한 (DoS 방지)
  - 각 아이템: type + data 필수
  - type='page': asin, marketplace, title 필수
  - type='search': search_term, marketplace, items 필수

처리 흐름 (page 타입):
  1. checkSuspectListing() 적용
  2. listings 테이블 UPSERT (asin + marketplace + DATE(crawled_at) 유니크)
     → 이미 존재하면 스킵 (duplicate++)
     → 새로 생성 시 created++
  3. 의심 리스팅 → AI 분석 트리거 (fire-and-forget)

처리 흐름 (search 타입):
  1. items 배열의 각 아이템을 개별 listing으로 저장
  2. search_term을 raw_data에 기록: { search_term, page_number, is_sponsored }
  3. 동일하게 checkSuspectListing() + 중복 체크
  4. 의심 리스팅 → AI 분석 트리거

응답: { created, duplicates, errors }
```

**핵심 구현 패턴**: 기존 `POST /api/crawler/listings/batch`와 유사하되:
- `withServiceAuth` 대신 `withAuth` 사용 (사용자 인증)
- `source: 'extension_passive'` 고정
- `source_user_id: user.id` 설정 (누가 수집했는지 추적)

## 5. DB 영향

### 변경 없음
- `listings` 테이블 스키마 변경 불필요
- `source` 컬럼은 `text` 타입 → `'extension_passive'` 값 바로 사용 가능
- `raw_data` (jsonb) 컬럼에 검색어 메타데이터 저장

### 타입만 변경
- `ListingSource` 유니온에 `'extension_passive'` 추가
- `CreateListingRequest`의 `source` 필드 타입 확장

## 6. 파일 변경 목록

### 신규 파일 (4개)
| 파일 | 설명 |
|------|------|
| `extension/src/content/search-parser.ts` | 검색 결과 DOM 파서 |
| `extension/src/content/search-content.ts` | 검색 결과 Content Script 엔트리 |
| `extension/src/background/passive-queue.ts` | 배치 큐 + 중복 필터 + 전송 |
| `src/app/api/ext/passive-collect/route.ts` | 서버 배치 수신 API |

### 수정 파일 (7개)
| 파일 | 변경 내용 |
|------|-----------|
| `extension/src/content/index.ts` | 패시브 수집 메시지 전송 추가 (~10줄) |
| `extension/src/background/service-worker.ts` | 메시지 핸들러 + alarms 추가 (~20줄) |
| `extension/src/background/api.ts` | `submitPassiveCollect` 함수 추가 (~20줄) |
| `extension/src/shared/types.ts` | PassivePageData 등 타입 추가 (~40줄) |
| `extension/src/shared/messages.ts` | PASSIVE_* 메시지 타입 추가 (~5줄) |
| `extension/manifest.json` | 검색 URL 패턴 + alarms 권한 추가 |
| `extension/vite.config.ts` | search-content 빌드 엔트리 추가 |

### 서버 타입 수정 (2개)
| 파일 | 변경 내용 |
|------|-----------|
| `src/types/listings.ts` | ListingSource에 'extension_passive' 추가 |
| `src/types/api.ts` | PassiveCollect 관련 타입 추가 |

## 7. 구현 순서

```
Step 1: 타입 정의
  → extension/src/shared/types.ts (PassivePageData 등)
  → extension/src/shared/messages.ts (PASSIVE_* 메시지)
  → src/types/listings.ts (ListingSource 확장)
  → src/types/api.ts (PassiveCollect 타입)

Step 2: 검색 결과 파서
  → extension/src/content/search-parser.ts (신규)
  → extension/src/content/search-content.ts (신규)

Step 3: 배치 큐 + 중복 필터
  → extension/src/background/passive-queue.ts (신규)

Step 4: Content Script 패시브 수집
  → extension/src/content/index.ts (수정)

Step 5: Service Worker 통합
  → extension/src/background/service-worker.ts (수정)
  → extension/src/background/api.ts (수정)

Step 6: manifest + 빌드 설정
  → extension/manifest.json (수정)
  → extension/vite.config.ts (수정)

Step 7: 서버 API
  → src/app/api/ext/passive-collect/route.ts (신규)
```

## 8. 에러 처리

| 시나리오 | 대응 |
|----------|------|
| DOM 파싱 실패 (셀렉터 변경) | 파싱 결과 null이면 무시, 에러 삼킴 |
| chrome.storage 용량 초과 | 큐 100건 제한, FIFO로 오래된 것 삭제 |
| 네트워크 오프라인 | 큐에 유지, 다음 alarm에서 재시도 |
| API 401 (토큰 만료) | 기존 auth.ts의 자동 갱신 로직 활용, 실패 시 큐 유지 |
| API 429 (레이트 리밋) | 지수 백오프 재시도 (1분, 2분, 4분) |
| 서버 500 | 최대 3회 재시도 후 큐에 유지 |
