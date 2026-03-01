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

// 프록시 상태
type ProxyStatus = 'active' | 'blocked' | 'cooldown'

type ManagedProxy = {
  config: ProxyConfig
  status: ProxyStatus
  failCount: number
  lastUsed: number
  blockedUntil: number | null
}

// 브라우저 Fingerprint
type BrowserFingerprint = {
  userAgent: string
  viewport: { width: number; height: number }
  locale: string
  timezone: string
  platform: string
  webglVendor: string
  webglRenderer: string
}

// 에러 유형
const CRAWL_ERROR_TYPES = {
  CAPTCHA_DETECTED: 'CAPTCHA_DETECTED',
  IP_BLOCKED: 'IP_BLOCKED',
  PAGE_NOT_FOUND: 'PAGE_NOT_FOUND',
  SELECTOR_FAILED: 'SELECTOR_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  API_DUPLICATE: 'API_DUPLICATE',
  BROWSER_CRASH: 'BROWSER_CRASH',
} as const

type CrawlErrorType = (typeof CRAWL_ERROR_TYPES)[keyof typeof CRAWL_ERROR_TYPES]

// Crawler → Web API 전송 형식
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
  source_campaign_id: string
  screenshot_base64?: string
}

type CrawlerListingResponse = {
  id: string
  asin: string
  is_suspect: boolean
  suspect_reasons: string[]
  created_at: string
}

type CrawlerBatchResponse = {
  created: number
  duplicates: number
  errors: { asin: string; error: string }[]
}

// 로그 엔트리
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

// Google Chat 알림 메시지
type ChatNotification = {
  type: 'crawl_complete' | 'crawl_failed' | 'listing_submitted' | 'action_required'
  title: string
  details: string
}

export { MARKETPLACE_DOMAINS, CRAWL_ERROR_TYPES }
export type {
  Marketplace,
  SearchResult,
  ListingDetail,
  Campaign,
  CrawlJobData,
  CrawlResult,
  ProxyConfig,
  ProxyStatus,
  ManagedProxy,
  BrowserFingerprint,
  CrawlErrorType,
  CrawlerListingRequest,
  CrawlerListingResponse,
  CrawlerBatchResponse,
  LogEntry,
  ChatNotification,
}
