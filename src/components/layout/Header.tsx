'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Sun, Moon, Globe, ScrollText, ExternalLink } from 'lucide-react'
import { SpigenLogo } from '@/components/ui/SpigenLogo'
import { NotificationBell } from './NotificationBell'
import { getStoredTheme, toggleTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n/context'
import { DEMO_AUDIT_LOGS } from '@/lib/demo/data'
import type { User } from '@/types/users'

type HeaderProps = {
  user: User
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-500',
  approve: 'bg-blue-500',
  reject: 'bg-red-500',
  update: 'bg-amber-500',
  delete: 'bg-red-600',
  login: 'bg-violet-500',
}

export const Header = ({ user }: HeaderProps) => {
  const [isDark, setIsDark] = useState(true)
  const [showAuditDropdown, setShowAuditDropdown] = useState(false)
  const auditRef = useRef<HTMLDivElement>(null)
  const { locale, t, changeLocale } = useI18n()

  useEffect(() => {
    setIsDark(getStoredTheme() === 'dark')
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (auditRef.current && !auditRef.current.contains(e.target as Node)) {
        setShowAuditDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setIsDark(next === 'dark')
  }

  const handleToggleLocale = () => {
    changeLocale(locale === 'ko' ? 'en' : 'ko')
  }

  return (
    <header className="glass sticky top-0 z-40 flex h-14 items-center justify-between border-b px-4 md:h-16 md:px-6">
      <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
        <SpigenLogo className="h-6 w-5 text-th-accent" />
        <span className="text-lg font-bold text-th-text">Spigen Sentinel</span>
      </Link>
      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        {/* Version Badge */}
        <span className="hidden text-xs text-th-text-muted sm:block">v0.1.0</span>

        {/* Audit Logs Dropdown (admin only) */}
        {user.role === 'admin' && (
          <div ref={auditRef} className="static">
            <button
              type="button"
              onClick={() => setShowAuditDropdown((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-th-text-tertiary hover:bg-th-bg-hover hover:text-th-text-secondary"
              title={t('nav.auditLogs')}
            >
              <ScrollText className="h-4 w-4" />
              <span className="hidden text-xs font-medium sm:block">{t('nav.auditLogs')}</span>
            </button>

            {showAuditDropdown && (
              <div className="glass-dropdown fixed right-4 top-14 z-50 mt-1 w-80 rounded-lg border md:top-16">
                <div className="flex items-center justify-between border-b border-th-border px-4 py-3">
                  <h3 className="text-sm font-semibold text-th-text">{t('nav.auditLogs')}</h3>
                  <Link
                    href="/audit-logs"
                    onClick={() => setShowAuditDropdown(false)}
                    className="flex items-center gap-1 text-xs text-th-accent-text hover:underline"
                  >
                    View All
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {DEMO_AUDIT_LOGS.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="border-b border-th-border px-4 py-3 last:border-b-0 hover:bg-th-bg-hover/50"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ACTION_COLORS[log.action] ?? 'bg-gray-500'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase text-th-text">{log.action}</span>
                            <span className="text-xs text-th-text-muted">{log.resource_type}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-th-text-secondary">{log.users.name}</p>
                          <p className="mt-0.5 text-xs text-th-text-muted">
                            {new Date(log.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Separator */}
        <div className="h-5 w-px bg-th-border" />

        {/* Language Toggle */}
        <button
          type="button"
          onClick={handleToggleLocale}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-th-text-tertiary hover:bg-th-bg-hover hover:text-th-text-secondary"
          aria-label="Toggle language"
        >
          <Globe className="h-4 w-4" />
          <span className="text-xs font-medium">{locale === 'ko' ? 'KO' : 'EN'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={handleToggleTheme}
          className="rounded-lg p-2 text-th-text-tertiary hover:bg-th-bg-hover hover:text-th-text-secondary"
          aria-label={isDark ? t('common.lightMode') : t('common.darkMode')}
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notification Bell — Admin only */}
        {user.role === 'admin' && <NotificationBell userId={user.id} />}
      </div>
    </header>
  )
}
