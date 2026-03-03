'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { isDemoMode } from '@/lib/demo'
import { createClient } from '@/lib/supabase/client'

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
    type: 'patent_sync_completed',
    title: 'IP Sync Complete',
    message: 'Monday.com sync — 1202 items (+5, ~3, 0 err)',
    metadata: { total: 1202, created: 5, updated: 3 },
    is_read: false,
    created_at: '2026-03-03T09:00:00Z',
  },
]

type NotificationBellProps = {
  userId: string | null
}

export const NotificationBell = ({ userId }: NotificationBellProps) => {
  const { t } = useI18n()
  const [showDropdown, setShowDropdown] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    if (isDemoMode() || !userId) {
      setNotifications(DEMO_NOTIFICATIONS)
      return
    }

    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      setNotifications(data as Notification[])
    }
  }, [userId])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

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

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))

    if (!isDemoMode() && userId) {
      const supabase = createClient()
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
    }
  }

  const handleToggle = () => {
    setShowDropdown((prev) => !prev)
    if (!showDropdown) {
      fetchNotifications()
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        className="relative rounded-lg p-2 text-th-text-tertiary hover:bg-th-bg-hover hover:text-th-text-secondary"
        aria-label={t('common.notifications')}
        onClick={handleToggle}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="glass-dropdown absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border">
          <div className="flex items-center justify-between border-b border-th-border px-4 py-3">
            <h3 className="text-sm font-semibold text-th-text">
              {t('common.notifications')}
            </h3>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs text-th-accent-text hover:underline"
                onClick={handleMarkAllRead}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-th-text-muted">
                No notifications
              </p>
            ) : (
              notifications.slice(0, 10).map((notif) => (
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
