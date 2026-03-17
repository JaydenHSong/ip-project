'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'

type QueueSummary = {
  action_required: number
  new_reply: number
  stale: number
  total: number
}

const QUEUE_ITEMS = [
  { key: 'action_required', label: 'Action Required', variant: 'danger' as const, param: 'needs_attention' },
  { key: 'new_reply', label: 'New Reply', variant: 'info' as const, param: 'new_reply' },
  { key: 'stale', label: 'Stale (7d+)', variant: 'default' as const, param: 'stale' },
] as const

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

  if (!summary || summary.total === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {QUEUE_ITEMS.map((item) => {
        const count = summary[item.key as keyof QueueSummary] as number
        if (count === 0) return null
        const isActive = activeQueue === item.param
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => {
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
                : 'border-th-border text-th-text-secondary hover:bg-th-bg-hover'
            }`}
          >
            {item.label}
            <Badge variant={item.variant} size="sm">{count}</Badge>
          </button>
        )
      })}
      <span className="text-xs text-th-text-muted">
        Total: {summary.total} monitoring
      </span>
    </div>
  )
}
