'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import type { ReportStatus } from '@/types/reports'
import { isDemoMode } from '@/lib/demo'
import { DEMO_REPORTS } from '@/lib/demo/data'
import { useDashboardContext } from './DashboardContext'

type RecentReport = {
  id: string
  br_form_type: string
  user_violation_type: string | null
  violation_category: string | null
  status: string
  ai_confidence_score: number | null
  disagreement_flag: boolean
  created_at: string
  listings: { asin: string; title: string; marketplace: string; seller_name: string | null } | null
}

export const RecentReportsWidget = () => {
  const { t } = useI18n()
  const { isAdmin, scope } = useDashboardContext()
  const [reports, setReports] = useState<RecentReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemoMode()) {
      setReports(
        DEMO_REPORTS.filter((r) => r.status !== 'archived').slice(0, 5).map((r) => ({
          id: r.id,
          br_form_type: r.br_form_type ?? r.violation_type,
          user_violation_type: (r as Record<string, unknown>).user_violation_type as string | null ?? null,
          violation_category: (r as Record<string, unknown>).violation_category as string | null ?? null,
          status: r.status,
          ai_confidence_score: r.ai_confidence_score,
          disagreement_flag: r.disagreement_flag,
          created_at: r.created_at,
          listings: r.listings,
        }))
      )
      setLoading(false)
      return
    }

    const fetchReports = async () => {
      try {
        const params = new URLSearchParams({ limit: '5', scope })
        const res = await fetch(`/api/dashboard/recent-reports?${params}`)
        if (res.ok) {
          const data = await res.json()
          setReports(data)
        }
      } catch {
        // keep empty
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [scope])

  if (loading) {
    return <div className="h-[200px] animate-pulse rounded-lg bg-th-bg-secondary" />
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-th-text">
          {isAdmin ? t('dashboard.recentReports') : t('dashboard.myRecentReports' as Parameters<typeof t>[0])}
        </h3>
        <Link href="/ip/reports" className="text-xs font-medium text-th-accent-text hover:underline">
          {t('dashboard.viewAll')}
        </Link>
      </div>
      {reports.length === 0 ? (
        <div className="py-10 text-center text-sm text-th-text-muted">
          {t('dashboard.noRecentReports')}
        </div>
      ) : (
        <div className="divide-y divide-th-border rounded-lg border border-th-border">
          {reports.map((report) => (
            <Link key={report.id} href={`/reports/${report.id}`}>
              <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-th-bg-hover active:bg-th-bg-hover">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <ViolationBadge code={report.user_violation_type ?? report.br_form_type} violationCategory={report.violation_category} showLabel={false} />
                    <span className="truncate text-sm text-th-text">{report.listings?.asin ?? '—'}</span>
                    {report.disagreement_flag && (
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-st-warning-text" />
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-th-text-muted">
                    {report.listings?.title ?? '—'}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <StatusBadge status={report.status as ReportStatus} type="report" />
                  <ChevronRight className="h-4 w-4 text-th-text-muted" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
