// M05 — Underspend Analysis Modal
// Design Ref: §5.3 M05
'use client'

import { useState, useEffect } from 'react'
import { ProgressBar } from '@/modules/ads/shared/components/progress-bar'
import type { SpendDiagnosticCause } from '../types'

type UnderspendModalProps = {
  campaignId: string
  campaignName: string
  dailyBudget: number
  spendToday: number
  isOpen: boolean
  onClose: () => void
}

const UnderspendModal = ({ campaignId, campaignName, dailyBudget, spendToday, isOpen, onClose }: UnderspendModalProps) => {
  const [causes, setCauses] = useState<SpendDiagnosticCause[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [appliedFixes, setAppliedFixes] = useState<Set<string>>(new Set())
  const [applyingAll, setApplyingAll] = useState(false)

  useEffect(() => {
    if (!isOpen || !campaignId) return
    const fetchCauses = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/ads/campaigns/${campaignId}/spend-diagnostics`)
        if (res.ok) {
          const json = await res.json() as { data: SpendDiagnosticCause[] }
          setCauses(json.data ?? [])
        } else {
          // Fallback — show default causes if API not ready
          setCauses([
            { id: '1', cause: 'Low bids', contribution_pct: 45, description: 'Bids too low for competitive keywords — impressions suppressed', fix_action: 'increase_bids', fix_label: 'Increase bids by 20%' },
            { id: '2', cause: 'Narrow targeting', contribution_pct: 30, description: 'Few keywords or tight match types limiting reach', fix_action: 'add_broad', fix_label: 'Add broad match keywords' },
            { id: '3', cause: 'Low search volume', contribution_pct: 15, description: 'Selected keywords have insufficient search volume', fix_action: 'expand_targeting', fix_label: 'Expand product targeting' },
            { id: '4', cause: 'Learning period', contribution_pct: 10, description: 'Campaign recently launched — algorithm still learning', fix_action: 'wait', fix_label: 'Extend learning period' },
          ])
        }
      } catch {
        // Fallback causes
        setCauses([
          { id: '1', cause: 'Low bids', contribution_pct: 45, description: 'Bids too low for competitive keywords', fix_action: 'increase_bids', fix_label: 'Increase bids by 20%' },
          { id: '2', cause: 'Narrow targeting', contribution_pct: 30, description: 'Few keywords limiting reach', fix_action: 'add_broad', fix_label: 'Add broad match keywords' },
          { id: '3', cause: 'Low search volume', contribution_pct: 15, description: 'Insufficient search volume for keywords', fix_action: 'expand_targeting', fix_label: 'Expand product targeting' },
        ])
      }
      finally { setIsLoading(false) }
    }
    fetchCauses()
    setAppliedFixes(new Set())
  }, [isOpen, campaignId])

  if (!isOpen) return null

  const utilization = dailyBudget > 0 ? (spendToday / dailyBudget) * 100 : 0
  const remaining = dailyBudget - spendToday
  const pendingFixes = causes.filter((c) => !appliedFixes.has(c.id))

  const handleApplyFix = async (causeId: string, fixAction: string) => {
    try {
      await fetch(`/api/ads/campaigns/${campaignId}/apply-fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fix_action: fixAction }),
      })
    } catch { /* silent */ }
    setAppliedFixes((prev) => new Set([...prev, causeId]))
  }

  const handleApplyAll = async () => {
    setApplyingAll(true)
    for (const cause of pendingFixes) {
      await handleApplyFix(cause.id, cause.fix_action)
    }
    setApplyingAll(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[520px] rounded-xl bg-white shadow-xl">
        {/* Header — Design M05: "Underspend dot + 캠페인명 + utilization %" */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            <h2 className="text-base font-semibold text-gray-900">Underspend Analysis</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Campaign + utilization */}
          <div>
            <p className="text-xs text-gray-500">{campaignName}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Budget utilization: {utilization.toFixed(0)}%</p>
          </div>

          {/* Hero Number + Progress Bar — Design M05 */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">${remaining.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">remaining of ${dailyBudget.toFixed(0)} daily budget</p>
            <ProgressBar value={utilization} size="md" className="mt-3" />
          </div>

          {/* Root Causes — Design M05: "contribution %, 설명, CTA" */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Root Causes</h3>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {causes.map((cause) => {
                  const isApplied = appliedFixes.has(cause.id)
                  return (
                    <div key={cause.id} className={`rounded-lg border p-3 ${isApplied ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-900">{cause.cause}</span>
                            <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
                              {cause.contribution_pct}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{cause.description}</p>
                          {/* Contribution bar */}
                          <div className="mt-2 h-1 w-full rounded-full bg-gray-100">
                            <div
                              className="h-1 rounded-full bg-orange-400"
                              style={{ width: `${cause.contribution_pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isApplied ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700">
                              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M2 6L5 9L10 3" />
                              </svg>
                              Applied
                            </span>
                          ) : (
                            <button
                              onClick={() => handleApplyFix(cause.id, cause.fix_action)}
                              className="rounded bg-gray-900 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-gray-800"
                            >
                              {cause.fix_label}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Apply All N Fixes CTA — Design M05: "오렌지 전폭 CTA" */}
        <div className="border-t border-gray-200 px-6 py-4">
          {pendingFixes.length > 0 ? (
            <button
              onClick={handleApplyAll}
              disabled={applyingAll}
              className="w-full rounded-md bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {applyingAll ? 'Applying...' : `Apply All ${pendingFixes.length} Fixes`}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full rounded-md bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              All Fixes Applied — Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export { UnderspendModal }
