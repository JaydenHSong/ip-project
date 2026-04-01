// S13 — Channel Breakdown YTD
// Design Ref: §5.3 S13 "Channel Breakdown YTD"
'use client'

import type { ChannelBudget } from '../types'

type ChannelBreakdownProps = {
  plans: ChannelBudget[]
  actuals: ChannelBudget[]
  className?: string
}

const CHANNEL_LABELS: Record<string, string> = {
  sp: 'Sponsored Products',
  sb: 'Sponsored Brands',
  sd: 'Sponsored Display',
}

const CHANNEL_COLORS: Record<string, string> = {
  sp: 'bg-gray-900',
  sb: 'bg-orange-500',
  sd: 'bg-gray-400',
}

const fmt = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`
  return `$${v.toFixed(0)}`
}

const ChannelBreakdown = ({ plans, actuals, className = '' }: ChannelBreakdownProps) => {
  const currentMonth = new Date().getMonth() + 1

  const channels = plans.map((p) => {
    const actual = actuals.find((a) => a.channel === p.channel)
    const ytdPlanned = p.months.filter((m) => m.month <= currentMonth).reduce((s, m) => s + m.amount, 0)
    const ytdActual = actual?.months.filter((m) => m.month <= currentMonth).reduce((s, m) => s + m.amount, 0) ?? 0
    const pct = ytdPlanned > 0 ? (ytdActual / ytdPlanned) * 100 : 0

    return {
      channel: p.channel,
      ytd_planned: ytdPlanned,
      ytd_actual: ytdActual,
      annual: p.annual_total,
      pacing_pct: pct,
    }
  })

  const totalActual = channels.reduce((s, c) => s + c.ytd_actual, 0)

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
      <h3 className="text-sm font-medium text-gray-900 mb-4">Channel Breakdown (YTD)</h3>

      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 mb-4">
        {channels.map((ch) => {
          const widthPct = totalActual > 0 ? (ch.ytd_actual / totalActual) * 100 : 0
          return (
            <div
              key={ch.channel}
              className={`${CHANNEL_COLORS[ch.channel]} transition-all`}
              style={{ width: `${widthPct}%` }}
              title={`${ch.channel.toUpperCase()}: ${fmt(ch.ytd_actual)}`}
            />
          )
        })}
      </div>

      {/* Detail rows */}
      <div className="space-y-3">
        {channels.map((ch) => (
          <div key={ch.channel} className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-sm ${CHANNEL_COLORS[ch.channel]}`} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">
                  {CHANNEL_LABELS[ch.channel]}
                </span>
                <span className="text-xs text-gray-500">
                  {fmt(ch.ytd_actual)} / {fmt(ch.ytd_planned)}
                </span>
              </div>
              <div className="mt-1 h-1 w-full rounded-full bg-gray-100">
                <div
                  className={`h-1 rounded-full ${CHANNEL_COLORS[ch.channel]} transition-all`}
                  style={{ width: `${Math.min(ch.pacing_pct, 100)}%` }}
                />
              </div>
            </div>
            <span className={`text-xs font-medium ${
              ch.pacing_pct > 110 ? 'text-red-600' : ch.pacing_pct > 85 ? 'text-emerald-600' : 'text-orange-600'
            }`}>
              {ch.pacing_pct.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export { ChannelBreakdown }
