'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CampaignFilters, SortConfig } from '@/modules/ads/features/campaigns/components/campaign-table'
import type { CampaignKpiSummary, CampaignListItem } from '@/modules/ads/features/campaigns/types'
import type { RecommendationItem } from '@/modules/ads/features/optimization/types'
import { useAdsBudgetForCampaigns } from './use-ads-budget-for-campaigns'

type PageTab = 'campaigns' | 'budget_planning'

type Pagination = {
  page: number
  limit: number
  total: number
}

type MarketApiRow = {
  brand_market_id: string
  label: string
  brand_name: string
  marketplace: string
}

type MeUser = {
  name?: string | null
  email?: string | null
  role?: import('@/types/users').Role
}

type UseCampaignsPageDataParams = {
  selectedMarketId: string | null
  pageTab: PageTab
  currentYear: number
  filters: CampaignFilters
  sort: SortConfig
}

const getErrorMessage = (fallback: string, err: unknown) => {
  return err instanceof Error && err.message ? err.message : fallback
}

const parseFailedJsonMessage = async (res: Response, fallback: string) => {
  let detail = fallback
  try {
    const body = (await res.json()) as { error?: { message?: string } }
    if (body.error?.message) detail = body.error.message
  } catch {
    /* ignore */
  }
  return detail
}

const useCampaignsPageData = ({
  selectedMarketId,
  pageTab,
  currentYear,
  filters,
  sort,
}: UseCampaignsPageDataParams) => {
  const [markets, setMarkets] = useState<MarketApiRow[]>([])
  const [meUser, setMeUser] = useState<MeUser | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([])
  const [kpi, setKpi] = useState<CampaignKpiSummary | null>(null)
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [recLoading, setRecLoading] = useState(false)
  const [campaignsError, setCampaignsError] = useState<string | null>(null)
  const [recError, setRecError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0 })

  const {
    budgetData,
    budgetKpi,
    budgetOrgUnitId,
    setBudgetOrgUnitId,
    isBudgetLoading,
    budgetError,
    fetchBudget,
    handleBudgetSave,
  } = useAdsBudgetForCampaigns({
    selectedMarketId,
    pageTab,
    currentYear,
    includeTeamRollup: pageTab === 'budget_planning',
  })

  const fetchMarkets = useCallback(async () => {
    try {
      const res = await fetch('/api/ads/markets')
      if (!res.ok) return
      const json = await res.json() as { data: MarketApiRow[] }
      setMarkets(json.data ?? [])
    } catch {
      setMarkets([])
    }
  }, [])

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me')
      if (!res.ok) return
      const json = await res.json() as { user: MeUser }
      setMeUser(json.user ?? null)
    } catch {
      setMeUser(null)
    }
  }, [])

  useEffect(() => {
    void fetchMarkets()
    void fetchMe()
  }, [fetchMarkets, fetchMe])

  const fetchCampaigns = useCallback(async () => {
    if (!selectedMarketId) {
      setCampaigns([])
      setKpi(null)
      setCampaignsError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setCampaignsError(null)
    try {
      const params = new URLSearchParams({
        brand_market_id: selectedMarketId,
        include_kpi: 'true',
        page: String(pagination.page),
        limit: String(pagination.limit),
        sort_by: sort.key,
        sort_dir: sort.dir,
      })
      if (filters.status) params.set('status', filters.status)
      if (filters.mode) params.set('mode', filters.mode)
      if (filters.search) params.set('search', filters.search)

      const res = await fetch(`/api/ads/campaigns?${params}`)
      if (!res.ok) throw new Error('Failed to fetch campaigns')

      const json = await res.json() as {
        data: CampaignListItem[]
        pagination: Pagination
        kpi: CampaignKpiSummary | null
      }
      setCampaigns(json.data)
      setPagination(json.pagination)
      setKpi(json.kpi)
    } catch (err) {
      setCampaigns([])
      setKpi(null)
      setCampaignsError(getErrorMessage('Failed to load campaigns. Please try again.', err))
    } finally {
      setIsLoading(false)
    }
  }, [filters, pagination.page, pagination.limit, selectedMarketId, sort.dir, sort.key])

  const fetchRecommendations = useCallback(async () => {
    if (!selectedMarketId) {
      setRecommendations([])
      setRecError(null)
      setRecLoading(false)
      return
    }

    setRecLoading(true)
    setRecError(null)
    try {
      const res = await fetch(
        `/api/ads/recommendations?brand_market_id=${encodeURIComponent(selectedMarketId)}&status=pending`,
      )
      if (!res.ok) {
        throw new Error(await parseFailedJsonMessage(res, `Request failed (${res.status})`))
      }
      const json = await res.json() as { data: RecommendationItem[] }
      setRecommendations(json.data ?? [])
    } catch (err) {
      setRecommendations([])
      setRecError(getErrorMessage('Failed to load recommendations.', err))
    } finally {
      setRecLoading(false)
    }
  }, [selectedMarketId])

  useEffect(() => {
    void fetchCampaigns()
  }, [fetchCampaigns])

  useEffect(() => {
    if (pageTab === 'campaigns') {
      void fetchRecommendations()
    }
  }, [fetchRecommendations, pageTab])

  const marketLabel = useMemo(() => {
    const m = markets.find((x) => x.brand_market_id === selectedMarketId)
    return m?.label ?? null
  }, [markets, selectedMarketId])

  const marketplace = useMemo(() => {
    const m = markets.find((x) => x.brand_market_id === selectedMarketId)
    return m?.marketplace ?? null
  }, [markets, selectedMarketId])

  const userDisplayName = useMemo(() => {
    if (!meUser) return null
    const n = meUser.name?.trim()
    if (n) return n
    return meUser.email?.split('@')[0] ?? null
  }, [meUser])

  const userRole = meUser?.role ?? null

  return {
    campaigns,
    kpi,
    marketLabel,
    marketplace,
    userDisplayName,
    userRole,
    recommendations,
    budgetData,
    budgetKpi,
    budgetOrgUnitId,
    setBudgetOrgUnitId,
    isLoading,
    recLoading,
    isBudgetLoading,
    budgetError,
    fetchBudget,
    campaignsError,
    recError,
    pagination,
    setPagination,
    fetchCampaigns,
    fetchRecommendations,
    handleBudgetSave,
  }
}

export { useCampaignsPageData }
