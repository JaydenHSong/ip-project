'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'

type QueueSummary = {
  action_required: number
  new_reply: number
  clone_suggested: number
  expired: number
  total: number
  clone_threshold_days: number
  max_monitoring_days: number
}

type QueueItem = {
  key: string
  label: string
  variant: 'danger' | 'info' | 'warning'
  param: string
}

const buildQueueItems = (summary: QueueSummary): QueueItem[] => [
  { key: 'action_required', label: 'Action Required', variant: 'danger', param: 'needs_attention' },
  { key: 'clone_suggested', label: `Clone Suggested (${summary.clone_threshold_days}d+)`, variant: 'warning', param: 'clone_suggested' },
]

export const BrCaseQueueBar = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [summary, setSummary] = useState<QueueSummary | null>(null)
  const activeQueue = searchParams.get('smart_queue')

  const fetchSummary = useCallback(() => {
    fetch('/api/dashboard/br-case-summary')
      .then((res) => res.json())
      .then((data: QueueSummary) => setSummary(data))
      .catch(() => {})
  }, [])

  // 마운트 + 페이지 이동 시 (리포트 상세에서 돌아올 때) 갱신
  useEffect(() => {
    fetchSummary()
  }, [fetchSummary, pathname])

  // 탭 포커스 시 갱신
  useEffect(() => {
    const handleFocus = () => fetchSummary()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchSummary])

  if (!summary) return null

  const queueItems = buildQueueItems(summary)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {queueItems.map((item) => {
        const count = summary[item.key as keyof QueueSummary] as number
        const isActive = activeQueue === item.param
        const isEmpty = count === 0
        return (
          <button
            key={item.key}
            type="button"
            disabled={isEmpty}
            onClick={() => {
              if (isEmpty) return
              const url = new URL(window.location.href)
              if (isActive) {
                url.searchParams.delete('smart_queue')
              } else {
                url.searchParams.set('status', 'monitoring')
                url.searchParams.set('smart_queue', item.param)
              }
              router.push(url.pathname + url.search)
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              isActive
                ? 'border-th-accent/50 bg-th-accent/10 text-th-accent-text'
                : isEmpty
                  ? 'border-th-border/50 text-th-text-muted cursor-default'
                  : 'border-th-border text-th-text-secondary hover:bg-th-bg-hover'
            }`}
          >
            {item.label}
            <Badge variant={isEmpty ? 'default' : item.variant} size="sm">{count}</Badge>
          </button>
        )
      })}
      <span className="text-xs text-th-text-muted">
        Total: {summary.total} cases
      </span>
    </div>
  )
}
