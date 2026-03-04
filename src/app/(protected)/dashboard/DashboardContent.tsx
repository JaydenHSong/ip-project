'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  FileText,
  Search,
  BarChart3,
  AlertTriangle,
  ChevronRight,
  Brain,
  Eye,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { isDemoMode } from '@/lib/demo'
import { getDemoDashboardStats } from '@/lib/demo/dashboard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import type { ViolationCode } from '@/constants/violations'
import { WelcomeNotice } from '@/components/features/WelcomeNotice'
import type { DashboardStats, PeriodFilter } from '@/types/dashboard'
import type { Role } from '@/types/users'

const ReportTrendChart = dynamic(
  () => import('@/components/features/charts/ReportTrendChart').then((m) => m.ReportTrendChart),
  { ssr: false, loading: () => <ChartSkeleton height={280} /> }
)
const ViolationDistChart = dynamic(
  () => import('@/components/features/charts/ViolationDistChart').then((m) => m.ViolationDistChart),
  { ssr: false, loading: () => <ChartSkeleton height={280} /> }
)
const StatusPipelineChart = dynamic(
  () => import('@/components/features/charts/StatusPipelineChart').then((m) => m.StatusPipelineChart),
  { ssr: false, loading: () => <ChartSkeleton height={280} /> }
)
const TopViolationsChart = dynamic(
  () => import('@/components/features/charts/TopViolationsChart').then((m) => m.TopViolationsChart),
  { ssr: false, loading: () => <ChartSkeleton height={350} /> }
)
const AiPerformanceCard = dynamic(
  () => import('@/components/features/charts/AiPerformanceCard').then((m) => m.AiPerformanceCard),
  { ssr: false, loading: () => <ChartSkeleton height={280} /> }
)

const ChartSkeleton = ({ height }: { height: number }) => (
  <div
    className="animate-pulse rounded-lg border border-th-border bg-surface-card"
    style={{ height }}
  />
)

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
  userId: string
  userRole: Role
  initialStats: DashboardStats | null
  recentReports: RecentReport[]
  activeCampaigns: ActiveCampaign[]
}

const PERIODS: PeriodFilter[] = ['7d', '30d', '90d']

const MARKETPLACES = [
  { value: '', label: 'All Marketplaces' },
  { value: 'US', label: 'US' },
  { value: 'CA', label: 'CA' },
  { value: 'UK', label: 'UK' },
  { value: 'DE', label: 'DE' },
  { value: 'JP', label: 'JP' },
]

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

export const DashboardContent = ({
  userName,
  userId,
  userRole,
  initialStats,
  recentReports,
  activeCampaigns,
}: DashboardContentProps) => {
  const { t } = useI18n()
  const router = useRouter()
  const [period, setPeriod] = useState<PeriodFilter>('30d')
  const [marketplace, setMarketplace] = useState('')
  const [stats, setStats] = useState<DashboardStats | null>(initialStats)
  const isAdmin = userRole === 'owner' || userRole === 'admin'
  const scope = isAdmin ? 'all' : 'my'

  const buildUrl = useCallback((p: PeriodFilter, mp: string) => {
    const params = new URLSearchParams({ period: p, scope })
    if (mp) params.set('marketplace', mp)
    return `/api/dashboard/stats?${params.toString()}`
  }, [scope])

  useEffect(() => {
    if (initialStats || isDemoMode()) return
    fetch(buildUrl('30d', marketplace))
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setStats(data) })
      .catch(() => {})
  }, [initialStats, scope, marketplace, buildUrl])

  const navigateToReports = useCallback((params: Record<string, string>) => {
    const search = new URLSearchParams(params).toString()
    router.push(`/reports?${search}`)
  }, [router])

  const fetchStats = useCallback(async (newPeriod: PeriodFilter, mp: string) => {
    if (isDemoMode()) {
      setStats(getDemoDashboardStats(newPeriod))
      return
    }
    try {
      const res = await fetch(buildUrl(newPeriod, mp))
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch {
      // keep previous stats on error
    }
  }, [buildUrl])

  const handlePeriodChange = useCallback(async (newPeriod: PeriodFilter) => {
    setPeriod(newPeriod)
    fetchStats(newPeriod, marketplace)
  }, [marketplace, fetchStats])

  const handleMarketplaceChange = useCallback((mp: string) => {
    setMarketplace(mp)
    fetchStats(period, mp)
  }, [period, fetchStats])

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
    <div className="space-y-6">
      <WelcomeNotice userId={userId} />

      {/* Greeting + Period Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-th-text">{t('dashboard.title')}</h1>
          <p className="mt-1 text-sm text-th-text-secondary">
            {t('dashboard.greeting', { name: userName })}
          </p>
          {isDemoMode() && (
            <div className="mt-2 rounded-xl border border-st-warning-text/30 bg-st-warning-bg px-3 py-1.5">
              <p className="text-xs text-st-warning-text">{t('common.demoMode')}</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={marketplace}
            onChange={(e) => handleMarketplaceChange(e.target.value)}
            className="rounded-xl border border-th-border bg-surface-card px-3 py-1.5 text-xs font-medium text-th-text shadow-sm outline-none focus:border-th-accent"
          >
            {MARKETPLACES.map((mp) => (
              <option key={mp.value} value={mp.value}>{mp.label}</option>
            ))}
          </select>
          <div className="flex gap-1 rounded-xl border border-th-border bg-surface-card p-1 shadow-sm">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                  period === p
                    ? 'bg-th-accent text-white shadow-sm'
                    : 'text-th-text-secondary hover:bg-th-bg-hover'
                }`}
              >
                {t(`dashboard.charts.period.${p}` as Parameters<typeof t>[0])}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {statItems.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group rounded-xl border border-th-border bg-surface-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-th-border-secondary active:scale-[0.98] md:p-5"
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.color.replace('text-', 'bg-').replace('-400', '-500/10')}`}>
                  <Icon className={`h-4.5 w-4.5 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <p className="text-2xl font-bold text-th-text md:text-3xl">{stat.value}</p>
                {prev && <TrendIndicator current={stat.numericValue} previous={stat.prevValue} />}
              </div>
              <p className="mt-1 text-xs font-medium text-th-text-muted">{stat.label}</p>
            </Link>
          )
        })}
      </div>

      {/* Charts Row 1: Report Trend (2/3) + Violation Dist (1/3) */}
      {stats && (
        <>
          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ReportTrendChart data={stats.reportTrend} />
            </div>
            <div>
              <ViolationDistChart
                data={stats.violationDist}
                onClickItem={(category) => navigateToReports({ category })}
              />
            </div>
          </div>

          {/* Charts Row 2: Status Pipeline (1/2) + AI Performance (1/2) */}
          <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2">
            <StatusPipelineChart
              data={stats.statusPipeline}
              onClickItem={(status) => navigateToReports({ status })}
            />
            <AiPerformanceCard
              data={stats.aiPerformance}
              onClickDisagreement={() => navigateToReports({ disagreement: 'true' })}
            />
          </div>

          {/* Charts Row 3: Top Violations (full width) */}
          <TopViolationsChart
            data={stats.topViolations}
            onClickItem={(code) => navigateToReports({ violation_type: code })}
          />
        </>
      )}

      {/* Two column layout: Recent Reports + Active Campaigns */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Recent Reports */}
        <div className="rounded-xl border border-th-border bg-surface-card shadow-sm">
          <div className="flex items-center justify-between border-b border-th-border px-5 py-4">
            <h2 className="text-sm font-semibold text-th-text">{isAdmin ? t('dashboard.recentReports') : t('dashboard.myRecentReports' as Parameters<typeof t>[0])}</h2>
            <Link href="/reports" className="text-xs font-medium text-th-accent-text hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          </div>
          {recentReports.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-th-text-muted">
              {t('dashboard.noRecentReports')}
            </div>
          ) : (
            <div className="divide-y divide-th-border">
              {recentReports.map((report) => (
                <Link key={report.id} href={`/reports/${report.id}`}>
                  <div className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-th-bg-hover active:bg-th-bg-hover">
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
        <div className="rounded-xl border border-th-border bg-surface-card shadow-sm">
          <div className="flex items-center justify-between border-b border-th-border px-5 py-4">
            <h2 className="text-sm font-semibold text-th-text">{isAdmin ? t('dashboard.activeCampaignsList') : t('dashboard.myActiveCampaignsList' as Parameters<typeof t>[0])}</h2>
            <Link href="/campaigns" className="text-xs font-medium text-th-accent-text hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          </div>
          {activeCampaigns.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-th-text-muted">
              {t('dashboard.noActiveCampaigns')}
            </div>
          ) : (
            <div className="divide-y divide-th-border">
              {activeCampaigns.map((campaign) => (
                <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                  <div className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-th-bg-hover active:bg-th-bg-hover">
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
