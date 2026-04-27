// S05 — Daily Budget Pacing
// Design Ref: §5.3 S05
'use client'

import { useState, useEffect, useCallback } from 'react'
import { KpiCard } from '@/modules/ads/shared/components/kpi-card'
import { ProgressBar } from '@/modules/ads/shared/components/progress-bar'
import { EmptyState } from '@/modules/ads/shared/components/empty-state'
import { UnderspendModal } from './underspend-modal'
// Design Ref: ft-optimization-ui-wiring §3.2 S1 — M05 Underspend Analyze CTA
import type { BudgetPacingDetail } from '../types'

type DailyBudgetPacingProps = {
  campaignId: string | null
  daypartingActive?: boolean
}

const DailyBudgetPacing = ({ campaignId, daypartingActive = false }: DailyBudgetPacingProps) => {
  const [data, setData] = useState<BudgetPacingDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditingBudget, setIsEditingBudget] = useState(false)
  const [editBudgetValue, setEditBudgetValue] = useState('')
  const [underspendOpen, setUnderspendOpen] = useState(false)
  const [aiDismissed, setAiDismissed] = useState(false)
  const [applyingAi, setApplyingAi] = useState(false)

  useEffect(() => {
    if (!campaignId) { setIsLoading(false); return }
    const fetch_ = async () => {
      setIsLoading(true)
      try {
        // C1+C2 fix: call the budget-pacing endpoint which aggregates real
        // spend from report_snapshots instead of hardcoding zeros.
        const res = await fetch(`/api/ads/optimization/budget-pacing/${campaignId}`)
        if (res.ok) {
          const json = await res.json() as { data: BudgetPacingDetail }
          setData(json.data)
        }
      } catch (err) {
        // L1 fix: log fetch failures for devtools/Sentry visibility
        console.error('[daily-budget-pacing] fetch failed', err)
      }
      finally { setIsLoading(false) }
    }
    fetch_()
  }, [campaignId])

  const handleBudgetSave = useCallback(async () => {
    const newBudget = parseFloat(editBudgetValue)
    if (isNaN(newBudget) || newBudget <= 0 || !campaignId) return
    try {
      const res = await fetch(`/api/ads/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daily_budget: newBudget }),
      })
      if (res.ok && data) {
        setData({
          ...data,
          daily_budget: newBudget,
          remaining: newBudget - data.spend_today,
        })
      }
    } catch (err) {
      // L1 fix: log budget save failures
      console.error('[daily-budget-pacing] save failed', err)
    }
    setIsEditingBudget(false)
  }, [editBudgetValue, campaignId, data])

  // Design Ref: ft-optimization-ui-wiring §7.2 — Dismiss via localStorage
  useEffect(() => {
    if (!campaignId) return
    const key = `ads.budgetAiDismiss.${campaignId}`
    setAiDismissed(localStorage.getItem(key) === '1')
  }, [campaignId])

  const handleApplyAi = useCallback(async () => {
    if (!data || !campaignId) return
    const suggested = data.pacing_pct < 60 ? data.daily_budget * 0.7 : data.daily_budget * 1.2
    const newBudget = Math.round(suggested)
    setApplyingAi(true)
    try {
      const res = await fetch(`/api/ads/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daily_budget: newBudget }),
      })
      if (res.ok) {
        setData({ ...data, daily_budget: newBudget, remaining: newBudget - data.spend_today })
      }
    } catch (err) {
      console.error('[daily-budget-pacing] ai apply failed', err)
    } finally {
      setApplyingAi(false)
    }
  }, [data, campaignId])

  const handleDismissAi = useCallback(() => {
    if (!campaignId) return
    localStorage.setItem(`ads.budgetAiDismiss.${campaignId}`, '1')
    setAiDismissed(true)
  }, [campaignId])

  if (!campaignId) return <EmptyState title="Select a campaign" description="Choose a campaign to see budget pacing" />
  if (isLoading) return <div className="h-64 animate-pulse rounded-lg border border-th-border bg-th-bg-hover" />
  if (!data) return null

  const currentHour = new Date().getHours()
  const isUnderspend = data.pacing_pct < 70
  const isOffTrack = (data.pacing_pct < 60 || data.pacing_pct > 110) && !aiDismissed

  return (
    <div className="space-y-6">
      {/* Strategy Strip — Design S05 */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Distribution" value={data.distribution === 'weighted' ? 'Weighted' : 'Even'} />
        <KpiCard label="Daily Cap" value={`$${data.daily_budget.toFixed(0)}`} />
        <KpiCard label="Pace Mode" value={data.pacing_pct > 90 ? 'Aggressive' : 'Normal'} />
      </div>

      {/* AI Budget Recommendation — Design S05: "조건부, pacing off-track" */}
      {isOffTrack && (
        <div className="rounded-lg border border-th-border bg-th-text p-4">
          <div className="flex items-center gap-2 mb-2">
            {/* AI icon */}
            <svg className="h-4 w-4 text-orange-500" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L10 5.5L15 6.5L11.5 10L12.5 15L8 12.5L3.5 15L4.5 10L1 6.5L6 5.5L8 1Z" fill="currentColor" />
            </svg>
            <span className="text-sm font-semibold text-white">AI Budget Recommendation</span>
          </div>
          <p className="text-xs text-th-text-muted mb-3">
            {data.pacing_pct < 60
              ? `Pacing at ${data.pacing_pct.toFixed(0)}% — budget is significantly under-utilized. Consider reducing daily cap or increasing bids to improve spend efficiency.`
              : `Pacing at ${data.pacing_pct.toFixed(0)}% — budget is overspending. Consider lowering bids or tightening targeting to stay within budget.`
            }
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded bg-th-bg-tertiary px-3 py-2">
              <p className="text-[10px] text-th-text-muted uppercase tracking-wide">Suggested Budget</p>
              <p className="text-sm font-bold text-orange-500">
                ${(data.pacing_pct < 60 ? data.daily_budget * 0.7 : data.daily_budget * 1.2).toFixed(0)}
              </p>
            </div>
            <div className="flex-1 rounded bg-th-bg-tertiary px-3 py-2">
              <p className="text-[10px] text-th-text-muted uppercase tracking-wide">Expected Pacing</p>
              <p className="text-sm font-bold text-emerald-500">85–95%</p>
            </div>
            <button
              onClick={handleApplyAi}
              disabled={applyingAi}
              className="shrink-0 rounded-md bg-orange-500 px-4 py-2 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {applyingAi ? 'Applying…' : 'Apply'}
            </button>
            <button
              onClick={handleDismissAi}
              className="shrink-0 rounded-md bg-th-bg-tertiary px-3 py-2 text-xs text-th-text-muted hover:bg-th-bg-hover"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Today's Status — Design S05: "hero 숫자 + progress bar + Edit Budget" */}
      <div className="rounded-lg border border-th-border bg-surface-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-th-text">Today&apos;s Status</h3>
          {isEditingBudget ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={editBudgetValue}
                onChange={(e) => setEditBudgetValue(e.target.value)}
                className="w-24 rounded border border-th-border px-2 py-1 text-xs focus:border-orange-500 focus:outline-none"
                placeholder="New budget"
                min={0}
                step={10}
              />
              <button
                onClick={handleBudgetSave}
                className="rounded bg-orange-500 px-2 py-1 text-xs font-medium text-white hover:bg-orange-600"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditingBudget(false)}
                className="rounded bg-th-bg-tertiary px-2 py-1 text-xs text-th-text-secondary hover:bg-th-bg-tertiary"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditBudgetValue(data.daily_budget.toFixed(0))
                setIsEditingBudget(true)
              }}
              className="flex items-center gap-1 rounded border border-th-border px-2.5 py-1 text-xs font-medium text-th-text-secondary hover:bg-th-bg-hover"
            >
              {/* Pencil icon */}
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" />
              </svg>
              Edit Budget
            </button>
          )}
        </div>
        <p className="text-3xl font-bold text-th-text">${data.spend_today.toFixed(2)}</p>
        <p className="text-xs text-th-text-muted mt-1">of ${data.daily_budget.toFixed(0)} daily budget</p>
        <ProgressBar value={data.pacing_pct} size="md" className="mt-3" />
      </div>

      {/* 24h Hourly Spend Chart — Design S05 */}
      <div className="rounded-lg border border-th-border bg-surface-card p-4">
        <h3 className="text-sm font-medium text-th-text mb-3">Hourly Spend</h3>
        <div className="flex items-end gap-0.5 h-32">
          {data.hourly_spend.map((h) => {
            const maxH = Math.max(...data.hourly_spend.map((s) => Math.max(s.actual, s.predicted)), 1)
            const actualH = (h.actual / maxH) * 128
            const predH = (h.predicted / maxH) * 128
            const isCurrent = h.hour === currentHour
            return (
              <div key={h.hour} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full flex items-end gap-px" style={{ height: '128px' }}>
                  <div className="flex-1 rounded-t bg-th-bg-tertiary" style={{ height: `${predH}px` }} />
                  <div
                    className={`flex-1 rounded-t ${isCurrent ? 'bg-orange-500' : 'bg-th-text'}`}
                    style={{ height: `${actualH}px` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-0.5 mt-1">
          {data.hourly_spend.map((h) => (
            <div key={h.hour} className={`flex-1 text-center text-[8px] ${h.hour === currentHour ? 'text-orange-500 font-bold' : 'text-th-text-muted'}`}>
              {h.hour % 6 === 0 ? `${h.hour}h` : ''}
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-sm bg-th-text" />
            <span className="text-[10px] text-th-text-muted">Actual</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-sm bg-th-bg-tertiary" />
            <span className="text-[10px] text-th-text-muted">Predicted</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-sm bg-orange-500" />
            <span className="text-[10px] text-th-text-muted">Now</span>
          </div>
        </div>
      </div>

      {/* Underspend Watch — Design S05: "조건부, < 70%" + M05 Analyze CTA */}
      {isUnderspend && (
        <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-orange-800">Underspend Watch</p>
              <p className="text-xs text-orange-700 mt-1">
                Budget utilization is {data.pacing_pct.toFixed(0)}% — below the 70% threshold.
                Consider reviewing targeting settings or increasing bids.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUnderspendOpen(true)}
              className="whitespace-nowrap rounded border border-orange-300 bg-white px-3 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100"
            >
              Analyze →
            </button>
          </div>
        </div>
      )}

      {/* M05 Underspend Modal */}
      {campaignId && (
        <UnderspendModal
          campaignId={campaignId}
          campaignName="Current Campaign"
          dailyBudget={data.daily_budget}
          spendToday={data.spend_today}
          isOpen={underspendOpen}
          onClose={() => setUnderspendOpen(false)}
        />
      )}

      {/* Dayparting Signal — Design S05: "조건부, dayparting active" */}
      {daypartingActive && (
        <div className="rounded-md border border-th-border bg-th-bg-hover p-3">
          <div className="flex items-center gap-2">
            {/* Clock icon */}
            <svg className="h-4 w-4 text-th-text-muted" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6" />
              <path d="M8 4.5V8L10.5 9.5" />
            </svg>
            <div>
              <p className="text-xs font-medium text-th-text-secondary">Dayparting Active</p>
              <p className="text-[11px] text-th-text-muted">
                Bid multipliers are being applied based on the dayparting schedule. Budget pacing may vary by hour.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { DailyBudgetPacing }
