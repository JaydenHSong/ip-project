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
  violation_type: ViolationCode
  violation_category: ViolationCategory
  note: string
  screenshot_base64: string
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

export type ExtensionStorage = {
  'auth.access_token': string
  'auth.refresh_token': string
  'auth.user': AuthUser
  'auth.expires_at': number
}
