'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Search, FileWarning, Megaphone, MoreHorizontal, Shield, CheckCircle2, Settings } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { cn } from '@/lib/utils/cn'
import type { Role } from '@/types/users'

type MobileTabBarProps = {
  userRole: Role
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const MobileTabBar = ({ userRole }: MobileTabBarProps) => {
  const pathname = usePathname()
  const { t } = useI18n()
  const [showMore, setShowMore] = useState(false)

  const tabs = [
    { labelKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
    { labelKey: 'nav.reportQueue', href: '/reports', icon: FileWarning },
    { labelKey: 'nav.campaigns', href: '/campaigns', icon: Search },
    { labelKey: 'nav.notices', href: '/notices', icon: Megaphone },
  ]

  const moreItems = [
    { labelKey: 'nav.patents', href: '/patents', icon: Shield },
    { labelKey: 'nav.completedReports', href: '/reports/completed', icon: CheckCircle2 },
    { labelKey: 'nav.settings', href: '/settings', icon: Settings },
  ]

  const isMoreActive = moreItems.some((item) => pathname.startsWith(item.href))

  // Reports tab: exact match or /reports/[id], but NOT /reports/completed
  const isReportsTabActive = (href: string) => {
    if (href !== '/reports') return pathname === href || pathname.startsWith(`${href}/`)
    return pathname === '/reports' || (pathname.startsWith('/reports/') && !pathname.startsWith('/reports/completed'))
  }

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)}>
          <div
            className="glass-dropdown absolute bottom-16 right-2 w-52 overflow-hidden rounded-xl border border-th-border py-1 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {moreItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 text-sm',
                    pathname.startsWith(item.href)
                      ? 'bg-th-accent-soft text-th-accent-text'
                      : 'text-th-text-secondary hover:bg-th-bg-hover',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{t(item.labelKey)}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 mx-2 mb-[env(safe-area-inset-bottom)] rounded-2xl border border-th-sidebar-border bg-th-sidebar-bg shadow-lg md:hidden">
        <div className="flex h-16 items-stretch">
          {tabs.map((tab) => {
            const isActive = isReportsTabActive(tab.href)
            const Icon = tab.icon

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs',
                  isActive ? 'text-th-accent' : 'text-th-text',
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{t(tab.labelKey)}</span>
              </Link>
            )
          })}

          {/* More button */}
          <button
            type="button"
            onClick={() => setShowMore((prev) => !prev)}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs',
              isMoreActive || showMore ? 'text-th-accent' : 'text-th-text',
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>{t('common.more')}</span>
          </button>
        </div>
      </nav>
    </>
  )
}
