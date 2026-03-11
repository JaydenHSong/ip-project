// API 공통 타입 정의

import type { ViolationCode } from '@/constants/violations'
import type { AiSeverity, DraftEvidence, PolicyReference } from './reports'

// ============================================================
// 공통 응답
// ============================================================

export type ApiErrorResponse = {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

// ============================================================
// Listings API
// ============================================================

export type CreateListingRequest = {
  asin: string
  marketplace: string
  title: string
  description?: string
  bullet_points?: string[]
  images?: { url: string; position: number; alt?: string }[]
  price_amount?: number
  price_currency?: string
  seller_name?: string
  seller_id?: string
  brand?: string
  category?: string
  rating?: number
  review_count?: number
  source: 'crawler' | 'extension' | 'extension_passive' | 'manual'
  source_campaign_id?: string
  raw_data?: unknown
}

// ============================================================
// Fetch ASIN API
// ============================================================

export type FetchAsinRequest = {
  asin: string
  marketplace?: string
}

export type FetchAsinResponse = {
  listing: {
    id: string
    asin: string
    marketplace: string
    title: string
    seller_name: string | null
    brand: string | null
    price_amount: number | null
    price_currency: string | null
    rating: number | null
    review_count: number | null
    images: { url: string; position: number; alt?: string }[]
    is_suspect: boolean
    suspect_reasons: string[]
    created_at: string
  }
  screenshot_url: string | null
  is_existing: boolean
  ai_status: 'queued' | 'processing' | 'completed' | 'failed'
  ai_job_id?: string
}

// Extension Background Fetch — fallback 응답
export type FetchAsinQueuedResponse = {
  fallback: 'extension'
  queue_id: string
  asin: string
  marketplace: string
}

// Extension Background Fetch — 상태 폴링 응답
export type FetchStatusResponse = {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  listing?: FetchAsinResponse['listing']
  screenshot_url?: string | null
  is_existing?: boolean
  ai_status?: string
  error?: string
}

// ============================================================
// Campaigns API
// ============================================================

export type CreateCampaignRequest = {
  keyword: string
  marketplace?: string
  start_date: string
  end_date?: string
  frequency?: string
  max_pages?: number
}

export type UpdateCampaignRequest = Partial<CreateCampaignRequest> & {
  status?: string
}

// ============================================================
// Reports API
// ============================================================

export type CreateReportRequest = {
  listing_id: string
  user_violation_type: ViolationCode
  violation_category: string
  note?: string
  related_asins?: { asin: string; marketplace?: string; url?: string }[]
}

export type ApproveReportRequest = {
  edited_draft_body?: string
  edited_draft_title?: string
  edited_draft_subject?: string
}

export type RejectReportRequest = {
  rejection_reason: string
  rejection_category: string
}

export type ManualReportRequest = {
  asin: string
  marketplace: string
  title?: string
  seller_name?: string
  user_violation_type: ViolationCode
  violation_category: string
  note?: string
  screenshot_url?: string
  screenshot_urls?: string[]
  related_asins?: { asin: string; marketplace?: string; url?: string }[]
}

export type ManualReportResponse = {
  report_id: string
  listing_id: string
  is_new_listing: boolean
  is_duplicate: boolean
  existing_report_id?: string
}

// ============================================================
// AI API
// ============================================================

export type AiAnalyzeRequest = {
  listing_id: string
  include_patent_check?: boolean
  violation_type?: string
  async?: boolean
  source?: 'crawler' | 'extension'
  priority?: 'high' | 'normal'
}

export type AiAnalyzeResponse = {
  violation_detected: boolean
  violations: {
    type: ViolationCode
    confidence: number
    category: string
    severity: AiSeverity
    reasons: string[]
    evidence: DraftEvidence[]
    policy_references: PolicyReference[]
  }[]
  summary: string
}

export type AiDraftRequest = {
  report_id: string
}

export type AiDraftResponse = {
  draft_title: string
  draft_body: string
  draft_evidence: DraftEvidence[]
  draft_policy_references: PolicyReference[]
}

// ============================================================
// Extension API
// ============================================================

export type SubmitReportRequest = {
  asin: string
  marketplace: string
  title: string
  seller_name?: string
  seller_id?: string
  images?: string[]
  violation_type: string // ViolationCode (V01~V04) or category name (variation, main_image, etc.)
  violation_category: string
  note?: string
  screenshot_base64?: string
  extra_fields?: Record<string, string>
}

export type SubmitReportResponse = {
  report_id: string
  listing_id: string
  is_duplicate: boolean
  ai_preview?: {
    violation_detected: boolean
    confidence: number
    suggested_type: ViolationCode
  }
}

// ============================================================
// Passive Collect API (Extension)
// ============================================================

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

export type PassiveCollectResponse = {
  created: number
  duplicates: number
  errors: { asin: string; error: string }[]
}

// ============================================================
// Settings API (G-02)
// ============================================================

export type CreateTrademarkRequest = {
  name: string
  mark_type: 'design_mark' | 'standard_character' | 'character_logo'
  registration_number?: string
  country?: string
  image_url?: string
  variations?: string[]
}

export type CreateCategoryRequest = {
  name: string
  slug: string
  description?: string
  sort_order?: number
}
