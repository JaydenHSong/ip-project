'use client'

import Link from 'next/link'
import {
  FileText,
  Search,
  BarChart3,
  AlertTriangle,
  Brain,
  Eye,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { useDashboardContext } from './DashboardContext'

const TrendIndicator = ({ current, previous }: { current: number; previous: number }) => {
  if (previous === 0) return null
  const diff = current - previous
  const pct = Math.round((diff / previous) * 100)
  if (pct === 0) return null
  const isUp = pct > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isUp ? '+' : ''}{pct}%
    </span>
  )
}

export const StatsWidget = () => {
  const { t } = useI18n()
  const { stats } = useDashboardContext()

  const summary = stats?.summary
  const prev = stats?.previousPeriod

  const statItems = [
    {
      label: t('dashboard.activeCampaigns'),
      value: summary?.activeCampaigns ?? 0,
      numericValue: summary?.activeCampaigns ?? 0,
      prevValue: prev?.activeCampaigns ?? 0,
      icon: Search,
      color: 'text-blue-400',
      href: '/campaigns',
    },
    {
      label: t('dashboard.pendingReports'),
      value: summary?.pendingReports ?? 0,
      numericValue: summary?.pendingReports ?? 0,
      prevValue: prev?.pendingReports ?? 0,
      icon: AlertTriangle,
      color: 'text-amber-400',
      href: '/reports',
    },
    {
      label: t('dashboard.collectedListings'),
      value: summary?.totalListings ?? 0,
      numericValue: summary?.totalListings ?? 0,
      prevValue: prev?.totalListings ?? 0,
      icon: FileText,
      color: 'text-emerald-400',
      href: '/campaigns',
    },
    {
      label: t('dashboard.resolutionRate'),
      value: summary ? `${summary.resolvedRate}%` : '—',
      numericValue: summary?.resolvedRate ?? 0,
      prevValue: prev?.resolvedRate ?? 0,
      icon: BarChart3,
      color: 'text-violet-400',
      href: '/reports/completed',
    },
    {
      label: t('dashboard.charts.aiAccuracy' as Parameters<typeof t>[0]),
      value: summary ? `${summary.aiAccuracy}%` : '—',
      numericValue: summary?.aiAccuracy ?? 0,
      prevValue: prev?.aiAccuracy ?? 0,
      icon: Brain,
      color: 'text-cyan-400',
      href: '/reports',
    },
    {
      label: t('dashboard.charts.monitoring' as Parameters<typeof t>[0]),
      value: summary?.monitoringCount ?? 0,
      numericValue: summary?.monitoringCount ?? 0,
      prevValue: prev?.monitoringCount ?? 0,
      icon: Eye,
      color: 'text-orange-400',
      href: '/reports',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {statItems.map((stat) => {
        const Icon = stat.icon
        return (
          <Link
            key={stat.label}
            href={stat.href}
            className="group rounded-xl border border-th-border bg-surface-card p-3 shadow-sm transition-all duration-200 hover:shadow-md hover:border-th-border-secondary active:scale-[0.98] md:p-4"
          >
            <div className="flex items-center justify-between">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.color.replace('text-', 'bg-').replace('-400', '-500/10')}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <p className="text-xl font-bold text-th-text md:text-2xl">{stat.value}</p>
              {prev && <TrendIndicator current={stat.numericValue} previous={stat.prevValue} />}
            </div>
            <p className="mt-1 text-xs font-medium text-th-text-muted">{stat.label}</p>
          </Link>
        )
      })}
    </div>
  )
}
