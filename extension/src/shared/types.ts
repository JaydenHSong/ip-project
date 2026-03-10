// Extension 공유 타입 정의

import type { ViolationCategory, ViolationCode } from './constants'

export type ParsedPageData = {
  asin: string
  title: string
  seller_name: string | null
  seller_id: string | null
  price_amount: number | null
  price_currency: string
  images: string[]
  bullet_points: string[]
  brand: string | null
  rating: number | null
  review_count: number | null
  url: string
  marketplace: string
}

export type SubmitReportPayload = {
  page_data: ParsedPageData
  violation_type: ViolationCode | ViolationCategory
  violation_category: ViolationCategory
  note: string
  screenshot_base64: string
  extra_fields?: Record<string, string>
}

export type SubmitReportResponse = {
  report_id: string
  listing_id: string
  is_duplicate: boolean
}

export type AuthUser = {
  id: string
  email: string
  name: string
  avatar_url: string
  role: string
}

export type PdSubmitData = {
  asin: string
  violation_type_pd: string
  description: string
  evidence_urls: string[]
  marketplace: string
  prepared_at: string
}

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

// 패시브 수집 — 검색 결과 아이템
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

// 패시브 수집 큐 아이템
export type PassiveQueueItem = {
  id: string
  type: 'page' | 'search'
  data: PassivePageData | PassiveSearchData
  collected_at: string
}

// 중복 필터 엔트리
export type DedupeEntry = {
  key: string
  expires_at: number
}

// Background Fetch 설정
export type BackgroundFetchSettings = {
  enabled: boolean
}

// Background Fetch 진행 상태
export type BackgroundFetchStatus = {
  active: boolean
  asin: string | null
  marketplace: string | null
  queueId: string | null
}

export type ExtensionStorage = {
  'auth.access_token': string
  'auth.refresh_token': string
  'auth.user': AuthUser
  'auth.expires_at': number
  'passive.queue': PassiveQueueItem[]
  'passive.dedup': DedupeEntry[]
  'bgfetch.settings': BackgroundFetchSettings
  'bgfetch.status': BackgroundFetchStatus
  'bgfetch.windowId': number
  'ext.locale': string
  'ext.theme': string
}
