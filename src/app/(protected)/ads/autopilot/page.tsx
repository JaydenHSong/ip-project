// /ads/autopilot → S08 Auto Pilot Main
// Design Ref: §2.2 — Track C
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useMarketContext } from '@/modules/ads/shared/hooks/use-market-context'
import { KpiCard } from '@/modules/ads/shared/components/kpi-card'
import { AutopilotList } from '@/modules/ads/features/autopilot/components/autopilot-list'
import { CampaignCreateModal } from '@/modules/ads/features/campaigns/components/campaign-create-modal'
import type { AutopilotCampaignItem, AutopilotKpi } from '@/modules/ads/features/autopilot/types'
import type { CreateCampaignRequest } from '@/modules/ads/features/campaigns/types'

const AdsAutopilotPage = () => {
  const router = useRouter()
  const { selectedMarketId } = useMarketContext()
  const [campaigns, setCampaigns] = useState<AutopilotCampaignItem[]>([])
  const [kpi, setKpi] = useState<AutopilotKpi | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // M4 fix: open create modal in autopilot mode in-page
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const fetchData = useCallback(async () => {
    if (!selectedMarketId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/ads/autopilot?brand_market_id=${selectedMarketId}`)
      if (res.ok) {
        const json = await res.json() as { data: { campaigns: AutopilotCampaignItem[]; kpi: AutopilotKpi } }
        setCampaigns(json.data.campaigns)
        setKpi(json.data.kpi)
      }
    } catch (err) {
      // L1 fix: log fetch failures
      console.error('[ads/autopilot] fetch failed', err)
    }
    finally { setIsLoading(false) }
  }, [selectedMarketId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAction = async (id: string, action: 'pause' | 'resume' | 'emergency_stop') => {
    const status = action === 'pause' || action === 'emergency_stop' ? 'paused' : 'active'
    await fetch(`/api/ads/campaigns/${id}`, {
      // L3 fix: PATCH is the RESTful verb for partial updates
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await fetchData()
  }

  const handleCreateSubmit = async (data: CreateCampaignRequest) => {
    const res = await fetch('/api/ads/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json() as { error: { message: string } }
      throw new Error(err.error.message)
    }
    await fetchData()
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-th-text">Auto Pilot</h1>
          <p className="mt-0.5 text-sm text-th-text-muted">AI-managed campaigns with full automation.</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="rounded-md bg-orange-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
        >
          + New Auto Pilot Campaign
        </button>
      </div>

      {/* KPI Strip 4 cards — Design S08 */}
      {kpi && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Active" value={kpi.active_count} suffix={` / ${kpi.active_count + kpi.learning_count + kpi.paused_count}`} />
          <KpiCard label="Weekly Budget" value={`$${kpi.total_weekly_budget.toLocaleString()}`} />
          <KpiCard label="Avg ACoS" value={kpi.avg_acos != null ? `${kpi.avg_acos.toFixed(1)}%` : '-'} />
          <KpiCard label="AI Actions (7d)" value={kpi.ai_actions_7d} />
        </div>
      )}

      {/* Context Bar — Design S08 */}
      {kpi && (
        <div className="flex items-center gap-4 rounded-lg border border-th-border bg-th-bg-hover px-4 py-2">
          <span className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Running {kpi.active_count}
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            Learning {kpi.learning_count}
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            Paused {kpi.paused_count}
          </span>
        </div>
      )}

      {/* Campaign Table — Design S08 */}
      <AutopilotList
        campaigns={campaigns}
        isLoading={isLoading}
        onRowClick={(id) => router.push(`/ads/autopilot/${id}`)}
        onAction={handleAction}
      />

      {/* M4 fix: open create modal in autopilot mode */}
      <CampaignCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        defaultMode="autopilot"
      />
    </div>
  )
}

export default AdsAutopilotPage
