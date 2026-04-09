// S08 — Auto Pilot Main Table
// Design Ref: §5.3 S08
'use client'

import { useState, useEffect, useRef } from 'react'
import { AdsStatusBadge } from '@/modules/ads/shared/components/status-badge'
import { ProgressBar } from '@/modules/ads/shared/components/progress-bar'
import { EmptyState } from '@/modules/ads/shared/components/empty-state'
import type { AutopilotCampaignItem } from '../types'

type AutopilotListProps = {
  campaigns: AutopilotCampaignItem[]
  isLoading?: boolean
  onRowClick: (id: string) => void
  onAction: (id: string, action: 'pause' | 'resume' | 'emergency_stop') => void
}

const AutopilotList = ({ campaigns, isLoading, onRowClick, onAction }: AutopilotListProps) => {
  // H5 fix: state-driven kebab menu (replaces CSS hover) for keyboard + a11y
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!openMenuId) return
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuId(null)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [openMenuId])

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg border border-th-border bg-th-bg-hover" />
        ))}
      </div>
    )
  }

  if (campaigns.length === 0) {
    return <EmptyState title="No Auto Pilot campaigns" description="Create an Auto Pilot campaign to get started." />
  }

  return (
    <div className="rounded-lg border border-th-border bg-surface-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-th-border">
            <th className="px-4 py-3 text-left text-xs font-medium text-th-text-muted">Campaign</th>
            <th className="px-3 py-3 text-center text-xs font-medium text-th-text-muted">Status</th>
            <th className="px-3 py-3 text-center text-xs font-medium text-th-text-muted">Confidence</th>
            <th className="px-3 py-3 text-right text-xs font-medium text-th-text-muted">Target ACoS</th>
            <th className="px-3 py-3 text-right text-xs font-medium text-th-text-muted">Weekly Budget</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-th-text-muted">Last Action</th>
            <th className="px-3 py-3 w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-th-border">
          {campaigns.map((c) => (
            <tr key={c.id} className="cursor-pointer hover:bg-th-bg-hover" onClick={() => onRowClick(c.id)}>
              <td className="px-4 py-3">
                <p className="font-medium text-th-text truncate max-w-[200px]">{c.name}</p>
                <p className="text-xs text-th-text-muted font-mono">{c.marketing_code}</p>
              </td>
              <td className="px-3 py-3 text-center">
                <AdsStatusBadge status={c.status} />
              </td>
              <td className="px-3 py-3">
                <div className="w-20 mx-auto">
                  <ProgressBar value={c.confidence_score ?? 0} showPercent size="sm" />
                </div>
              </td>
              <td className="px-3 py-3 text-right text-th-text-secondary">{c.target_acos ?? '-'}%</td>
              <td className="px-3 py-3 text-right text-th-text-secondary">${c.weekly_budget ?? 0}</td>
              <td className="px-3 py-3 text-xs text-th-text-muted">
                {c.last_action ? (
                  <div>
                    <span>{c.last_action}</span>
                    {c.last_action_at && (
                      <span className="ml-1 text-th-text-muted">
                        {new Date(c.last_action_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ) : '-'}
              </td>
              <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                {/* Kebab menu — Design S08 — H5 fix: state-driven, keyboard accessible */}
                <div className="relative" ref={openMenuId === c.id ? menuRef : undefined}>
                  <button
                    aria-haspopup="menu"
                    aria-expanded={openMenuId === c.id}
                    aria-label={`Actions for ${c.name}`}
                    onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}
                    className="rounded p-1 text-th-text-muted hover:bg-th-bg-hover hover:text-th-text-secondary focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    &#x22EE;
                  </button>
                  {openMenuId === c.id && (
                    <div role="menu" className="absolute right-0 top-7 z-10 w-36 rounded-md border border-th-border bg-surface-card py-1 shadow-lg">
                      {c.status === 'active' && (
                        <button
                          role="menuitem"
                          onClick={() => { onAction(c.id, 'pause'); setOpenMenuId(null) }}
                          className="w-full px-3 py-1.5 text-left text-xs text-th-text-secondary hover:bg-th-bg-hover focus:bg-th-bg-hover focus:outline-none"
                        >
                          Pause
                        </button>
                      )}
                      {c.status === 'paused' && (
                        <button
                          role="menuitem"
                          onClick={() => { onAction(c.id, 'resume'); setOpenMenuId(null) }}
                          className="w-full px-3 py-1.5 text-left text-xs text-th-text-secondary hover:bg-th-bg-hover focus:bg-th-bg-hover focus:outline-none"
                        >
                          Resume
                        </button>
                      )}
                      <button
                        role="menuitem"
                        onClick={() => { onAction(c.id, 'emergency_stop'); setOpenMenuId(null) }}
                        className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none"
                      >
                        Emergency Stop
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { AutopilotList }
