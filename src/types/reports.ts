import type { ViolationCategory, ViolationCode } from '@/constants/violations'

export const REPORT_STATUSES = [
  'draft', 'pending_review', 'approved', 'rejected', 'cancelled',
  'submitted', 'monitoring', 'resolved', 'unresolved',
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

export type Report = {
  id: string
  listing_id: string

  // 위반 유형 (AI vs 사용자 불일치 처리)
  user_violation_type: ViolationCode
  ai_violation_type: ViolationCode | null
  confirmed_violation_type: ViolationCode | null
  violation_type: ViolationCode
  violation_category: ViolationCategory
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

  // SC 신고
  sc_case_id: string | null
  sc_submitted_at: string | null
  sc_submission_error: string | null

  // 팔로업
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

  // 메타
  created_by: string
  created_at: string
  updated_at: string
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
  'submitted_sc',
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
