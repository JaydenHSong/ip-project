'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { initTheme } from '@/lib/theme'
import { I18nProvider } from '@/lib/i18n/context'
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
      <div className="flex h-screen overflow-hidden bg-th-bg-secondary">
        <Sidebar
          userRole={user.role}
          collapsed={sidebarCollapsed}
          onToggle={handleToggleSidebar}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header user={user} />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </I18nProvider>
  )
}
