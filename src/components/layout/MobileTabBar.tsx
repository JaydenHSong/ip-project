'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Search, FileWarning, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { cn } from '@/lib/utils/cn'
import type { Role } from '@/types/users'

type MobileTabBarProps = {
  userRole: Role
}

export const MobileTabBar = ({ userRole }: MobileTabBarProps) => {
  const pathname = usePathname()
  const { t } = useI18n()
  const [showMore, setShowMore] = useState(false)

  const tabs = [
    { labelKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
    { labelKey: 'nav.campaigns', href: '/campaigns', icon: Search },
    { labelKey: 'nav.reportQueue', href: '/reports', icon: FileWarning },
  ]

  const moreItems = [
    { labelKey: 'nav.completedReports', href: '/reports/completed' },
    ...(userRole === 'admin' ? [{ labelKey: 'nav.auditLogs', href: '/audit-logs' }] : []),
  ]

  const isMoreActive = moreItems.some((item) => pathname.startsWith(item.href))

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)}>
          <div
            className="absolute bottom-16 right-2 w-48 rounded-lg border border-th-border bg-surface-card py-1 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {moreItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMore(false)}
                className={cn(
                  'block px-4 py-2.5 text-sm',
                  pathname.startsWith(item.href)
                    ? 'bg-th-accent-soft text-th-accent-text'
                    : 'text-th-text-secondary hover:bg-th-bg-hover',
                )}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-th-border bg-surface-card md:hidden">
        <div className="flex h-16 items-stretch">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
            const Icon = tab.icon

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs',
                  isActive ? 'text-th-accent' : 'text-th-text-muted',
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
              isMoreActive || showMore ? 'text-th-accent' : 'text-th-text-muted',
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
