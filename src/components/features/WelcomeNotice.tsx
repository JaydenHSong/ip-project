'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n/context'
import type { MySummary, WelcomeNotice as WelcomeNoticeType } from '@/types/dashboard'

const STORAGE_KEY_NOTICE = 'sentinel_last_notice_id'
const STORAGE_KEY_DISMISS = 'sentinel_dismiss_notice'

type WelcomeNoticeProps = {
  userId: string
}

export const WelcomeNotice = ({ userId }: WelcomeNoticeProps) => {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState<WelcomeNoticeType | null>(null)
  const [summary, setSummary] = useState<MySummary | null>(null)
  const [dontShow, setDontShow] = useState(false)

  useEffect(() => {
    if (!userId) return

    const dismissed = localStorage.getItem(STORAGE_KEY_DISMISS) === 'true'
    if (dismissed) return

    const fetchData = async (): Promise<void> => {
      try {
        const [noticeRes, summaryRes] = await Promise.all([
          fetch(`/api/settings/welcome-notice?lang=${locale}`),
          fetch('/api/dashboard/my-summary'),
        ])

        if (!noticeRes.ok || !summaryRes.ok) return

        const noticeData = (await noticeRes.json()) as WelcomeNoticeType
        const summaryData = (await summaryRes.json()) as MySummary

        if (!noticeData.enabled) return

        const lastSeen = localStorage.getItem(STORAGE_KEY_NOTICE)
        if (lastSeen === noticeData.notice_id) return

        setNotice(noticeData)
        setSummary(summaryData)
        setOpen(true)
      } catch {
        // silently fail
      }
    }

    fetchData()
  }, [userId, locale])

  const handleClose = (): void => {
    if (dontShow) {
      localStorage.setItem(STORAGE_KEY_DISMISS, 'true')
    }
    if (notice) {
      localStorage.setItem(STORAGE_KEY_NOTICE, notice.notice_id)
    }
    setOpen(false)
  }

  if (!open || !notice) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={handleClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-th-border bg-th-bg p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-th-text">{notice.title}</h2>

        {notice.body && (
          <p className="mt-3 text-sm text-th-text-secondary whitespace-pre-line">{notice.body}</p>
        )}

        {summary && (
          <div className="mt-4 rounded-xl border border-th-border bg-th-bg-secondary p-4">
            <p className="text-xs font-semibold text-th-text-muted uppercase tracking-wider">
              {t('welcome.myActivity' as Parameters<typeof t>[0])}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <StatItem
                label={t('welcome.resolved' as Parameters<typeof t>[0])}
                value={summary.resolvedReports}
                color="text-emerald-400"
              />
              <StatItem
                label={t('welcome.pending' as Parameters<typeof t>[0])}
                value={summary.pendingReports}
                color="text-amber-400"
              />
              <StatItem
                label={t('welcome.monitoring' as Parameters<typeof t>[0])}
                value={summary.monitoringReports}
                color="text-blue-400"
              />
              <StatItem
                label={t('welcome.totalReports' as Parameters<typeof t>[0])}
                value={summary.totalReports}
                color="text-th-text"
              />
            </div>
            <div className="mt-3 border-t border-th-border pt-3">
              <p className="text-sm text-th-text-secondary">
                {t('welcome.campaigns' as Parameters<typeof t>[0])}: {summary.activeCampaigns} {t('welcome.activeCampaigns' as Parameters<typeof t>[0])} / {summary.totalCampaigns} {t('common.all').toLowerCase()}
              </p>
            </div>
          </div>
        )}

        <label className="mt-4 flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
            className="h-4 w-4 rounded border-th-border text-th-accent focus:ring-th-accent"
          />
          <span className="text-xs text-th-text-muted">
            {t('welcome.dontShowAgain' as Parameters<typeof t>[0])}
          </span>
        </label>

        <button
          type="button"
          onClick={handleClose}
          className="mt-4 w-full rounded-xl bg-th-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-colors"
        >
          {t('welcome.ok' as Parameters<typeof t>[0])}
        </button>
      </div>
    </>
  )
}

const StatItem = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-th-text-muted">{label}</p>
  </div>
)
