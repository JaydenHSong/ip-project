// S05 — Daily Budget Pacing
// Design Ref: §5.3 S05
'use client'

import { useState, useEffect } from 'react'
import { KpiCard } from '@/modules/ads/shared/components/kpi-card'
import { ProgressBar } from '@/modules/ads/shared/components/progress-bar'
import { EmptyState } from '@/modules/ads/shared/components/empty-state'
import type { BudgetPacingDetail } from '../types'

type DailyBudgetPacingProps = {
  campaignId: string | null
}

const DailyBudgetPacing = ({ campaignId }: DailyBudgetPacingProps) => {
  const [data, setData] = useState<BudgetPacingDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!campaignId) { setIsLoading(false); return }
    const fetch_ = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/ads/campaigns/${campaignId}`)
        if (res.ok) {
          const json = await res.json() as { data: { daily_budget: number | null; weekly_budget: number | null } }
          const budget = json.data.daily_budget ?? (json.data.weekly_budget ? json.data.weekly_budget / 7 : 0)
          setData({
            daily_budget: budget,
            spend_today: 0,
            remaining: budget,
            pacing_pct: 0,
            distribution: 'even',
            hourly_spend: Array.from({ length: 24 }, (_, h) => ({ hour: h, actual: 0, predicted: budget / 24 })),
          })
        }
      } catch { /* silent */ }
      finally { setIsLoading(false) }
    }
    fetch_()
  }, [campaignId])

  if (!campaignId) return <EmptyState title="Select a campaign" description="Choose a campaign to see budget pacing" />
  if (isLoading) return <div className="h-64 animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
  if (!data) return null

  const currentHour = new Date().getHours()
  const isUnderspend = data.pacing_pct < 70

  return (
    <div className="space-y-6">
      {/* Strategy Strip — Design S05 */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Distribution" value={data.distribution === 'weighted' ? 'Weighted' : 'Even'} />
        <KpiCard label="Daily Cap" value={`$${data.daily_budget.toFixed(0)}`} />
        <KpiCard label="Pace Mode" value={data.pacing_pct > 90 ? 'Aggressive' : 'Normal'} />
      </div>

      {/* Today's Status — Design S05 */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Today&apos;s Status</h3>
        <p className="text-3xl font-bold text-gray-900">${data.spend_today.toFixed(2)}</p>
        <p className="text-xs text-gray-400 mt-1">of ${data.daily_budget.toFixed(0)} daily budget</p>
        <ProgressBar value={data.pacing_pct} size="md" className="mt-3" />
      </div>

      {/* 24h Hourly Spend Chart — Design S05 */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Hourly Spend</h3>
        <div className="flex items-end gap-0.5 h-32">
          {data.hourly_spend.map((h) => {
            const maxH = Math.max(...data.hourly_spend.map((s) => Math.max(s.actual, s.predicted)), 1)
            const actualH = (h.actual / maxH) * 128
            const predH = (h.predicted / maxH) * 128
            const isCurrent = h.hour === currentHour
            return (
              <div key={h.hour} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full flex items-end gap-px" style={{ height: '128px' }}>
                  <div className="flex-1 rounded-t bg-gray-200" style={{ height: `${predH}px` }} />
                  <div
                    className={`flex-1 rounded-t ${isCurrent ? 'bg-orange-500' : 'bg-gray-900'}`}
                    style={{ height: `${actualH}px` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-0.5 mt-1">
          {data.hourly_spend.map((h) => (
            <div key={h.hour} className={`flex-1 text-center text-[8px] ${h.hour === currentHour ? 'text-orange-500 font-bold' : 'text-gray-300'}`}>
              {h.hour % 6 === 0 ? `${h.hour}h` : ''}
            </div>
          ))}
        </div>
      </div>

      {/* Underspend Watch — Design S05: "조건부, < 70%" */}
      {isUnderspend && (
        <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
          <p className="text-sm font-medium text-orange-800">Underspend Watch</p>
          <p className="text-xs text-orange-700 mt-1">
            Budget utilization is {data.pacing_pct.toFixed(0)}% — below the 70% threshold.
            Consider reviewing targeting settings or increasing bids.
          </p>
        </div>
      )}
    </div>
  )
}

export { DailyBudgetPacing }
