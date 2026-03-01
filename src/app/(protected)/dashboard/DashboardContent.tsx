'use client'

import Link from 'next/link'
import { Shield, FileText, Search, BarChart3, Plus, AlertTriangle, ChevronRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { isDemoMode } from '@/lib/demo'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import type { ViolationCode } from '@/constants/violations'

type RecentReport = {
  id: string
  violation_type: string
  status: string
  ai_confidence_score: number | null
  disagreement_flag: boolean
  created_at: string
  listings: { asin: string; title: string; marketplace: string; seller_name: string | null } | null
}

type ActiveCampaign = {
  id: string
  keyword: string
  marketplace: string
  frequency: string
}

type DashboardContentProps = {
  userName: string
  stats: {
    activeCampaigns: number
    pendingReports: number
    totalListings: number
    resolvedRate: string
  }
  recentReports: RecentReport[]
  activeCampaigns: ActiveCampaign[]
}

export const DashboardContent = ({ userName, stats, recentReports, activeCampaigns }: DashboardContentProps) => {
  const { t } = useI18n()

  const statItems = [
    { label: t('dashboard.activeCampaigns'), value: stats.activeCampaigns, icon: Search, color: 'text-blue-400' },
    { label: t('dashboard.pendingReports'), value: stats.pendingReports, icon: AlertTriangle, color: 'text-amber-400' },
    { label: t('dashboard.collectedListings'), value: stats.totalListings, icon: FileText, color: 'text-emerald-400' },
    { label: t('dashboard.resolutionRate'), value: stats.resolvedRate, icon: BarChart3, color: 'text-violet-400' },
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Greeting */}
      <div>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-th-accent md:h-6 md:w-6" />
          <h1 className="text-lg font-bold text-th-text md:text-2xl">{t('dashboard.title')}</h1>
        </div>
        <p className="mt-1 text-sm text-th-text-secondary">
          {t('dashboard.greeting', { name: userName })}
        </p>
        {isDemoMode() && (
          <div className="mt-2 rounded-lg border border-st-warning-text/30 bg-st-warning-bg px-3 py-1.5">
            <p className="text-xs text-st-warning-text">{t('common.demoMode')}</p>
          </div>
        )}
      </div>

      {/* Stats Grid - 2x2 on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
        {statItems.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="rounded-lg border border-th-border bg-surface-card p-3 md:p-6">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${stat.color} md:h-5 md:w-5`} />
                <p className="text-xs font-medium text-th-text-tertiary md:text-sm">{stat.label}</p>
              </div>
              <p className="mt-1.5 text-2xl font-bold text-th-text md:mt-2 md:text-3xl">{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* Quick Actions - mobile only */}
      <div className="flex gap-2 md:hidden">
        <Link
          href="/campaigns/new"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-th-accent px-3 py-2.5 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          {t('dashboard.newCampaign')}
        </Link>
        <Link
          href="/reports"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-th-border bg-surface-card px-3 py-2.5 text-sm font-medium text-th-text"
        >
          <FileText className="h-4 w-4" />
          {t('dashboard.reportQueue')}
        </Link>
      </div>

      {/* Two column layout on desktop */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {/* Recent Reports */}
        <div className="rounded-lg border border-th-border bg-surface-card">
          <div className="flex items-center justify-between border-b border-th-border px-4 py-3">
            <h2 className="text-sm font-semibold text-th-text">{t('dashboard.recentReports')}</h2>
            <Link href="/reports" className="text-xs text-th-accent-text hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          </div>
          {recentReports.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-th-text-muted">
              {t('dashboard.noRecentReports')}
            </div>
          ) : (
            <div className="divide-y divide-th-border">
              {recentReports.map((report) => (
                <Link key={report.id} href={`/reports/${report.id}`}>
                  <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-th-bg-hover active:bg-th-bg-hover">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <ViolationBadge code={report.violation_type as ViolationCode} showLabel={false} />
                        <span className="truncate text-sm text-th-text">{report.listings?.asin ?? '—'}</span>
                        {report.disagreement_flag && (
                          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-st-warning-text" />
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-th-text-muted">
                        {report.listings?.title ?? '—'}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <StatusBadge status={report.status as 'draft' | 'pending_review' | 'approved'} type="report" />
                      <ChevronRight className="h-4 w-4 text-th-text-muted" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Active Campaigns */}
        <div className="rounded-lg border border-th-border bg-surface-card">
          <div className="flex items-center justify-between border-b border-th-border px-4 py-3">
            <h2 className="text-sm font-semibold text-th-text">{t('dashboard.activeCampaignsList')}</h2>
            <Link href="/campaigns" className="text-xs text-th-accent-text hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          </div>
          {activeCampaigns.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-th-text-muted">
              {t('dashboard.noActiveCampaigns')}
            </div>
          ) : (
            <div className="divide-y divide-th-border">
              {activeCampaigns.map((campaign) => (
                <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                  <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-th-bg-hover active:bg-th-bg-hover">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-th-text">{campaign.keyword}</p>
                      <p className="mt-0.5 text-xs text-th-text-muted">
                        {campaign.marketplace} &middot; {campaign.frequency}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <StatusBadge status="active" type="campaign" />
                      <ChevronRight className="h-4 w-4 text-th-text-muted" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
