'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SpigenLogo } from '@/components/ui/SpigenLogo'
import {
  LayoutDashboard,
  Search,
  FileWarning,
  CheckCircle2,
  Shield,
  Megaphone,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Target,
  SlidersHorizontal,
  Bot,
  BarChart3,
  Copyright,
  Bell,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { getCurrentModule } from '@/lib/modules'
import { ModuleSwitcher } from './ModuleSwitcher'
import type { Role } from '@/types/users'
import type { User } from '@/types/users'

type NavItem = {
  labelKey: string
  label?: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  minRole?: Role
  milestone?: number
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'layout-dashboard': LayoutDashboard,
  'search': Search,
  'file-text': FileText,
  'check-circle': CheckCircle2,
  'copyright': Copyright,
  'bell': Bell,
  'target': Target,
  'sliders-horizontal': SlidersHorizontal,
  'bot': Bot,
  'bar-chart-3': BarChart3,
  'shield': Shield,
  'megaphone': Megaphone,
}

const buildNavFromModule = (mod: import('@/constants/modules').ModuleConfig): NavItem[] =>
  mod.menuItems.map((item) => ({
    labelKey: item.labelKey,
    label: item.label,
    href: item.path,
    icon: ICON_MAP[item.icon] ?? LayoutDashboard,
  }))

const BOTTOM_NAV: NavItem[] = [
  { labelKey: 'nav.settings', href: '/settings', icon: Settings },
]

const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 5,
  admin: 4,
  editor: 3,
  viewer_plus: 2,
  viewer: 1,
}

type SidebarProps = {
  user: User
  collapsed: boolean
  onToggle: () => void
}

const filterItems = (items: NavItem[], userRole: Role): NavItem[] =>
  items.filter((item) => {
    if (item.milestone && item.milestone > 3) return false
    if (!item.minRole) return true
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[item.minRole]
  })

const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer_plus: 'Viewer+',
  viewer: 'Viewer',
}

export const Sidebar = ({ user, collapsed, onToggle }: SidebarProps) => {
  const pathname = usePathname()
  const { t, locale } = useI18n()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const currentModule = getCurrentModule(pathname)

  const moduleNav = currentModule ? buildNavFromModule(currentModule) : []
  const mainItems = filterItems(moduleNav, user.role)
  const bottomItems = filterItems(BOTTOM_NAV, user.role)

  const handleLogout = async () => {
    setShowLogoutConfirm(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const allHrefs = [...mainItems, ...bottomItems].map((i) => i.href)

  const renderNavItem = (item: NavItem) => {
    const hasMoreSpecificMatch = allHrefs.some(
      (href) => href !== item.href && href.startsWith(`${item.href}/`) && pathname.startsWith(href),
    )
    const isActive =
      !hasMoreSpecificMatch && (pathname === item.href || pathname.startsWith(`${item.href}/`))
    const Icon = item.icon
    // Fix: when t() returns the key itself (missing translation), fall back to item.label.
    // Previously `t(key) || label` would always pick the key string since it was truthy.
    const translated = t(item.labelKey)
    const label = (translated && translated !== item.labelKey) ? translated : (item.label ?? item.labelKey)

    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? label : undefined}
        className={cn(
          'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
          collapsed && 'justify-center px-2',
          isActive
            ? 'bg-th-sidebar-active text-th-sidebar-active-text'
            : 'text-th-sidebar-text hover:bg-th-sidebar-hover hover:text-th-text',
        )}
      >
        {isActive && !collapsed && (
          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-th-accent" />
        )}
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
        {!collapsed && <span className="text-sm font-semibold text-th-text">Amazon Resource Controller</span>}
      </div>

      {/* Module Switcher */}
      <ModuleSwitcher currentModule={currentModule} collapsed={collapsed} userRole={user.role} />

      {/* Main Nav */}
      <nav key={locale} className="flex-1 space-y-1 px-2 py-4">
        {mainItems.map(renderNavItem)}
      </nav>

      {/* Bottom Nav (Settings) */}
      {bottomItems.length > 0 && (
        <div className="border-t border-th-sidebar-border px-2 py-3 space-y-1">
          {bottomItems.map(renderNavItem)}
        </div>
      )}

      {/* Account Section */}
      <div className="border-t border-th-sidebar-border px-2 py-3">
        <div className={cn(
          'flex items-center gap-3 px-2',
          collapsed && 'flex-col gap-2',
        )}>
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
          {collapsed ? (
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              title={t('common.logout')}
              className="rounded-lg p-1.5 text-th-text-muted hover:bg-th-sidebar-hover hover:text-th-text-secondary transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-th-sidebar-text">{user.name}</p>
                <p className="text-xs text-th-text-muted">{ROLE_LABELS[user.role]}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                title={t('common.logout')}
                className="shrink-0 rounded-lg p-1.5 text-th-text-muted hover:bg-th-sidebar-hover hover:text-th-text-secondary transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Logout Confirm Modal */}
      {showLogoutConfirm && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowLogoutConfirm(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-xl border border-th-border bg-th-bg p-6 shadow-2xl">
            <p className="text-center text-sm font-medium text-th-text">
              {t('common.logoutConfirm')}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-xl border border-th-border px-4 py-2.5 text-sm font-medium text-th-text-secondary hover:bg-th-bg-hover transition-colors"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 rounded-xl bg-st-danger-bg px-4 py-2.5 text-sm font-medium text-st-danger-text hover:opacity-90 transition-colors"
              >
                Yes
              </button>
            </div>
          </div>
        </>
      )}

      {/* Collapse Toggle */}
      <div className={cn(
        'flex items-center border-t border-th-sidebar-border py-2',
        collapsed ? 'justify-center px-3' : 'justify-end px-4',
      )}>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-lg p-1.5 text-th-text-muted hover:bg-th-sidebar-hover hover:text-th-text-secondary transition-colors"
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
