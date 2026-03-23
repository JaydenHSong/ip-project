'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { isDemoMode } from '@/lib/demo'
import { DEMO_CAMPAIGNS } from '@/lib/demo/data'
import { useDashboardContext } from './DashboardContext'

type ActiveCampaign = {
  id: string
  keyword: string
  marketplace: string
  frequency: string
}

export const ActiveCampaignsWidget = () => {
  const { t } = useI18n()
  const { isAdmin, scope } = useDashboardContext()
  const [campaigns, setCampaigns] = useState<ActiveCampaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemoMode()) {
      setCampaigns(
        DEMO_CAMPAIGNS.filter((c) => c.status === 'active').map((c) => ({
          id: c.id,
          keyword: c.keyword,
          marketplace: c.marketplace,
          frequency: c.frequency,
        }))
      )
      setLoading(false)
      return
    }

    const fetchCampaigns = async () => {
      try {
        const params = new URLSearchParams({ limit: '10', scope })
        const res = await fetch(`/api/dashboard/active-campaigns?${params}`)
        if (res.ok) {
          const data = await res.json()
          setCampaigns(data)
        }
      } catch {
        // keep empty
      } finally {
        setLoading(false)
      }
    }
    fetchCampaigns()
  }, [scope])

  if (loading) {
    return <div className="h-[200px] animate-pulse rounded-lg bg-th-bg-secondary" />
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-th-text">
          {isAdmin ? t('dashboard.activeCampaignsList') : t('dashboard.myActiveCampaignsList' as Parameters<typeof t>[0])}
        </h3>
        <Link href="/ip/campaigns" className="text-xs font-medium text-th-accent-text hover:underline">
          {t('dashboard.viewAll')}
        </Link>
      </div>
      {campaigns.length === 0 ? (
        <div className="py-10 text-center text-sm text-th-text-muted">
          {t('dashboard.noActiveCampaigns')}
        </div>
      ) : (
        <div className="divide-y divide-th-border rounded-lg border border-th-border">
          {campaigns.map((campaign) => (
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
  )
}
