// S13 — Plan vs Actual Bar Chart (team total)
'use client'

import type { TeamMonthlyBudget } from '../types'

type PlanVsActualChartProps = {
  plans: TeamMonthlyBudget
  actuals: TeamMonthlyBudget
  className?: string
}

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

const PlanVsActualChart = ({ plans, actuals, className = '' }: PlanVsActualChartProps) => {
  const monthlyPlan = Array.from({ length: 12 }, (_, i) => plans.months.find((m) => m.month === i + 1)?.amount ?? 0)
  const monthlyActual = Array.from(
    { length: 12 },
    (_, i) => actuals.months.find((m) => m.month === i + 1)?.amount ?? 0,
  )

  const maxVal = Math.max(...monthlyPlan, ...monthlyActual, 1)
  const chartH = 100
  const barW = 3
  const gap = 4
  const groupW = barW * 2 + gap
  const totalW = 12 * groupW + 8

  return (
    <div className={`rounded-lg border border-th-border bg-surface-card p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-th-text">Plan vs Actual</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-sm bg-th-text-muted" />
            <span className="text-[11px] text-th-text-muted">Plan</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-sm bg-orange-500" />
            <span className="text-[11px] text-th-text-muted">Actual</span>
          </div>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${totalW} ${chartH + 16}`}
        className="w-full h-36"
        role="img"
        aria-label="Plan versus actual by month"
      >
        {MONTHS.map((label, i) => {
          const x0 = 4 + i * groupW
          const ph = (monthlyPlan[i] / maxVal) * chartH
          const ah = (monthlyActual[i] / maxVal) * chartH
          return (
            <g key={label}>
              <rect
                x={x0}
                y={chartH - ph}
                width={barW}
                height={ph}
                className="fill-th-text-muted/40"
              />
              <rect
                x={x0 + barW + 1}
                y={chartH - ah}
                width={barW}
                height={ah}
                className="fill-orange-500"
              />
              <text
                x={x0 + barW}
                y={chartH + 12}
                textAnchor="middle"
                className="fill-th-text-muted"
                fontSize={9}
              >
                {label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export { PlanVsActualChart }
