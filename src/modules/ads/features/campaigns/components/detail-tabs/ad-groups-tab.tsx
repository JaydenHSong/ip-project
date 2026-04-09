'use client'

import { useState, useEffect } from 'react'
import type { CampaignDetail } from '../../types'

type AdGroupRow = { id: string; name: string; default_bid: number | null; state: string | null; keyword_count: number }

export const AdGroupsTab = ({ campaign }: { campaign: CampaignDetail }) => {
  const [adGroups, setAdGroups] = useState<AdGroupRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAdGroups = async () => {
      try {
        const res = await fetch(`/api/ads/keywords?campaign_id=${campaign.id}&limit=0`)
        if (res.ok) {
          const json = await res.json() as { data: { ad_group_id: string }[] }
          const counts = new Map<string, number>()
          for (const kw of json.data ?? []) {
            counts.set(kw.ad_group_id, (counts.get(kw.ad_group_id) ?? 0) + 1)
          }
          setAdGroups([{
            id: 'default',
            name: `${campaign.name} - Default`,
            default_bid: campaign.max_bid_cap,
            state: 'enabled',
            keyword_count: campaign.keywords_count ?? 0,
          }])
        }
      } catch { /* silent */ }
      finally { setIsLoading(false) }
    }
    fetchAdGroups()
  }, [campaign.id, campaign.name, campaign.max_bid_cap, campaign.keywords_count])

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-th-bg-hover" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded border border-th-border bg-th-bg-hover p-3">
          <p className="text-xs text-th-text-muted">Ad Groups</p>
          <p className="text-lg font-semibold text-th-text">{campaign.ad_groups_count ?? adGroups.length}</p>
        </div>
        <div className="rounded border border-th-border bg-th-bg-hover p-3">
          <p className="text-xs text-th-text-muted">Keywords</p>
          <p className="text-lg font-semibold text-th-text">{campaign.keywords_count ?? 0}</p>
        </div>
      </div>

      <div className="rounded-lg border border-th-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-th-border">
              <th className="px-3 py-2 text-left text-th-text-muted font-medium">Ad Group</th>
              <th className="px-3 py-2 text-right text-th-text-muted font-medium">Default Bid</th>
              <th className="px-3 py-2 text-center text-th-text-muted font-medium">State</th>
              <th className="px-3 py-2 text-right text-th-text-muted font-medium">Keywords</th>
            </tr>
          </thead>
          <tbody>
            {adGroups.map((ag) => (
              <tr key={ag.id} className="border-b border-th-border">
                <td className="px-3 py-2 font-medium text-th-text-secondary">{ag.name}</td>
                <td className="px-3 py-2 text-right font-mono text-th-text-secondary">
                  {ag.default_bid ? `$${ag.default_bid.toFixed(2)}` : '-'}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    ag.state === 'enabled' ? 'bg-emerald-50 text-emerald-700' : 'bg-th-bg-tertiary text-th-text-muted'
                  }`}>
                    {ag.state ?? 'unknown'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-th-text-secondary">{ag.keyword_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
