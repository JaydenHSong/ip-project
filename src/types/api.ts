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
  source: 'crawler' | 'extension'
  source_campaign_id?: string
  raw_data?: unknown
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
}

export type ApproveReportRequest = {
  edited_draft_body?: string
  edited_draft_title?: string
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
  violation_type: ViolationCode
  violation_category: string
  note?: string
  screenshot_base64?: string
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
