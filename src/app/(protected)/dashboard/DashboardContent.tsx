'use client'

import { useI18n } from '@/lib/i18n/context'
import { isDemoMode } from '@/lib/demo'

type DashboardContentProps = {
  userName: string
  stats: {
    activeCampaigns: number
    pendingReports: number
    totalListings: number
    resolvedRate: string
  }
}

export const DashboardContent = ({ userName, stats }: DashboardContentProps) => {
  const { t } = useI18n()

  const statItems = [
    { label: t('dashboard.activeCampaigns'), value: stats.activeCampaigns },
    { label: t('dashboard.pendingReports'), value: stats.pendingReports },
    { label: t('dashboard.collectedListings'), value: stats.totalListings },
    { label: t('dashboard.resolutionRate'), value: stats.resolvedRate },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-th-text">{t('dashboard.title')}</h1>
      <p className="mt-2 text-sm text-th-text-secondary">
        {t('dashboard.greeting', { name: userName })}
      </p>
      {isDemoMode() && (
        <div className="mt-2 rounded-lg border border-st-warning-text/30 bg-st-warning-bg px-4 py-2">
          <p className="text-sm text-st-warning-text">{t('common.demoMode')}</p>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statItems.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-th-border bg-surface-card p-6">
            <p className="text-sm font-medium text-th-text-tertiary">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-th-text">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
