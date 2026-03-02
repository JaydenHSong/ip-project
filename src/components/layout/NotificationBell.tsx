'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'

type Notification = {
  id: string
  type: string
  title: string
  message: string
  metadata: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-001',
    type: 'followup_change_detected',
    title: 'Change Detected',
    message: 'Change detected in B0D1234567 - Title modified.',
    metadata: { report_id: 'rpt-005', asin: 'B0D1234567' },
    is_read: false,
    created_at: '2026-02-22T10:05:00Z',
  },
  {
    id: 'notif-002',
    type: 'followup_no_change',
    title: 'No Change',
    message: 'No change detected in B0D2345678 after re-visit #1.',
    metadata: { report_id: 'rpt-006', asin: 'B0D2345678' },
    is_read: true,
    created_at: '2026-02-17T08:05:00Z',
  },
]

export const NotificationBell = () => {
  const { t } = useI18n()
  const [showDropdown, setShowDropdown] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // TODO: Replace with Supabase Realtime subscription for live notifications
    // Currently using demo data for development
    setNotifications(DEMO_NOTIFICATIONS)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        className="relative rounded-lg p-2 text-th-text-tertiary hover:bg-th-bg-hover hover:text-th-text-secondary"
        aria-label={t('common.notifications')}
        onClick={() => setShowDropdown((prev) => !prev)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-th-border bg-surface-card shadow-lg">
          <div className="flex items-center justify-between border-b border-th-border px-4 py-3">
            <h3 className="text-sm font-semibold text-th-text">
              {t('notifications.title' as Parameters<typeof t>[0])}
            </h3>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs text-th-accent-text hover:underline"
                onClick={handleMarkAllRead}
              >
                {t('notifications.markAllRead' as Parameters<typeof t>[0])}
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-th-text-muted">
                {t('notifications.noNotifications' as Parameters<typeof t>[0])}
              </p>
            ) : (
              notifications.slice(0, 5).map((notif) => (
                <div
                  key={notif.id}
                  className={`border-b border-th-border px-4 py-3 last:border-b-0 ${
                    notif.is_read ? '' : 'bg-th-accent-soft/20'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                      notif.is_read ? 'bg-transparent' : 'bg-th-accent'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-th-text">{notif.title}</p>
                      <p className="mt-0.5 truncate text-xs text-th-text-secondary">{notif.message}</p>
                      <p className="mt-1 text-xs text-th-text-muted">
                        {new Date(notif.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
