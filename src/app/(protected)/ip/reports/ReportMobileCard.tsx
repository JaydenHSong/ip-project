'use client'

import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import { Badge } from '@/components/ui/Badge'
import { getAmazonUrl } from '@/lib/utils/amazon-url'
import { formatDate } from '@/lib/utils/date'
import type { ReportStatus } from '@/types/reports'

type ReportMobileCardProps = {
  report: {
    id: string
    status: string
    br_form_type: string
    violation_type: string
    user_violation_type: string | null
    violation_category: string | null
    disagreement_flag: boolean
    ai_confidence_score: number | null
    br_case_id?: string | null
    br_case_status?: string | null
    created_at: string
    related_asins?: { asin: string; marketplace?: string; url?: string }[]
    listings: { asin: string; title: string; marketplace: string; seller_name: string | null } | null
  }
  onClick: () => void
}

export const ReportMobileCard = ({ report, onClick }: ReportMobileCardProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left"
    >
      <div className="rounded-lg border border-th-border bg-surface-card p-4 transition-colors active:bg-th-bg-hover">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <ViolationBadge code={report.user_violation_type ?? report.br_form_type ?? report.violation_type} violationCategory={report.violation_category} showLabel={false} size="md" />
            {report.disagreement_flag && <Badge variant="warning" size="md">!</Badge>}
          </div>
          <StatusBadge status={report.status as ReportStatus} type="report" size="md" />
        </div>
        <p className="mt-2 font-mono text-sm text-th-text">
          {report.listings?.asin ? (
            <a href={getAmazonUrl(report.listings.asin, report.listings.marketplace)} target="_blank" rel="noopener noreferrer" className="text-th-accent hover:underline">{report.listings.asin}</a>
          ) : '—'}
          {(report.related_asins?.length ?? 0) > 0 && (
            <span className="ml-1.5 inline-flex items-center rounded bg-th-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-th-accent-text">
              +{report.related_asins!.length}
            </span>
          )}
        </p>
        <p className="mt-1 truncate text-sm text-th-text-secondary">{report.listings?.title ?? '—'}</p>
        <div className="mt-2 flex items-center justify-between text-xs text-th-text-muted">
          <span>{report.listings?.seller_name ?? '—'}</span>
          <div className="flex items-center gap-2">
            {report.br_case_id && report.br_case_id !== 'submitted' && (
              <a
                href={`https://brandregistry.amazon.com/cu/case-dashboard/view-case?caseID=${report.br_case_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-th-accent"
                onClick={(e) => e.stopPropagation()}
              >
                BR#{report.br_case_id}
              </a>
            )}
            {report.br_case_status && (
              <StatusBadge status={report.br_case_status as Parameters<typeof StatusBadge>[0]['status']} type="br_case" size="sm" />
            )}
            {report.ai_confidence_score !== null && <span>AI: {report.ai_confidence_score}%</span>}
            <span>{formatDate(report.created_at)}</span>
          </div>
        </div>
      </div>
    </button>
  )
}
