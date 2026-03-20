'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'

type QueueSummary = {
  action_required: number
  new_reply: number
  clone_suggested: number
  total: number
  clone_threshold_days: number
}

type QueueItem = {
  key: string
  label: string
  variant: 'danger' | 'info' | 'warning'
  param: string
}

const buildQueueItems = (summary: QueueSummary): QueueItem[] => [
  { key: 'action_required', label: 'Action Required', variant: 'danger', param: 'needs_attention' },
  { key: 'new_reply', label: 'New Reply', variant: 'info', param: 'new_reply' },
  { key: 'clone_suggested', label: `Clone Suggested (${summary.clone_threshold_days}d+)`, variant: 'warning', param: 'clone_suggested' },
]

export const BrCaseQueueBar = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [summary, setSummary] = useState<QueueSummary | null>(null)
  const activeQueue = searchParams.get('smart_queue')

  useEffect(() => {
    fetch('/api/dashboard/br-case-summary')
      .then((res) => res.json())
      .then((data: QueueSummary) => setSummary(data))
      .catch(() => {})
  }, [])

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
                if (item.key === 'new_reply') url.searchParams.delete('status')
              } else {
                url.searchParams.set('status', item.key === 'new_reply' ? 'answered' : 'monitoring')
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
