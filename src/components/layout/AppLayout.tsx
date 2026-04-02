'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileTabBar } from './MobileTabBar'
import { initTheme } from '@/lib/theme'
import { I18nProvider } from '@/lib/i18n/context'
import { ToastProvider } from '@/components/providers/ToastProvider'
import { UnreadNoticePopup } from '@/components/features/UnreadNoticePopup'
import { DeclinedNotification } from '@/components/features/DeclinedNotification'
import type { User } from '@/types/users'

type AppLayoutProps = {
  user: User
  children: React.ReactNode
}

export const AppLayout = ({ user, children }: AppLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    initTheme()
    const saved = localStorage.getItem('sentinel-sidebar-collapsed')
    if (saved === 'true') setSidebarCollapsed(true)
  }, [])

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sentinel-sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <I18nProvider>
      <ToastProvider>
      <div className="flex h-dvh overflow-hidden bg-th-bg-secondary">
        <div className="hidden md:block">
          <Sidebar
            user={user}
            collapsed={sidebarCollapsed}
            onToggle={handleToggleSidebar}
          />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header user={user} />
          <main className="min-w-0 flex-1 overflow-y-auto scroll-smooth p-4 pb-20 md:p-6 md:pb-6">
            {children}
          </main>
        </div>
        {/* Mobile tab bar */}
        <MobileTabBar userRole={user.role} />
        <UnreadNoticePopup />
        <DeclinedNotification />
      </div>
    </ToastProvider>
    </I18nProvider>
  )
}
