'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/context'
import { isDemoMode } from '@/lib/demo'
import { getDemoDashboardStats } from '@/lib/demo/dashboard'
import { WelcomeNotice } from '@/components/features/WelcomeNotice'
import type { DashboardStats, PeriodFilter } from '@/types/dashboard'
import type { Role } from '@/types/users'
import { DashboardProvider } from './widgets/DashboardContext'
import { getAvailableWidgets, getDefaultOrder } from './widgets/widget-config'
import type { UserDashboardLayout, WidgetSize } from './widgets/widget-config'
import { WidgetWrapper } from './widgets/WidgetWrapper'
import { AddWidgetPanel } from './widgets/AddWidgetPanel'
import { StatsWidget } from './widgets/StatsWidget'
import { ReportTrendWidget } from './widgets/ReportTrendWidget'
import { ViolationDistWidget } from './widgets/ViolationDistWidget'
import { StatusPipelineWidget } from './widgets/StatusPipelineWidget'
import { AiPerformanceWidget } from './widgets/AiPerformanceWidget'
import { TopViolationsWidget } from './widgets/TopViolationsWidget'
import { RecentReportsWidget } from './widgets/RecentReportsWidget'
import { ActiveCampaignsWidget } from './widgets/ActiveCampaignsWidget'
import { AiAccuracyWidget } from './widgets/AiAccuracyWidget'
import { SystemStatusWidget } from './widgets/SystemStatusWidget'

const WIDGET_COMPONENTS: Record<string, React.ComponentType> = {
  'stats': StatsWidget,
  'report-trend': ReportTrendWidget,
  'violation-dist': ViolationDistWidget,
  'status-pipeline': StatusPipelineWidget,
  'ai-performance': AiPerformanceWidget,
  'top-violations': TopViolationsWidget,
  'recent-reports': RecentReportsWidget,
  'active-campaigns': ActiveCampaignsWidget,
  'ai-accuracy': AiAccuracyWidget,
  'system-status': SystemStatusWidget,
}

const SIZE_CLASS: Record<WidgetSize, string> = {
  full: 'col-span-full',
  medium: 'col-span-1',
  standard: 'col-span-1',
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

type DashboardContentProps = {
  userName: string
  userId: string
  userRole: Role
  initialStats: DashboardStats | null
}

const SAVE_DEBOUNCE = 1000

export const DashboardContent = ({
  userName,
  userId,
  userRole,
  initialStats,
}: DashboardContentProps) => {
  const { t } = useI18n()
  const router = useRouter()

  const [period, setPeriod] = useState<PeriodFilter>('30d')
  const [marketplace, setMarketplace] = useState('')
  const [stats, setStats] = useState<DashboardStats | null>(initialStats)
  const isAdmin = userRole === 'owner' || userRole === 'admin'
  const scope = isAdmin ? 'all' : 'my'

  const availableWidgets = useMemo(() => getAvailableWidgets(userRole), [userRole])
  const defaultOrder = useMemo(() => getDefaultOrder(userRole), [userRole])

  const [widgetOrder, setWidgetOrder] = useState<string[]>(defaultOrder)
  const [hiddenWidgetIds, setHiddenWidgetIds] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load saved preferences
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/user/preferences?key=dashboard_layout')
        if (res.ok) {
          const { value } = await res.json() as { value: UserDashboardLayout | null }
          if (value) {
            if (value.order?.length) {
              // Merge: saved order + any new widgets not in saved order
              const savedSet = new Set(value.order)
              const merged = [
                ...value.order.filter((id) => availableWidgets.some((w) => w.id === id)),
                ...defaultOrder.filter((id) => !savedSet.has(id)),
              ]
              setWidgetOrder(merged)
            }
            setHiddenWidgetIds(value.hidden ?? [])
          }
        }
      } catch {
        // use defaults
      } finally {
        setLoaded(true)
      }
    }
    load()
  }, [availableWidgets, defaultOrder])

  // Save preferences (debounced)
  const savePrefs = useCallback((order: string[], hidden: string[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/user/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'dashboard_layout',
            value: { order, hidden } satisfies UserDashboardLayout,
          }),
        })
      } catch {
        // silent
      }
    }, SAVE_DEBOUNCE)
  }, [])

  const handleHideWidget = useCallback((widgetId: string) => {
    const newHidden = [...hiddenWidgetIds, widgetId]
    setHiddenWidgetIds(newHidden)
    savePrefs(widgetOrder, newHidden)
  }, [hiddenWidgetIds, widgetOrder, savePrefs])

  const handleAddWidget = useCallback((widgetId: string) => {
    const newHidden = hiddenWidgetIds.filter((id) => id !== widgetId)
    setHiddenWidgetIds(newHidden)
    savePrefs(widgetOrder, newHidden)
  }, [hiddenWidgetIds, widgetOrder, savePrefs])

  // Stats fetching
  const buildUrl = useCallback((p: PeriodFilter, mp: string): string => {
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
      // keep previous
    }
  }, [buildUrl])

  const handlePeriodChange = useCallback((newPeriod: PeriodFilter) => {
    setPeriod(newPeriod)
    fetchStats(newPeriod, marketplace)
  }, [marketplace, fetchStats])

  const handleMarketplaceChange = useCallback((mp: string) => {
    setMarketplace(mp)
    fetchStats(period, mp)
  }, [period, fetchStats])

  const navigateToReports = useCallback((params: Record<string, string>) => {
    const search = new URLSearchParams(params).toString()
    router.push(`/ip/reports?${search}`)
  }, [router])

  // Build widget map for quick lookup
  const widgetMap = useMemo(() => {
    const map = new Map(availableWidgets.map((w) => [w.id, w]))
    return map
  }, [availableWidgets])

  const visibleWidgets = useMemo(
    () => widgetOrder
      .filter((id) => !hiddenWidgetIds.includes(id) && widgetMap.has(id))
      .map((id) => widgetMap.get(id)!),
    [widgetOrder, hiddenWidgetIds, widgetMap]
  )

  const hiddenWidgets = useMemo(
    () => availableWidgets.filter((w) => hiddenWidgetIds.includes(w.id)),
    [availableWidgets, hiddenWidgetIds]
  )

  if (!loaded) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-th-bg-secondary" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-th-bg-secondary" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <DashboardProvider
      userRole={userRole}
      initialStats={stats}
      onNavigateReports={navigateToReports}
    >
      <div className="space-y-6">
        <WelcomeNotice userId={userId} />

        {/* Header */}
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
          <div className="flex items-center gap-2">
            <AddWidgetPanel hiddenWidgets={hiddenWidgets} onAdd={handleAddWidget} />
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
                  className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-all duration-200 ${
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

        {/* Masonry Widget Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleWidgets.map((widget) => {
            const WidgetComponent = WIDGET_COMPONENTS[widget.id]
            if (!WidgetComponent) return null
            return (
              <div key={widget.id} className={SIZE_CLASS[widget.size]}>
                <WidgetWrapper
                  title={widget.title}
                  widgetId={widget.id}
                  size={widget.size}
                  onHide={handleHideWidget}
                >
                  <WidgetComponent />
                </WidgetWrapper>
              </div>
            )
          })}
        </div>
      </div>
    </DashboardProvider>
  )
}
