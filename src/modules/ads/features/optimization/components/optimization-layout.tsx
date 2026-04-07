// Optimization — Shared Layout (Campaign Selector + Sub-tabs)
// Design Ref: §5.3 S04 "Campaign Selector + Sub-tabs: Bidding/Budget/Keywords/Dayparting"
'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'

type OptimizationTab = 'bidding' | 'budget' | 'keywords' | 'dayparting'

type OptimizationLayoutProps = {
  activeTab: OptimizationTab
  onTabChange: (tab: OptimizationTab) => void
  campaignId: string | null
  campaignName: string | null
  children: ReactNode
}

const TABS: { key: OptimizationTab; label: string }[] = [
  { key: 'bidding', label: 'Bidding' },
  { key: 'budget', label: 'Budget' },
  { key: 'keywords', label: 'Keywords' },
  { key: 'dayparting', label: 'Dayparting' },
]

const OptimizationLayout = ({
  activeTab,
  onTabChange,
  campaignId,
  campaignName,
  children,
}: OptimizationLayoutProps) => {
  return (
    <div className="space-y-4">
      {/* Campaign Context Bar */}
      {campaignId && (
        <div className="flex items-center gap-3 rounded-lg border border-th-border bg-surface-card px-4 py-2.5">
          <span className="text-xs text-th-text-muted">Campaign:</span>
          <span className="text-sm font-medium text-th-text">{campaignName ?? campaignId}</span>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex border-b border-th-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-th-text-muted hover:text-th-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {children}
    </div>
  )
}

export { OptimizationLayout }
export type { OptimizationTab }
