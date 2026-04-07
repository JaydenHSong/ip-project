// AI Review Card — Weekly Claude review results
// Design Ref: §3.9 — AI 주간 전략 리뷰 표시
'use client'

import { useState, useEffect } from 'react'
import type { AiReviewEntry } from '../types'

type AiReviewCardProps = {
  profileId: string
}

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
}

const TYPE_LABEL: Record<string, string> = {
  goal_mode_change: 'Goal Mode',
  bid_strategy: 'Bid Strategy',
  keyword_insight: 'Keywords',
  budget_realloc: 'Budget',
}

const AiReviewCard = ({ profileId }: AiReviewCardProps) => {
  const [reviews, setReviews] = useState<AiReviewEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch(`/api/ads/autopilot/ai-reviews?profile_id=${profileId}&limit=3`)
        if (res.ok) {
          const json = await res.json() as { data: AiReviewEntry[] }
          setReviews(json.data)
        }
      } catch { /* silent */ }
      finally { setIsLoading(false) }
    }
    fetchReviews()
  }, [profileId])

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="h-6 w-32 animate-pulse rounded bg-gray-100" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-gray-50" />
          ))}
        </div>
      </div>
    )
  }

  if (!reviews.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">AI Weekly Review</h3>
        <p className="mt-3 text-sm text-gray-400">No reviews yet. First review runs Monday 8AM UTC.</p>
      </div>
    )
  }

  const latest = reviews[0]

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">AI Weekly Review</h3>
        <span className="text-xs text-gray-400">
          {latest.review_period_start} ~ {latest.review_period_end}
        </span>
      </div>

      {latest.portfolio_summary && (
        <p className="mt-2 text-sm text-gray-700">{latest.portfolio_summary}</p>
      )}

      <div className="mt-3 space-y-2">
        {latest.recommendations.slice(0, 5).map((rec, i) => (
          <div key={i} className="flex items-start gap-2 rounded-md bg-gray-50 p-2.5">
            <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_BADGE[rec.priority] ?? PRIORITY_BADGE.low}`}>
              {rec.priority}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-700">
                  {TYPE_LABEL[rec.recommendation_type] ?? rec.recommendation_type}
                </span>
                <span className="text-[10px] text-gray-400">
                  {rec.current_value} → {rec.suggested_value}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{rec.reasoning}</p>
            </div>
            <span className="shrink-0 text-[10px] font-mono text-gray-400">
              {Math.round(rec.confidence * 100)}%
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
        <span>{latest.model_used} · {latest.tokens_used.toLocaleString()} tokens</span>
        <span>{new Date(latest.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  )
}

export { AiReviewCard }
