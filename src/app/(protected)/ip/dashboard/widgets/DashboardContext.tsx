'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { DashboardStats, PeriodFilter } from '@/types/dashboard'
import type { Role } from '@/types/users'
import { isDemoMode } from '@/lib/demo'
import { getDemoDashboardStats } from '@/lib/demo/dashboard'

type DashboardContextValue = {
  stats: DashboardStats | null
  period: PeriodFilter
  marketplace: string
  scope: 'all' | 'my'
  userRole: Role
  isAdmin: boolean
  loading: boolean
  setPeriod: (p: PeriodFilter) => void
  setMarketplace: (mp: string) => void
  navigateToReports: (params: Record<string, string>) => void
}

const DashboardCtx = createContext<DashboardContextValue | null>(null)

export const useDashboardContext = (): DashboardContextValue => {
  const ctx = useContext(DashboardCtx)
  if (!ctx) throw new Error('useDashboardContext must be used within DashboardProvider')
  return ctx
}

type DashboardProviderProps = {
  userRole: Role
  initialStats: DashboardStats | null
  onNavigateReports: (params: Record<string, string>) => void
  children: React.ReactNode
}

export const DashboardProvider = ({
  userRole,
  initialStats,
  onNavigateReports,
  children,
}: DashboardProviderProps) => {
  const isAdmin = userRole === 'owner' || userRole === 'admin'
  const scope = isAdmin ? 'all' : 'my'
  const [period, setPeriodState] = useState<PeriodFilter>('30d')
  const [marketplace, setMarketplaceState] = useState('')
  const [stats, setStats] = useState<DashboardStats | null>(initialStats)
  const [loading, setLoading] = useState(false)

  const buildUrl = useCallback((p: PeriodFilter, mp: string): string => {
    const params = new URLSearchParams({ period: p, scope })
    if (mp) params.set('marketplace', mp)
    return `/api/dashboard/stats?${params.toString()}`
  }, [scope])

  const fetchStats = useCallback(async (p: PeriodFilter, mp: string) => {
    if (isDemoMode()) {
      setStats(getDemoDashboardStats(p))
      return
    }
    setLoading(true)
    try {
      const res = await fetch(buildUrl(p, mp))
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch {
      // keep previous stats
    } finally {
      setLoading(false)
    }
  }, [buildUrl])

  useEffect(() => {
    if (initialStats || isDemoMode()) return
    fetchStats('30d', '')
  }, [initialStats, fetchStats])

  const setPeriod = useCallback((p: PeriodFilter) => {
    setPeriodState(p)
    fetchStats(p, marketplace)
  }, [marketplace, fetchStats])

  const setMarketplace = useCallback((mp: string) => {
    setMarketplaceState(mp)
    fetchStats(period, mp)
  }, [period, fetchStats])

  return (
    <DashboardCtx.Provider
      value={{
        stats,
        period,
        marketplace,
        scope,
        userRole,
        isAdmin,
        loading,
        setPeriod,
        setMarketplace,
        navigateToReports: onNavigateReports,
      }}
    >
      {children}
    </DashboardCtx.Provider>
  )
}
