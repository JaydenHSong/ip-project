import type { BrFormTypeCode } from '@/constants/br-form-types'
import type { BrCaseStatus, BrReplyPendingAttachment } from '@/types/br-case'

export const REPORT_STATUSES = [
  'draft', 'pending_review', 'approved', 'rejected', 'cancelled',
  'br_submitting', 'submitted', 'monitoring', 'resolved', 'unresolved',
  'resubmitted', 'escalated', 'archived',
] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]

export const REJECTION_CATEGORIES = [
  'insufficient_evidence', 'wrong_violation_type',
  'inaccurate_policy_reference', 'over_detection',
  'duplicate', 'other',
] as const
export type RejectionCategory = (typeof REJECTION_CATEGORIES)[number]

export const RESOLUTION_TYPES = [
  'listing_removed', 'content_modified',
  'seller_removed', 'no_change',
] as const
export type ResolutionType = (typeof RESOLUTION_TYPES)[number]

export type AiSeverity = 'high' | 'medium' | 'low'

export type DraftEvidence = {
  type: string
  url: string
  description: string
}

export type PolicyReference = {
  code: string
  url: string
  section: string
}

export type RelatedAsin = {
  asin: string
  marketplace?: string
  url?: string
}

export type ListingSnapshot = {
  asin: string
  marketplace: string
  title: string | null
  description: string | null
  seller_name: string | null
  seller_id: string | null
  brand: string | null
  price_amount: number | null
  price_currency: string | null
  images: unknown[]
  bullet_points: unknown[]
  rating: number | null
  review_count: number | null
  category: string | null
}

export type Report = {
  id: string
  listing_id: string | null
  listing_snapshot: ListingSnapshot | null
  related_asins: RelatedAsin[]

  // BR 폼 타입 (v2)
  br_form_type: BrFormTypeCode

  // 레거시 위반 유형 (deprecated — DB에 3개월 유지 후 삭제)
  user_violation_type: string
  ai_violation_type: string | null
  confirmed_violation_type: string | null
  violation_type: string
  violation_category: string
  disagreement_flag: boolean

  status: ReportStatus

  // AI 분석
  ai_analysis: AiAnalysisResult | null
  ai_severity: AiSeverity | null
  ai_confidence_score: number | null

  // 드래프트
  draft_title: string | null
  draft_body: string | null
  draft_evidence: DraftEvidence[]
  draft_policy_references: PolicyReference[]

  // 수정 이력
  original_draft_body: string | null
  edited_by: string | null
  edited_at: string | null

  // 반려
  rejected_by: string | null
  rejected_at: string | null
  rejection_reason: string | null
  rejection_category: RejectionCategory | null

  // 취소
  cancelled_by: string | null
  cancelled_at: string | null
  cancellation_reason: string | null

  // 승인
  approved_by: string | null
  approved_at: string | null

  // 팔로업
  pd_followup_interval_days: number | null
  monitoring_started_at: string | null
  resolved_at: string | null
  resolution_type: ResolutionType | null

  // Archive
  archived_at: string | null
  archive_reason: string | null
  pre_archive_status: ReportStatus | null

  // 재신고
  parent_report_id: string | null
  escalation_level: number

  // 재제출 추적
  resubmit_count: number
  resubmit_interval_days: number | null
  max_resubmit_count: number | null
  next_resubmit_at: string | null
  last_resubmit_at: string | null

  // BR 제출 추적
  br_submit_data: BrSubmitData | null
  br_case_id: string | null
  br_submitted_at: string | null
  br_submission_error: string | null
  br_submit_attempts: number

  // BR 케이스 관리
  br_case_status: BrCaseStatus | null
  br_last_amazon_reply_at: string | null
  br_last_our_reply_at: string | null
  br_sla_deadline_at: string | null
  br_reply_pending_text: string | null
  br_reply_pending_attachments: BrReplyPendingAttachment[] | null
  br_last_scraped_at: string | null

  // 메타
  created_by: string
  created_at: string
  updated_at: string
}

export type BrFormType = BrFormTypeCode

export type BrSubmitData = {
  form_type: BrFormTypeCode
  subject?: string
  description: string
  product_urls: string[]
  seller_storefront_url?: string
  policy_url?: string
  asins?: string[]
  review_urls?: string[]
  order_id?: string
  prepared_at: string
}

export type AiAnalysisResult = {
  violation_detected: boolean
  confidence: number
  reasons: string[]
  evidence: AiEvidence[]
}

export type AiEvidence = {
  type: 'text' | 'image' | 'keyword'
  location: string
  description: string
}

// Timeline (F16)
export const TIMELINE_EVENT_TYPES = [
  'created',
  'ai_analyzed',
  'submitted_review',
  'draft_edited',
  'approved',
  'rejected',
  'cancelled',
  'rewritten',
  'monitoring_started',
  'snapshot_taken',
  'change_detected',
  'resolved',
  'unresolved',
] as const

export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number]

export type TimelineEvent = {
  type: TimelineEventType
  timestamp: string
  actor: string | null
  detail: string | null
}
