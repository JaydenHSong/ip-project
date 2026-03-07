'use client'

import { useState, useEffect } from 'react'
import { useDashboardContext } from './DashboardContext'
import { VIOLATION_TYPES } from '@/constants/violations'
import type { ViolationCode } from '@/constants/violations'

type ViolationStat = {
  accuracy: number
  total: number
  correct: number
  common_misclass: string | null
}

type ConfidenceBucket = {
  range: string
  accuracy: number
  count: number
}

type TopError = {
  predicted: string
  actual: string
  count: number
}

type AccuracyData = {
  overall_accuracy: number
  total_analyzed: number
  total_confirmed: number
  by_violation_type: Record<string, ViolationStat>
  confidence_calibration: ConfidenceBucket[]
  top_errors: TopError[]
}

export const AiAccuracyWidget = () => {
  const { period } = useDashboardContext()
  const [data, setData] = useState<AccuracyData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/ai/accuracy?period=${period}`)
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [period])

  if (loading) {
    return <div className="h-[320px] animate-pulse rounded-lg bg-th-bg-secondary" />
  }

  if (!data || data.total_confirmed === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-th-text-muted">
        No confirmed data available
      </div>
    )
  }

  const accuracyColor = data.overall_accuracy >= 85
    ? 'text-st-success-text'
    : data.overall_accuracy >= 70
      ? 'text-st-warning-text'
      : 'text-st-danger-text'

  // Sort violation types by total (desc) and take top 6
  const sortedTypes = Object.entries(data.by_violation_type)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 6)

  return (
    <div className="space-y-4">
      {/* Overall accuracy */}
      <div className="flex items-baseline gap-3">
        <span className={`text-3xl font-bold ${accuracyColor}`}>
          {data.overall_accuracy}%
        </span>
        <span className="text-sm text-th-text-muted">
          {data.total_confirmed} confirmed / {data.total_analyzed} analyzed
        </span>
      </div>

      {/* Per-violation type bars */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-th-text-tertiary">By Violation Type</p>
        {sortedTypes.map(([code, stat]) => {
          const label = VIOLATION_TYPES[code as ViolationCode]?.name ?? code
          const barWidth = Math.max(stat.accuracy, 2)
          const barColor = stat.accuracy >= 85 ? 'bg-green-500' : stat.accuracy >= 70 ? 'bg-yellow-500' : 'bg-red-500'
          return (
            <div key={code} className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-xs font-mono text-th-text-secondary">{code}</span>
              <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-th-bg-tertiary" title={label}>
                <div
                  className={`h-full rounded-full ${barColor} transition-all duration-500`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-xs font-medium text-th-text-secondary">
                {stat.accuracy}%
              </span>
            </div>
          )
        })}
      </div>

      {/* Confidence calibration */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-th-text-tertiary">Confidence Calibration</p>
        <div className="grid grid-cols-4 gap-2">
          {data.confidence_calibration.map((bucket) => (
            <div key={bucket.range} className="rounded-lg bg-th-bg-tertiary p-2 text-center">
              <p className="text-[10px] text-th-text-muted">{bucket.range}%</p>
              <p className="text-sm font-bold text-th-text">{bucket.accuracy}%</p>
              <p className="text-[10px] text-th-text-muted">n={bucket.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top errors */}
      {data.top_errors.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-th-text-tertiary">Top Misclassifications</p>
          <div className="space-y-1">
            {data.top_errors.slice(0, 3).map((err, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-th-text-secondary">{err.predicted}</span>
                <span className="text-th-text-muted">&rarr;</span>
                <span className="font-mono text-st-danger-text">{err.actual}</span>
                <span className="ml-auto text-th-text-muted">{err.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
