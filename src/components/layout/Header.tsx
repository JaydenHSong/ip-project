'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, LogOut, ChevronDown, Sun, Moon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getStoredTheme, toggleTheme } from '@/lib/theme'
import type { User } from '@/types/users'

type HeaderProps = {
  user: User
}

export const Header = ({ user }: HeaderProps) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
    <header className="flex h-16 items-center justify-between border-b border-th-border bg-surface-card px-6">
      <div />

      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          type="button"
          onClick={handleToggleTheme}
          className="rounded-lg p-2 text-th-text-tertiary hover:bg-th-bg-hover hover:text-th-text-secondary"
          aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notification Bell */}
        <button
          type="button"
          className="relative rounded-lg p-2 text-th-text-tertiary hover:bg-th-bg-hover hover:text-th-text-secondary"
          aria-label="알림"
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
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
