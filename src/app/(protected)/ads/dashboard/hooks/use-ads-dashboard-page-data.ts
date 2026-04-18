'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CeoDashboardData, DirectorDashboardData } from '@/modules/ads/features/dashboard/types'

type DashboardView = 'ceo' | 'director'

const parseFetchError = async (res: Response, fallback: string) => {
  try {
    const body = (await res.json()) as { error?: { message?: string } }
    const msg = body.error?.message
    return msg && msg.length > 0 ? msg : fallback
  } catch {
    return fallback
  }
}

type UseAdsDashboardPageDataParams = {
  selectedMarketId: string | null
}

const useAdsDashboardPageData = ({ selectedMarketId }: UseAdsDashboardPageDataParams) => {
  const [view, setView] = useState<DashboardView>('director')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [ceoData, setCeoData] = useState<CeoDashboardData | null>(null)
  const [directorData, setDirectorData] = useState<DirectorDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const fetchGenerationRef = useRef(0)

  useEffect(() => {
    const detectRole = async () => {
      try {
        const res = await fetch('/api/users/me')
        if (!res.ok) return
        const json = (await res.json()) as { user: { role: string } }
        const role = json.user.role
        setUserRole(role)
        setView(role === 'owner' ? 'ceo' : 'director')
      } catch {
        // Default: director view + null role (no CEO toggle)
      }
    }
    void detectRole()
  }, [])

  useEffect(() => {
    if (userRole != null && userRole !== 'owner') {
      setView((v) => (v === 'ceo' ? 'director' : v))
    }
  }, [userRole])

  const setDashboardView = useCallback((next: DashboardView) => {
    if (next === 'ceo' && userRole != null && userRole !== 'owner') return
    setView(next)
  }, [userRole])

  const fetchData = useCallback(async () => {
    const gen = ++fetchGenerationRef.current
    setIsLoading(true)
    setDashboardError(null)
    const currentView = view
    try {
      if (currentView === 'ceo') {
        const res = await fetch('/api/ads/dashboard/ceo')
        if (gen !== fetchGenerationRef.current) return
        if (!res.ok) {
          setCeoData(null)
          setDashboardError(await parseFetchError(res, 'Failed to load CEO dashboard'))
          return
        }
        const json = (await res.json()) as { data: CeoDashboardData }
        if (gen !== fetchGenerationRef.current) return
        setCeoData(json.data)
      } else {
        const params = selectedMarketId ? `?brand_market_id=${selectedMarketId}` : ''
        const res = await fetch(`/api/ads/dashboard/director${params}`)
        if (gen !== fetchGenerationRef.current) return
        if (!res.ok) {
          setDirectorData(null)
          setDashboardError(await parseFetchError(res, 'Failed to load Director dashboard'))
          return
        }
        const json = (await res.json()) as { data: DirectorDashboardData }
        if (gen !== fetchGenerationRef.current) return
        setDirectorData(json.data)
      }
    } catch (err) {
      if (gen !== fetchGenerationRef.current) return
      const message = err instanceof Error && err.message ? err.message : 'Failed to load dashboard'
      setDashboardError(message)
      if (currentView === 'ceo') setCeoData(null)
      else setDirectorData(null)
    } finally {
      if (gen === fetchGenerationRef.current) setIsLoading(false)
    }
  }, [view, selectedMarketId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return {
    view,
    setView: setDashboardView,
    userRole,
    ceoData,
    directorData,
    isLoading,
    dashboardError,
    refetchDashboard: fetchData,
  }
}

export { useAdsDashboardPageData }
