// S13 — Plan vs Actual Bar Chart
// Design Ref: §5.3 S13 "Plan vs Actual 바 차트"
'use client'

import type { ChannelBudget } from '../types'

type PlanVsActualChartProps = {
  plans: ChannelBudget[]
  actuals: ChannelBudget[]
  className?: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const PlanVsActualChart = ({ plans, actuals, className = '' }: PlanVsActualChartProps) => {
  // Aggregate all channels per month
  const monthlyPlan = Array.from({ length: 12 }, (_, i) =>
    plans.reduce((sum, ch) => sum + (ch.months.find((m) => m.month === i + 1)?.amount ?? 0), 0),
  )
  const monthlyActual = Array.from({ length: 12 }, (_, i) =>
    actuals.reduce((sum, ch) => sum + (ch.months.find((m) => m.month === i + 1)?.amount ?? 0), 0),
  )

  const maxVal = Math.max(...monthlyPlan, ...monthlyActual, 1)
  const barHeight = 120

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">Plan vs Actual</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-sm bg-gray-300" />
            <span className="text-[11px] text-gray-500">Plan</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-sm bg-orange-500" />
            <span className="text-[11px] text-gray-500">Actual</span>
          </div>
        </div>
      </div>

      <div className="flex items-end gap-1" style={{ height: barHeight }}>
        {MONTHS.map((label, i) => {
          const planH = (monthlyPlan[i] / maxVal) * barHeight
          const actualH = (monthlyActual[i] / maxVal) * barHeight
          return (
            <div key={label} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="flex items-end gap-0.5 w-full">
                {/* Plan bar */}
                <div
                  className="flex-1 rounded-t bg-gray-200 transition-all"
                  style={{ height: `${planH}px` }}
                  title={`Plan: $${monthlyPlan[i].toLocaleString()}`}
                />
                {/* Actual bar */}
                <div
                  className="flex-1 rounded-t bg-orange-500 transition-all"
                  style={{ height: `${actualH}px` }}
                  title={`Actual: $${monthlyActual[i].toLocaleString()}`}
                />
              </div>
            </div>
          )
        })}
      </div>
      {/* X labels */}
      <div className="flex gap-1 mt-1">
        {MONTHS.map((label) => (
          <div key={label} className="flex-1 text-center text-[10px] text-gray-400">{label}</div>
        ))}
      </div>
    </div>
  )
}

export { PlanVsActualChart }
