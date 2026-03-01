'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Bell, LogOut, ChevronDown, Sun, Moon, Globe } from 'lucide-react'
import { SpigenLogo } from '@/components/ui/SpigenLogo'
import { createClient } from '@/lib/supabase/client'
import { getStoredTheme, toggleTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n/context'
import type { User } from '@/types/users'

type HeaderProps = {
  user: User
}

export const Header = ({ user }: HeaderProps) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { locale, t, changeLocale } = useI18n()

  useEffect(() => {
    setIsDark(getStoredTheme() === 'dark')

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
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

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const roleLabel: Record<string, string> = {
    admin: 'Admin',
    editor: 'Editor',
    viewer: 'Viewer',
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-th-border bg-surface-card px-4 md:h-16 md:px-6">
      <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
        <SpigenLogo className="h-6 w-5 text-th-accent" />
        <span className="text-lg font-bold text-th-text">Sentinel</span>
      </Link>
      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
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

        {/* Notification Bell */}
        <button
          type="button"
          className="relative rounded-lg p-2 text-th-text-tertiary hover:bg-th-bg-hover hover:text-th-text-secondary"
          aria-label={t('common.notifications')}
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* Profile Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown((prev) => !prev)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-th-bg-hover"
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-th-accent-soft text-sm font-medium text-th-accent-text">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-th-text">{user.name}</p>
              <p className="text-xs text-th-text-muted">{roleLabel[user.role]}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-th-text-muted" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-th-border bg-surface-card py-1 shadow-lg">
              <div className="border-b border-th-border px-4 py-2">
                <p className="text-sm font-medium text-th-text">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-th-text-secondary hover:bg-th-bg-hover"
              >
                <LogOut className="h-4 w-4" />
                {t('common.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
