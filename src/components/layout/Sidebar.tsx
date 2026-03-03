'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SpigenLogo } from '@/components/ui/SpigenLogo'
import {
  LayoutDashboard,
  Search,
  FileWarning,
  CheckCircle2,
  Archive,
  Shield,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import type { Role } from '@/types/users'
import type { User } from '@/types/users'

type NavItem = {
  labelKey: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  minRole?: Role
  milestone?: number
}

const MAIN_NAV: NavItem[] = [
  { labelKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { labelKey: 'nav.campaigns', href: '/campaigns', icon: Search },
  { labelKey: 'nav.reportQueue', href: '/reports', icon: FileWarning },
  { labelKey: 'nav.completedReports', href: '/reports/completed', icon: CheckCircle2 },
  { labelKey: 'nav.archivedReports', href: '/reports/archived', icon: Archive },
  { labelKey: 'nav.patents', href: '/patents', icon: Shield, milestone: 2 },
]

const BOTTOM_NAV: NavItem[] = [
  { labelKey: 'nav.settings', href: '/settings', icon: Settings, minRole: 'admin', milestone: 3 },
]

const CURRENT_MILESTONE = 3

const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 3,
  editor: 2,
  viewer: 1,
}

type SidebarProps = {
  user: User
  collapsed: boolean
  onToggle: () => void
}

const filterItems = (items: NavItem[], userRole: Role): NavItem[] =>
  items.filter((item) => {
    if (item.milestone && item.milestone > CURRENT_MILESTONE) return false
    if (!item.minRole) return true
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[item.minRole]
  })

export const Sidebar = ({ user, collapsed, onToggle }: SidebarProps) => {
  const pathname = usePathname()
  const { t } = useI18n()
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  const mainItems = filterItems(MAIN_NAV, user.role)
  const bottomItems = filterItems(BOTTOM_NAV, user.role)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const allHrefs = [...mainItems, ...bottomItems].map((i) => i.href)

  const renderNavItem = (item: NavItem) => {
    const hasMoreSpecificMatch = allHrefs.some(
      (href) => href !== item.href && href.startsWith(`${item.href}/`) && pathname.startsWith(href),
    )
    const isActive =
      !hasMoreSpecificMatch && (pathname === item.href || pathname.startsWith(`${item.href}/`))
    const Icon = item.icon
    const label = t(item.labelKey)

    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? label : undefined}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          collapsed && 'justify-center px-2',
          isActive
            ? 'bg-th-sidebar-active text-th-sidebar-active-text'
            : 'text-th-sidebar-text hover:bg-th-sidebar-hover hover:text-th-text',
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span>{label}</span>}
      </Link>
    )
  }

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-th-sidebar-border bg-th-sidebar-bg transition-all duration-500 ease-in-out',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex h-16 items-center gap-2.5 border-b border-th-sidebar-border px-4',
        collapsed && 'justify-center px-2',
      )}>
        <SpigenLogo className="h-7 w-6 shrink-0 text-th-accent" />
        {!collapsed && (
          <span className="text-lg font-bold text-th-text">Sentinel</span>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {mainItems.map(renderNavItem)}
      </nav>

      {/* Bottom Nav (Settings) */}
      {bottomItems.length > 0 && (
        <div className="border-t border-th-sidebar-border px-2 py-3 space-y-1">
          {bottomItems.map(renderNavItem)}
        </div>
      )}

      {/* Account Section */}
      <div ref={accountRef} className="relative border-t border-th-sidebar-border px-2 py-3">
        <button
          type="button"
          onClick={() => setShowAccountMenu((prev) => !prev)}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-th-sidebar-hover transition-colors',
            collapsed && 'justify-center',
          )}
        >
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              className="h-8 w-8 shrink-0 rounded-full"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-th-accent-soft text-sm font-medium text-th-accent-text">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-th-sidebar-text">{user.name}</p>
                <p className="text-xs text-th-text-muted">{roleLabel[user.role]}</p>
              </div>
              <ChevronUp className={cn(
                'h-4 w-4 shrink-0 text-th-text-muted transition-transform',
                showAccountMenu && 'rotate-180',
              )} />
            </>
          )}
        </button>

        {/* Account Popup Menu */}
        {showAccountMenu && (
          <div className={cn(
            'glass-dropdown absolute z-50 rounded-lg border py-1',
            collapsed
              ? 'bottom-0 left-full ml-2 w-48'
              : 'bottom-full left-2 right-2 mb-1',
          )}>
            <div className="border-b border-th-border px-4 py-2">
              <p className="truncate text-sm text-th-text">{user.email}</p>
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

      {/* Collapse Toggle */}
      <div className={cn(
        'flex items-center border-t border-th-sidebar-border px-3 py-2',
        collapsed ? 'justify-center' : 'justify-end',
      )}>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-lg p-1.5 text-th-text-muted hover:bg-th-sidebar-hover hover:text-th-text-secondary"
          aria-label={collapsed ? t('common.expandSidebar') : t('common.collapseSidebar')}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  )
}
