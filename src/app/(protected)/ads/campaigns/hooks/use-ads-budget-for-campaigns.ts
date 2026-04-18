'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BudgetEntry, BudgetKpiData, BudgetListResponse } from '@/modules/ads/features/budget-planning/types'

type PageTab = 'campaigns' | 'budget_planning'

type UseAdsBudgetForCampaignsParams = {
  selectedMarketId: string | null
  pageTab: PageTab
  currentYear: number
  /** When true, GET includes rollup=teams for director multi-team summary. */
  includeTeamRollup: boolean
}

const parseBudgetError = async (res: Response) => {
  try {
    const body = (await res.json()) as { error?: { message?: string } }
    const msg = body.error?.message
    if (msg && msg.length > 0) return msg
  } catch {
    /* ignore */
  }
  return `Request failed (${res.status})`
}

const useAdsBudgetForCampaigns = ({
  selectedMarketId,
  pageTab,
  currentYear,
  includeTeamRollup,
}: UseAdsBudgetForCampaignsParams) => {
  const [budgetData, setBudgetData] = useState<BudgetListResponse['data'] | null>(null)
  const [budgetOrgUnitId, setBudgetOrgUnitId] = useState<string | null>(null)
  const [isBudgetLoading, setIsBudgetLoading] = useState(false)
  const [budgetError, setBudgetError] = useState<string | null>(null)

  useEffect(() => {
    setBudgetOrgUnitId(null)
  }, [selectedMarketId])

  const fetchBudget = useCallback(async () => {
    if (!selectedMarketId) {
      setBudgetData(null)
      setBudgetError(null)
      setIsBudgetLoading(false)
      return
    }

    setIsBudgetLoading(true)
    setBudgetError(null)
    try {
      const params = new URLSearchParams({
        brand_market_id: selectedMarketId,
        year: String(currentYear),
      })
      if (budgetOrgUnitId) params.set('org_unit_id', budgetOrgUnitId)
      if (includeTeamRollup) params.set('rollup', 'teams')

      const res = await fetch(`/api/ads/budgets?${params}`)
      if (res.ok) {
        const json = (await res.json()) as BudgetListResponse
        setBudgetData(json.data)
        setBudgetError(null)
      } else {
        setBudgetData(null)
        setBudgetError(await parseBudgetError(res))
      }
    } catch {
      setBudgetData(null)
      setBudgetError('예산을 불러오지 못했습니다. 네트워크를 확인해 주세요.')
    } finally {
      setIsBudgetLoading(false)
    }
  }, [budgetOrgUnitId, currentYear, includeTeamRollup, selectedMarketId])

  const handleBudgetSave = useCallback(
    async (entries: BudgetEntry[]) => {
      if (!selectedMarketId || !budgetData) return
      const res = await fetch('/api/ads/budgets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_market_id: selectedMarketId,
          year: currentYear,
          org_unit_id: budgetData.org_unit_id,
          entries,
        }),
      })
      if (res.ok) await fetchBudget()
    },
    [budgetData, currentYear, fetchBudget, selectedMarketId],
  )

  useEffect(() => {
    if (!selectedMarketId) return
    if (pageTab === 'campaigns' || pageTab === 'budget_planning') {
      void fetchBudget()
    }
  }, [fetchBudget, pageTab, selectedMarketId])

  const budgetKpi = useMemo<BudgetKpiData | null>(() => {
    if (!budgetData) return null
    return {
      annual_planned: budgetData.plan_total.annual_total,
      ytd_spent: budgetData.ytd.spent,
      ytd_spent_market: budgetData.ytd.spent_market,
      ytd_planned: budgetData.ytd.planned,
      remaining: budgetData.ytd.remaining,
    }
  }, [budgetData])

  return {
    budgetData,
    budgetKpi,
    budgetOrgUnitId,
    setBudgetOrgUnitId,
    isBudgetLoading,
    budgetError,
    fetchBudget,
    handleBudgetSave,
  }
}

export { useAdsBudgetForCampaigns }
