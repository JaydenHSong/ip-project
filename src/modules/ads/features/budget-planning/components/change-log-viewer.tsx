// S13 — Change Log Viewer
// Design Ref: §5.3 S13 "[View Change Log]"
'use client'

import { useState, useEffect } from 'react'
import type { BudgetChangeLogItem } from '../types'

type ChangeLogViewerProps = {
  brandMarketId: string
  year: number
  isOpen: boolean
  onClose: () => void
}

const ChangeLogViewer = ({ brandMarketId, year, isOpen, onClose }: ChangeLogViewerProps) => {
  const [logs, setLogs] = useState<BudgetChangeLogItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isOpen) return

    const fetchLogs = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/ads/budgets/change-log?brand_market_id=${brandMarketId}&year=${year}`)
        if (res.ok) {
          const json = await res.json() as { data: BudgetChangeLogItem[] }
          setLogs(json.data)
        }
      } catch {
        // silent
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogs()
  }, [isOpen, brandMarketId, year])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Budget Change Log</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-gray-50" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No changes recorded</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">{log.user_name}</span>
                    <span className="text-[11px] text-gray-400">
                      {new Date(log.changed_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    <span className="font-mono">{log.field}</span>:
                    <span className="text-red-500 line-through ml-1">${log.old_value ?? '0'}</span>
                    <span className="mx-1">&rarr;</span>
                    <span className="text-emerald-600 font-medium">${log.new_value}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { ChangeLogViewer }
