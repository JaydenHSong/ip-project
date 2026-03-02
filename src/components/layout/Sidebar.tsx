'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SpigenLogo } from '@/components/ui/SpigenLogo'
import {
  LayoutDashboard,
  Search,
  FileWarning,
  CheckCircle2,
  Archive,
  BookOpen,
  Settings,
  ScrollText,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useI18n } from '@/lib/i18n/context'
import type { Role } from '@/types/users'

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
  { labelKey: 'nav.patents', href: '/patents', icon: BookOpen, milestone: 2 },
]

const BOTTOM_NAV: NavItem[] = [
  { labelKey: 'nav.auditLogs', href: '/audit-logs', icon: ScrollText, minRole: 'admin' },
  { labelKey: 'nav.settings', href: '/settings', icon: Settings, minRole: 'admin', milestone: 3 },
]

const CURRENT_MILESTONE = 1

const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 3,
  editor: 2,
  viewer: 1,
}

type SidebarProps = {
  userRole: Role
  collapsed: boolean
  onToggle: () => void
}

const filterItems = (items: NavItem[], userRole: Role): NavItem[] =>
  items.filter((item) => {
    if (item.milestone && item.milestone > CURRENT_MILESTONE) return false
    if (!item.minRole) return true
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[item.minRole]
  })

export const Sidebar = ({ userRole, collapsed, onToggle }: SidebarProps) => {
  const pathname = usePathname()
  const { t } = useI18n()

  const mainItems = filterItems(MAIN_NAV, userRole)
  const bottomItems = filterItems(BOTTOM_NAV, userRole)

  const renderNavItem = (item: NavItem) => {
    const isActive =
      pathname === item.href || pathname.startsWith(`${item.href}/`)
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
        'flex h-full flex-col border-r border-th-sidebar-border bg-th-sidebar-bg transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-th-sidebar-border px-4">
        <SpigenLogo className="h-7 w-6 shrink-0 text-th-accent" />
        {!collapsed && (
          <span className="text-lg font-bold text-th-text">Sentinel</span>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {mainItems.map(renderNavItem)}
      </nav>

      {/* Bottom Nav */}
      {bottomItems.length > 0 && (
        <div className="border-t border-th-sidebar-border px-2 py-3 space-y-1">
          {bottomItems.map(renderNavItem)}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-th-sidebar-border px-3 py-3">
        {!collapsed && (
          <p className="text-xs text-th-text-muted">v0.1.0</p>
        )}
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
