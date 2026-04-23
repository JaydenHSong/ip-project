'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sun, Moon, Globe } from 'lucide-react'
import { SpigenLogo } from '@/components/ui/SpigenLogo'
import { NotificationBell } from './NotificationBell'
import { NoticeDropdown } from './NoticeDropdown'
import { getStoredTheme, toggleTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n/context'
import type { User } from '@/types/users'

type HeaderProps = {
  user: User
  isDemo: boolean
}

export const Header = ({ user, isDemo }: HeaderProps) => {
  const [isDark, setIsDark] = useState(true)
  const { locale, t, changeLocale } = useI18n()

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsDark(getStoredTheme() === 'dark')
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setIsDark(next === 'dark')
  }

  const handleToggleLocale = () => {
    changeLocale(locale === 'ko' ? 'en' : 'ko')
  }

  return (
    <header className="glass relative z-40 flex h-14 shrink-0 items-center justify-between border-b px-4 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.15)] md:h-16 md:px-6">
      <Link href="/ip/dashboard" className="flex h-9 w-9 items-center justify-center md:hidden">
        <SpigenLogo className="h-7 w-6 text-th-accent" />
      </Link>
      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        {/* Version Badge */}
        <span className="hidden text-xs text-th-text-muted sm:block">v0.1.0</span>

        {/* Notices Dropdown */}
        <NoticeDropdown />

        {/* Separator */}
        <div className="h-5 w-px bg-th-border" />

        {/* Language Toggle */}
        <button
          type="button"
          onClick={handleToggleLocale}
          className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-th-text-tertiary hover:bg-th-bg-hover hover:text-th-text-secondary"
          aria-label="Toggle language"
        >
          <Globe className="h-4 w-4" />
          <span className="text-xs font-medium">{locale === 'ko' ? 'KO' : 'EN'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={handleToggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-th-text-tertiary hover:bg-th-bg-hover hover:text-th-text-secondary"
          aria-label={isDark ? t('common.lightMode') : t('common.darkMode')}
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notification Bell — Admin only */}
        {(user.role === 'owner' || user.role === 'admin') && <NotificationBell userId={user.id} isDemo={isDemo} />}
      </div>
    </header>
  )
}
