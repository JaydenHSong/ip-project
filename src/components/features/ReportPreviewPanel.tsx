'use client'

import { useState, useEffect, useMemo } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { SlidePanel } from '@/components/ui/SlidePanel'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { buildTimelineEvents } from '@/lib/timeline'
import { ReportDetailContent } from '@/app/(protected)/reports/[id]/ReportDetailContent'
import type { ReportStatus, TimelineEvent } from '@/types/reports'

type ReportPreviewPanelProps = {
  reportId: string | null
  onClose: () => void
  userRole?: string
  currentUserId?: string
}

export const ReportPreviewPanel = ({ reportId, onClose, userRole, currentUserId }: ReportPreviewPanelProps) => {
  const { t } = useI18n()
  const [activeId, setActiveId] = useState<string | null>(reportId)
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)

  // Sync with external prop
  useEffect(() => { setActiveId(reportId) }, [reportId])

  useEffect(() => {
    if (!activeId) { setData(null); return }
    setLoading(true)
    fetch(`/api/reports/${activeId}`)
      .then((res) => res.ok ? res.json() : null)
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [activeId])

  const canEdit = userRole === 'owner' || userRole === 'admin' || userRole === 'editor'

  const timeline: TimelineEvent[] = useMemo(() => {
    if (!data) return []
    return buildTimelineEvents(
      {
        created_at: data.created_at as string,
        ai_violation_type: data.ai_violation_type as string | null,
        ai_confidence_score: data.ai_confidence_score as number | null,
        disagreement_flag: data.disagreement_flag as boolean,
        user_violation_type: data.user_violation_type as string,
        status: data.status as string,
        edited_at: data.edited_at as string | null,
        approved_at: data.approved_at as string | null,
        rejected_at: data.rejected_at as string | null,
        rejected_by: data.rejected_by as string | null,
        rejection_reason: data.rejection_reason as string | null,
        cancelled_at: data.cancelled_at as string | null,
        cancelled_by: data.cancelled_by as string | null,
        cancellation_reason: data.cancellation_reason as string | null,
        monitoring_started_at: data.monitoring_started_at as string | null,
        resolved_at: data.resolved_at as string | null,
        resolution_type: data.resolution_type as string | null,
      },
      {
        creator: (data.users as { name: string } | null)?.name ?? null,
        approver: null,
        rejector: null,
        canceller: null,
        editor: null,
      },
    )
  }, [data])

  const listing = data?.listings as {
    asin: string
    title: string
    marketplace: string
    seller_name: string | null
    brand: string | null
    rating: number | null
    review_count: number | null
    price_amount: number | null
    price_currency: string
  } | null

  return (
    <SlidePanel
      open={!!reportId}
      onClose={onClose}
      title={t('reports.detail.title')}
      size="2xl"
      status={
        data ? (
          <StatusBadge status={data.status as ReportStatus} type="report" />
        ) : undefined
      }
    >
      {loading && (
        <div className="space-y-4 p-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-th-bg-secondary" />
          ))}
        </div>
      )}

      {!loading && data && (
        <div className="p-5">
        <ReportDetailContent
          report={{
            id: data.id as string,
            report_number: (data.report_number as number) ?? 0,
            status: data.status as string,
            br_form_type: (data.br_form_type as string) ?? null,
            user_violation_type: data.user_violation_type as string,
            ai_violation_type: data.ai_violation_type as string | null,
            ai_confidence_score: data.ai_confidence_score as number | null,
            ai_severity: data.ai_severity as string | null,
            ai_analysis: data.ai_analysis as { violation_detected: boolean; confidence: number; reasons: string[]; evidence: { type: string; location: string; description: string }[] } | null,
            policy_references: (data.policy_references as string[]) ?? [],
            confirmed_violation_type: data.confirmed_violation_type as string | null,
            disagreement_flag: data.disagreement_flag as boolean,
            draft_title: data.draft_title as string | null,
            draft_subject: data.draft_subject as string | null,
            draft_body: data.draft_body as string | null,
            rejection_reason: data.rejection_reason as string | null,
            violation_category: data.violation_category as string | null,
            note: data.note as string | null,
            resubmit_count: (data.resubmit_count as number) ?? 0,
            resubmit_interval_days: data.resubmit_interval_days as number | null,
            next_resubmit_at: data.next_resubmit_at as string | null,
            screenshot_url: data.screenshot_url as string | null,
            screenshots: (data.screenshots as { url: string; captured_at: string; source?: string }[]) ?? [],
            related_asins: (data.related_asins as { asin: string; marketplace?: string; url?: string }[]) ?? [],
            created_at: data.created_at as string,
            approved_at: data.approved_at as string | null,
            rejected_at: data.rejected_at as string | null,
            created_by: data.created_by as string | undefined,
            br_case_id: data.br_case_id as string | null,
            br_case_status: data.br_case_status as string | null,
            br_last_amazon_reply_at: data.br_last_amazon_reply_at as string | null,
            br_last_our_reply_at: data.br_last_our_reply_at as string | null,
            br_submitted_at: data.br_submitted_at as string | null,
            br_reply_pending_text: data.br_reply_pending_text as string | null,
            parent_report_id: data.parent_report_id as string | null,
            escalation_level: data.escalation_level as number | null,
            pd_followup_interval_days: data.pd_followup_interval_days as number | null,
            admin_memo: data.admin_memo as string | null,
          }}
          listing={listing}
          creatorName={(data.users as { name: string } | null)?.name ?? null}
          canEdit={canEdit}
          userRole={userRole ?? 'viewer'}
          currentUserId={currentUserId}
          timeline={timeline}
          snapshots={[]}
          monitoringStartedAt={data.monitoring_started_at as string | null}
          embedded
          onNavigate={(id) => setActiveId(id)}
        />
        </div>
      )}

      {!loading && !data && reportId && (
        <div className="flex items-center justify-center p-12 text-sm text-th-text-muted">
          Report not found
        </div>
      )}
    </SlidePanel>
  )
}
