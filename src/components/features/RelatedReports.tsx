'use client'

import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import type { ViolationCode } from '@/constants/violations'
import type { ReportStatus } from '@/types/reports'

type RelatedReport = {
  id: string
  status: string
  br_case_id: string | null
  br_case_status: string | null
  created_at: string
  user_violation_type: string
  listings: { asin: string; title: string } | null
}

type RelatedReportsProps = {
  reports: RelatedReport[]
}

export const RelatedReports = ({ reports }: RelatedReportsProps) => {
  const router = useRouter()

  if (reports.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-th-text-secondary">
        Same Listing ({reports.length})
      </p>
      <div className="space-y-1">
        {reports.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => router.push(`/reports/${r.id}`)}
            className="flex w-full items-center gap-3 rounded-lg border border-th-border bg-surface-card px-3 py-2 text-left transition-colors hover:bg-th-bg-hover"
          >
            <ViolationBadge code={r.user_violation_type as ViolationCode} showLabel={false} size="sm" />
            <span className="flex-1 truncate text-sm text-th-text-secondary">
              {r.listings?.title ?? r.id.substring(0, 8)}
            </span>
            <StatusBadge status={r.status as ReportStatus} type="report" size="sm" />
            <span className="text-xs text-th-text-muted">
              {new Date(r.created_at).toLocaleDateString()}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
