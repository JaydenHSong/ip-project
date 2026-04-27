'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { DEMO_NOTIFICATIONS } from '@/lib/demo/monitoring'
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

type NotificationBellProps = {
  userId: string | null
  isDemo: boolean
}

export const NotificationBell = ({ userId, isDemo }: NotificationBellProps) => {
  const { t } = useI18n()
  const [showDropdown, setShowDropdown] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    if (isDemo || !userId) {
      setNotifications(DEMO_NOTIFICATIONS as Notification[])
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
  }, [isDemo, userId])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void fetchNotifications()
    })

    return () => window.cancelAnimationFrame(frame)
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

    if (!isDemo && userId) {
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
        <NotificationDropdownPanel
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAllRead={handleMarkAllRead}
          t={t}
        />
      )}
    </div>
  )
}

type PanelProps = {
  notifications: Notification[]
  unreadCount: number
  onMarkAllRead: () => void
  t: (key: string) => string
}

const NotificationDropdownPanel = ({ notifications, unreadCount, onMarkAllRead, t }: PanelProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollDown, setCanScrollDown] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    return () => el.removeEventListener('scroll', checkScroll)
  }, [checkScroll, notifications])

  return (
    <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-xl border border-th-border bg-surface-card shadow-xl">
      <div className="flex items-center justify-between border-b border-th-border px-4 py-3">
        <h3 className="text-sm font-semibold text-th-text">
          {t('common.notifications')}
        </h3>
        {unreadCount > 0 && (
          <button
            type="button"
            className="text-xs text-th-accent-text hover:underline"
            onClick={onMarkAllRead}
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="relative">
        <div ref={scrollRef} className="scrollbar-hide max-h-80 overflow-y-auto">
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
                      {new Date(notif.created_at).toLocaleDateString('en-CA')}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-xl transition-opacity duration-200 ${canScrollDown ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'linear-gradient(to top, var(--surface-card), transparent)' }}
        />
      </div>
    </div>
  )
}
