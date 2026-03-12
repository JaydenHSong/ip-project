'use client'

import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import type { ReportStatus } from '@/types/reports'
import { Clock, ExternalLink } from 'lucide-react'

type RelatedReport = {
  id: string
  status: string
  br_case_id: string | null
  br_case_status: string | null
  created_at: string
  br_form_type: string
  listings: { asin: string; title: string } | null
}

type RelatedReportsProps = {
  reports: RelatedReport[]
  currentReportId?: string
  onNavigate?: (reportId: string) => void
}

const BR_CASE_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  submitted: { label: 'BR Submitted', color: 'text-sky-600 dark:text-sky-400' },
  amazon_replied: { label: 'Amazon Replied', color: 'text-amber-600 dark:text-amber-400' },
  resolved: { label: 'Resolved', color: 'text-emerald-600 dark:text-emerald-400' },
  escalated: { label: 'Escalated', color: 'text-red-600 dark:text-red-400' },
  closed: { label: 'Closed', color: 'text-th-text-muted' },
}

const formatRelativeDate = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return new Date(dateStr).toLocaleDateString('en-CA')
}

export const RelatedReports = ({ reports, currentReportId, onNavigate }: RelatedReportsProps) => {
  const router = useRouter()

  if (reports.length === 0) return null

  const sorted = [...reports].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-th-text-muted" />
        <p className="text-sm font-semibold text-th-text">
          Report History ({reports.length})
        </p>
      </div>

      <div className="relative space-y-0">
        {/* Timeline line */}
        <div className="absolute left-[15px] top-3 bottom-3 w-px bg-th-border" />

        {sorted.map((r, i) => {
          const isCurrent = r.id === currentReportId
          const brStatus = r.br_case_status ? BR_CASE_STATUS_LABEL[r.br_case_status] : null

          return (
            <button
              key={r.id}
              type="button"
              onClick={() => !isCurrent && (onNavigate ? onNavigate(r.id) : router.push(`/reports/${r.id}`))}
              disabled={isCurrent}
              className={`relative flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                isCurrent
                  ? 'bg-th-accent-soft/20 cursor-default'
                  : 'hover:bg-th-bg-hover'
              }`}
            >
              {/* Timeline dot */}
              <div className={`relative z-10 mt-1 h-[9px] w-[9px] shrink-0 rounded-full border-2 ${
                isCurrent
                  ? 'border-th-accent bg-th-accent'
                  : i === 0
                    ? 'border-th-accent bg-surface-card'
                    : 'border-th-border bg-surface-card'
              }`} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <ViolationBadge code={r.br_form_type} showLabel={false} size="sm" />
                  <StatusBadge status={r.status as ReportStatus} type="report" size="sm" />
                  {brStatus && (
                    <span className={`text-[10px] font-medium ${brStatus.color}`}>
                      {brStatus.label}
                    </span>
                  )}
                  {isCurrent && (
                    <span className="rounded-full bg-th-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-th-accent-text">
                      Current
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-[11px] text-th-text-muted">
                    {formatRelativeDate(r.created_at)}
                  </span>
                </div>
                {r.br_case_id && (
                  <p className="mt-0.5 truncate text-xs text-th-text-muted">
                    Case: {r.br_case_id}
                  </p>
                )}
              </div>

              {!isCurrent && (
                <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-th-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
