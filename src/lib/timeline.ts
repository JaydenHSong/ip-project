import type { TimelineEvent } from '@/types/reports'

type ReportForTimeline = {
  created_at: string
  ai_violation_type: string | null
  ai_confidence_score: number | null
  disagreement_flag: boolean
  user_violation_type: string
  status: string
  edited_at: string | null
  approved_at: string | null
  rejected_at: string | null
  rejected_by: string | null
  rejection_reason: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancellation_reason: string | null
  sc_case_id: string | null
  sc_submitted_at: string | null
  monitoring_started_at?: string | null
  resolved_at?: string | null
  resolution_type?: string | null
}

type ActorNames = {
  creator: string | null
  approver: string | null
  rejector: string | null
  canceller: string | null
  editor: string | null
}

export const buildTimelineEvents = (
  report: ReportForTimeline,
  actors: ActorNames,
): TimelineEvent[] => {
  const events: TimelineEvent[] = []

  // 1. Created (항상)
  events.push({
    type: 'created',
    timestamp: report.created_at,
    actor: actors.creator,
    detail: null,
  })

  // 2. AI Analyzed (ai_violation_type이 있으면)
  if (report.ai_violation_type) {
    const confidence = report.ai_confidence_score !== null ? ` (${report.ai_confidence_score}%)` : ''
    const disagreement = report.disagreement_flag
      ? ` | User: ${report.user_violation_type} ≠ AI: ${report.ai_violation_type}`
      : ''
    events.push({
      type: 'ai_analyzed',
      timestamp: new Date(new Date(report.created_at).getTime() + 1000).toISOString(),
      actor: null,
      detail: `${report.ai_violation_type}${confidence}${disagreement}`,
    })
  }

  // 3. Draft Edited
  if (report.edited_at) {
    events.push({
      type: 'draft_edited',
      timestamp: report.edited_at,
      actor: actors.editor,
      detail: null,
    })
  }

  // 4. Submitted for Review (status가 draft가 아니면 제출된 적 있음)
  if (report.status !== 'draft') {
    const reviewTimestamp = getSubmittedReviewTimestamp(report)
    events.push({
      type: 'submitted_review',
      timestamp: reviewTimestamp,
      actor: actors.creator,
      detail: null,
    })
  }

  // 5. Approved
  if (report.approved_at) {
    events.push({
      type: 'approved',
      timestamp: report.approved_at,
      actor: actors.approver,
      detail: null,
    })
  }

  // 6. Rejected
  if (report.rejected_at) {
    events.push({
      type: 'rejected',
      timestamp: report.rejected_at,
      actor: actors.rejector,
      detail: report.rejection_reason,
    })
  }

  // 7. Cancelled
  if (report.cancelled_at) {
    events.push({
      type: 'cancelled',
      timestamp: report.cancelled_at,
      actor: actors.canceller,
      detail: report.cancellation_reason,
    })
  }

  // 8. Submitted to SC
  if (report.sc_case_id) {
    events.push({
      type: 'submitted_sc',
      timestamp: report.sc_submitted_at ?? report.approved_at ?? report.created_at,
      actor: null,
      detail: `Case: ${report.sc_case_id}`,
    })
  }

  // 9. Monitoring Started
  if (report.monitoring_started_at) {
    events.push({
      type: 'monitoring_started',
      timestamp: report.monitoring_started_at,
      actor: null,
      detail: null,
    })
  }

  // 10. Resolved / Unresolved
  if (report.resolved_at) {
    const isResolved = report.status === 'resolved'
    events.push({
      type: isResolved ? 'resolved' : 'unresolved',
      timestamp: report.resolved_at,
      actor: null,
      detail: report.resolution_type ?? null,
    })
  }

  // 정렬: timestamp ASC
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  return events
}

const getSubmittedReviewTimestamp = (report: ReportForTimeline): string => {
  const created = new Date(report.created_at).getTime()
  const nextEvent = [report.approved_at, report.rejected_at, report.cancelled_at]
    .filter(Boolean)
    .map((t) => new Date(t!).getTime())
    .sort((a, b) => a - b)[0]

  if (nextEvent) {
    return new Date(Math.floor((created + nextEvent) / 2)).toISOString()
  }
  return new Date(created + 3600000).toISOString()
}
