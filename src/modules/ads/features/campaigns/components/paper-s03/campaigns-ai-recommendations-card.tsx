'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { RecommendationItem } from '@/modules/ads/features/optimization/types'

type CampaignsAiRecommendationsCardProps = {
  brandMarketId: string
  items: RecommendationItem[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  onRefreshSummaries?: () => Promise<void>
}

const formatRecLine = (r: RecommendationItem) => {
  const cur = r.current_bid != null ? `$${Number(r.current_bid).toFixed(2)}` : ''
  const sug = r.suggested_bid != null ? `$${Number(r.suggested_bid).toFixed(2)}` : ''
  if (r.recommendation_type === 'negate') {
    return `Neg "${r.keyword_text}" → ${r.reason.slice(0, 40)}${r.reason.length > 40 ? '…' : ''}`
  }
  if (r.recommendation_type === 'bid_adjust' || r.recommendation_type === 'promote') {
    return `Bid "${r.keyword_text}" ${cur} → ${sug}`
  }
  return `${r.recommendation_type}: ${r.keyword_text}`
}

const CampaignsAiRecommendationsCard = ({
  brandMarketId,
  items,
  isLoading,
  error,
  onRetry,
  onRefreshSummaries,
}: CampaignsAiRecommendationsCardProps) => {
  const [actionError, setActionError] = useState<string | null>(null)
  const pending = items.filter((i) => i.status === 'pending')
  const top = pending.slice(0, 3)

  const postAction = async (path: string, body?: Record<string, unknown>) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      throw new Error(j?.error?.message ?? `Request failed (${res.status})`)
    }
  }

  const handleApply = async (id: string) => {
    setActionError(null)
    try {
      await postAction(`/api/ads/recommendations/${id}/approve`, {})
      await onRefreshSummaries?.()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Apply failed')
    }
  }

  const handleSkip = async (id: string) => {
    setActionError(null)
    try {
      await postAction(`/api/ads/recommendations/${id}/skip`, { brand_market_id: brandMarketId })
      await onRefreshSummaries?.()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Skip failed')
    }
  }

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-lg border border-th-border bg-th-bg-hover" />
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50/90 p-3 dark:bg-red-950/30">
        <p className="text-sm font-medium text-red-700 dark:text-red-300">Unable to load AI recommendations</p>
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-th-bg-hover dark:text-red-200"
          >
            Retry
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-th-border bg-surface-card p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-th-text">AI Recommendations</h2>
        <span className="text-[11px] font-medium text-orange-600">{pending.length} pending</span>
      </div>
      <ul className="mt-3 space-y-2">
        {top.length === 0 ? (
          <li className="text-xs text-th-text-muted">No pending recommendations.</li>
        ) : (
          top.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-2 rounded-md border border-th-border bg-th-bg-hover/40 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="min-w-0 flex-1 text-xs text-th-text-secondary">{formatRecLine(r)}</p>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() => void handleApply(r.id)}
                  className="rounded-md bg-orange-500 px-2 py-1 text-[11px] font-medium text-white hover:bg-orange-600"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => void handleSkip(r.id)}
                  className="rounded-md border border-th-border bg-surface-card px-2 py-1 text-[11px] font-medium text-th-text-secondary hover:bg-th-bg-hover"
                >
                  Skip
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
      {actionError ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {actionError}
        </p>
      ) : null}
      <div className="mt-3 border-t border-th-border pt-2">
        <Link
          href="/ads/optimization/recommendations"
          className="text-xs font-medium text-orange-600 hover:text-orange-700"
        >
          View all in S11 →
        </Link>
      </div>
    </div>
  )
}

export { CampaignsAiRecommendationsCard }
