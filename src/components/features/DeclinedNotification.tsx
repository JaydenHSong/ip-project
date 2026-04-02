'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type DeclinedReport = {
  id: string
  report_number: number
  cancellation_reason: string | null
  cancelled_at: string
}

export const DeclinedNotification = () => {
  const router = useRouter()
  const [reports, setReports] = useState<DeclinedReport[]>([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    fetch('/api/reports/declined-notifications')
      .then((res) => res.ok ? res.json() : null)
      .then((data: { count: number; reports: DeclinedReport[] } | null) => {
        if (!data || data.count === 0) return
        setReports(data.reports)
        setVisible(true)
      })
      .catch(() => {})
  }, [])

  const handleClick = () => {
    // 읽음 처리
    fetch('/api/reports/declined-notifications', { method: 'POST' }).catch(() => {})
    setVisible(false)

    if (reports.length === 1) {
      router.push(`/ip/reports/${reports[0].id}`)
    } else {
      router.push('/ip/reports/completed?status=cancelled')
    }
  }

  const handleDismiss = () => {
    fetch('/api/reports/declined-notifications', { method: 'POST' }).catch(() => {})
    setVisible(false)
  }

  if (!visible || reports.length === 0) return null

  const first = reports[0]
  const reason = first?.cancellation_reason
    ? first.cancellation_reason.slice(0, 80) + (first.cancellation_reason.length > 80 ? '...' : '')
    : null

  return (
    <div className="fixed bottom-24 right-4 z-50 w-80 md:bottom-6">
      <div className="overflow-hidden rounded-xl border border-amber-500/30 bg-amber-50 shadow-lg dark:bg-amber-950/90 dark:border-amber-500/20">
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={handleClick}
              className="flex-1 text-left"
            >
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                {reports.length}건의 신고가 Declined 되었습니다
              </p>
              {reports.length === 1 && (
                <p className="mt-1 text-xs text-th-text-secondary">
                  #{String(first.report_number).padStart(5, '0')}
                  {reason && <span className="block mt-0.5">{reason}</span>}
                </p>
              )}
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                클릭하여 확인
              </p>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="shrink-0 rounded p-1 text-th-text-muted hover:text-th-text"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
