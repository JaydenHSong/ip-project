// /ads/dashboard → S01 CEO or S02 Director (역할별 자동 뷰 전환)
// Design Ref: §2.2, §5.3 S01/S02
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useMarketContext } from '@/modules/ads/shared/hooks/use-market-context'
import { CeoDashboard } from '@/modules/ads/features/dashboard/components/ceo-dashboard'
import { DirectorDashboard } from '@/modules/ads/features/dashboard/components/director-dashboard'
import type { CeoDashboardData } from '@/modules/ads/features/dashboard/types'
import type { DirectorDashboardData } from '@/modules/ads/features/dashboard/types'

type DashboardView = 'ceo' | 'director'

const AdsDashboardPage = () => {
  const { selectedMarketId } = useMarketContext()
  const [view, setView] = useState<DashboardView>('director')
  const [ceoData, setCeoData] = useState<CeoDashboardData | null>(null)
  const [directorData, setDirectorData] = useState<DirectorDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Detect user role to auto-select view
  useEffect(() => {
    const detectRole = async () => {
      try {
        const res = await fetch('/api/users/me')
        if (res.ok) {
          const json = await res.json() as { user: { role: string } }
          const role = json.user.role
          setUserRole(role)
          setView(role === 'owner' ? 'ceo' : 'director')
        }
      } catch {
        // Default to director view
      }
    }
    detectRole()
  }, [])

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      if (view === 'ceo') {
        const res = await fetch('/api/ads/dashboard/ceo')
        if (res.ok) {
          const json = await res.json() as { data: CeoDashboardData }
          setCeoData(json.data)
        }
      } else {
        const params = selectedMarketId ? `?brand_market_id=${selectedMarketId}` : ''
        const res = await fetch(`/api/ads/dashboard/director${params}`)
        if (res.ok) {
          const json = await res.json() as { data: DirectorDashboardData }
          setDirectorData(json.data)
        }
      }
    } catch {
      // API not ready — silent
    } finally {
      setIsLoading(false)
    }
  }, [view, selectedMarketId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-6 p-6">
      {/* Page header with view toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-th-text">AD Dashboard</h1>
          <p className="mt-0.5 text-sm text-th-text-muted">
            {view === 'ceo' ? 'Cross-brand performance overview' : 'Budget pacing & team performance'}
          </p>
        </div>

        {/* View toggle — only show if owner (can access both views) */}
        {userRole === 'owner' && (
          <div className="inline-flex rounded-md border border-th-border bg-surface-card">
            <button
              onClick={() => setView('ceo')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors rounded-l-md ${
                view === 'ceo' ? 'bg-th-text text-white' : 'text-th-text-muted hover:text-th-text-secondary'
              }`}
            >
              CEO View
            </button>
            <button
              onClick={() => setView('director')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors rounded-r-md ${
                view === 'director' ? 'bg-th-text text-white' : 'text-th-text-muted hover:text-th-text-secondary'
              }`}
            >
              Director View
            </button>
          </div>
        )}
      </div>

      {/* Dashboard content */}
      {view === 'ceo' ? (
        <CeoDashboard data={ceoData} isLoading={isLoading} />
      ) : (
        <DirectorDashboard data={directorData} isLoading={isLoading} />
      )}
    </div>
  )
}

export default AdsDashboardPage
