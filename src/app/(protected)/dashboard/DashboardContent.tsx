'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  FileText,
  Search,
  BarChart3,
  Plus,
  AlertTriangle,
  ChevronRight,
  Brain,
  Eye,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { isDemoMode } from '@/lib/demo'
import { getDemoDashboardStats } from '@/lib/demo/dashboard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ViolationBadge } from '@/components/ui/ViolationBadge'
import type { ViolationCode } from '@/constants/violations'
import type { DashboardStats, PeriodFilter } from '@/types/dashboard'

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
  initialStats: DashboardStats | null
  recentReports: RecentReport[]
  activeCampaigns: ActiveCampaign[]
}

const PERIODS: PeriodFilter[] = ['7d', '30d', '90d']

export const DashboardContent = ({
  userName,
  initialStats,
  recentReports,
  activeCampaigns,
}: DashboardContentProps) => {
  const { t } = useI18n()
  const router = useRouter()
  const [period, setPeriod] = useState<PeriodFilter>('30d')
  const [stats, setStats] = useState<DashboardStats | null>(initialStats)

  useEffect(() => {
    if (initialStats || isDemoMode()) return
    fetch('/api/dashboard/stats?period=30d')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setStats(data) })
      .catch(() => {})
  }, [initialStats])

  const navigateToReports = useCallback((params: Record<string, string>) => {
    const search = new URLSearchParams(params).toString()
    router.push(`/reports?${search}`)
  }, [router])

  const handlePeriodChange = useCallback(async (newPeriod: PeriodFilter) => {
    setPeriod(newPeriod)
    if (isDemoMode()) {
      setStats(getDemoDashboardStats(newPeriod))
      return
    }
    try {
      const res = await fetch(`/api/dashboard/stats?period=${newPeriod}`)
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch {
      // keep previous stats on error
    }
  }, [])

  const summary = stats?.summary

  const statItems = [
    {
      label: t('dashboard.activeCampaigns'),
      value: summary?.activeCampaigns ?? 0,
      icon: Search,
      color: 'text-blue-400',
      href: '/campaigns',
    },
    {
      label: t('dashboard.pendingReports'),
      value: summary?.pendingReports ?? 0,
      icon: AlertTriangle,
      color: 'text-amber-400',
      href: '/reports',
    },
    {
      label: t('dashboard.collectedListings'),
      value: summary?.totalListings ?? 0,
      icon: FileText,
      color: 'text-emerald-400',
      href: '/campaigns',
    },
    {
      label: t('dashboard.resolutionRate'),
      value: summary ? `${summary.resolvedRate}%` : '—',
      icon: BarChart3,
      color: 'text-violet-400',
      href: '/reports/completed',
    },
    {
      label: t('dashboard.charts.aiAccuracy' as Parameters<typeof t>[0]),
      value: summary ? `${summary.aiAccuracy}%` : '—',
      icon: Brain,
      color: 'text-cyan-400',
      href: '/reports',
    },
    {
      label: t('dashboard.charts.monitoring' as Parameters<typeof t>[0]),
      value: summary?.monitoringCount ?? 0,
      icon: Eye,
      color: 'text-orange-400',
      href: '/reports',
    },
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Greeting + Period Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-th-text-secondary md:text-base">
            {t('dashboard.greeting', { name: userName })}
          </p>
          {isDemoMode() && (
            <div className="mt-2 rounded-lg border border-st-warning-text/30 bg-st-warning-bg px-3 py-1.5">
              <p className="text-xs text-st-warning-text">{t('common.demoMode')}</p>
            </div>
          )}
        </div>
        <div className="flex gap-1 rounded-lg border border-th-border bg-surface-card p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-th-accent text-white'
                  : 'text-th-text-secondary hover:bg-th-bg-hover'
              }`}
            >
              {t(`dashboard.charts.period.${p}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid - 2x3 on mobile, 6 cols on desktop */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {statItems.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="rounded-lg border border-th-border bg-surface-card p-3 transition-colors hover:bg-th-bg-hover active:bg-th-bg-hover md:p-4"
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${stat.color}`} />
                <p className="text-xs font-medium text-th-text-tertiary">{stat.label}</p>
              </div>
              <p className="mt-1.5 text-xl font-bold text-th-text md:text-2xl">{stat.value}</p>
            </Link>
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
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
