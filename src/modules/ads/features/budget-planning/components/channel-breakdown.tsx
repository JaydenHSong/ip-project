// S13 — Team budget YTD (single total; no per-channel split)
'use client'

import type { TeamMonthlyBudget } from '../types'

type ChannelBreakdownProps = {
  plans: TeamMonthlyBudget
  actuals: TeamMonthlyBudget
  className?: string
}

const ChannelBreakdown = ({ plans, actuals, className = '' }: ChannelBreakdownProps) => {
  const currentMonth = new Date().getMonth() + 1

  const ytdPlanned = plans.months.filter((m) => m.month <= currentMonth).reduce((s, m) => s + m.amount, 0)
  const ytdActual = actuals.months.filter((m) => m.month <= currentMonth).reduce((s, m) => s + m.amount, 0)
  const pct = ytdPlanned > 0 ? Math.min((ytdActual / ytdPlanned) * 100, 100) : 0

  return (
    <div className={`rounded-lg border border-th-border bg-surface-card p-4 ${className}`}>
      <h3 className="text-sm font-medium text-th-text mb-4">Team budget (YTD)</h3>
      <svg viewBox="0 0 100 6" className="w-full h-4 text-orange-500" preserveAspectRatio="none" aria-hidden>
        <rect x="0" y="0" width="100" height="6" className="fill-th-bg-hover" rx="1" />
        <rect x="0" y="0" width={pct} height="6" className="fill-current" rx="1" />
      </svg>
    </div>
  )
}

export { ChannelBreakdown }
