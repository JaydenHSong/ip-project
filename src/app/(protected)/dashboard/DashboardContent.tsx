'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout'
import type { LayoutItem, ResponsiveLayouts, Layout } from 'react-grid-layout'
import { useI18n } from '@/lib/i18n/context'
import { isDemoMode } from '@/lib/demo'
import { getDemoDashboardStats } from '@/lib/demo/dashboard'
import { WelcomeNotice } from '@/components/features/WelcomeNotice'
import type { DashboardStats, PeriodFilter } from '@/types/dashboard'
import type { Role } from '@/types/users'
import { DashboardProvider } from './widgets/DashboardContext'
import { getAvailableWidgets, getDefaultLayouts } from './widgets/widget-config'
import type { UserDashboardLayout } from './widgets/widget-config'
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
  'system-status': SystemStatusWidget,
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

const LAYOUT_SAVE_DEBOUNCE = 1000

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
  const defaultLayouts = useMemo(() => getDefaultLayouts(userRole), [userRole])

  const [layouts, setLayouts] = useState<LayoutItem[]>(defaultLayouts)
  const [hiddenWidgetIds, setHiddenWidgetIds] = useState<string[]>([])
  const [layoutLoaded, setLayoutLoaded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { width: containerWidth, containerRef, mounted } = useContainerWidth({ initialWidth: 1200 })

  // Load saved layout
  useEffect(() => {
    const loadLayout = async () => {
      try {
        const res = await fetch('/api/user/preferences?key=dashboard_layout')
        if (res.ok) {
          const { value } = await res.json() as { value: UserDashboardLayout | null }
          if (value?.layouts) {
            const savedIds = new Set(value.layouts.map((l) => l.i))
            const merged: LayoutItem[] = [
              ...value.layouts,
              ...defaultLayouts.filter((dl) => !savedIds.has(dl.i)),
            ]
            setLayouts(merged)
            setHiddenWidgetIds(value.hidden ?? [])
          }
        }
      } catch {
        // use defaults
      } finally {
        setLayoutLoaded(true)
      }
    }
    loadLayout()
  }, [defaultLayouts])

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Save layout to server (debounced)
  const saveLayout = useCallback((newLayouts: LayoutItem[], newHidden: string[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/user/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'dashboard_layout',
            value: { layouts: newLayouts, hidden: newHidden },
          }),
        })
      } catch {
        // silent fail
      }
    }, LAYOUT_SAVE_DEBOUNCE)
  }, [])

  const handleLayoutChange = useCallback((currentLayout: Layout, allLayouts: ResponsiveLayouts) => {
    const lgLayout = (allLayouts.lg ?? currentLayout) as LayoutItem[]
    setLayouts(lgLayout)
    saveLayout(lgLayout, hiddenWidgetIds)
  }, [hiddenWidgetIds, saveLayout])

  const handleHideWidget = useCallback((widgetId: string) => {
    const newHidden = [...hiddenWidgetIds, widgetId]
    setHiddenWidgetIds(newHidden)
    saveLayout(layouts, newHidden)
  }, [hiddenWidgetIds, layouts, saveLayout])

  const handleAddWidget = useCallback((widgetId: string) => {
    const newHidden = hiddenWidgetIds.filter((id) => id !== widgetId)
    setHiddenWidgetIds(newHidden)
    saveLayout(layouts, newHidden)
  }, [hiddenWidgetIds, layouts, saveLayout])

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
    router.push(`/reports?${search}`)
  }, [router])

  const visibleWidgets = useMemo(
    () => availableWidgets.filter((w) => !hiddenWidgetIds.includes(w.id)),
    [availableWidgets, hiddenWidgetIds]
  )

  const hiddenWidgets = useMemo(
    () => availableWidgets.filter((w) => hiddenWidgetIds.includes(w.id)),
    [availableWidgets, hiddenWidgetIds]
  )

  const visibleLayouts = useMemo(
    () => layouts.filter((l) => visibleWidgets.some((w) => w.id === l.i)),
    [layouts, visibleWidgets]
  )

  const gridLayouts: ResponsiveLayouts = useMemo(() => ({
    lg: visibleLayouts,
    md: visibleLayouts,
    sm: visibleLayouts.map((l) => ({ ...l, w: 6, x: 0 })),
    xs: visibleLayouts.map((l) => ({ ...l, w: 1, x: 0 })),
  }), [visibleLayouts])

  if (!layoutLoaded) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-th-bg-secondary" />
        <div className="grid grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-th-bg-secondary" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-th-bg-secondary" />
      </div>
    )
  }

  return (
    <DashboardProvider
      userRole={userRole}
      initialStats={stats}
      onNavigateReports={navigateToReports}
    >
      <div className="space-y-6" ref={containerRef}>
        <WelcomeNotice userId={userId} />

        {/* Header: Greeting + Filters + Add Widget */}
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

        {/* Widget Grid */}
        {mounted && <ResponsiveGridLayout
          width={containerWidth}
          layouts={gridLayouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
          cols={{ lg: 12, md: 12, sm: 6, xs: 1 }}
          rowHeight={80}
          dragConfig={{ enabled: !isMobile, handle: '.drag-handle', bounded: false, threshold: 3 }}
          resizeConfig={{ enabled: !isMobile, handles: ['se'] }}
          onLayoutChange={handleLayoutChange}
          margin={[16, 16]}
        >
          {visibleWidgets.map((widget) => {
            const WidgetComponent = WIDGET_COMPONENTS[widget.id]
            if (!WidgetComponent) return null
            return (
              <div key={widget.id}>
                <WidgetWrapper
                  title={widget.title}
                  widgetId={widget.id}
                  onHide={handleHideWidget}
                >
                  <WidgetComponent />
                </WidgetWrapper>
              </div>
            )
          })}
        </ResponsiveGridLayout>}
      </div>
    </DashboardProvider>
  )
}
