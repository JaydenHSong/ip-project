// S05 — 24h Hourly Spend Chart (actual + predicted + Now marker)
// Design Ref: §2.1 optimization/components/hourly-spend-chart.tsx
'use client'

import type { HourlySpendPoint } from '../types'

type HourlySpendChartProps = {
  data: HourlySpendPoint[]
  dailyBudget: number
  className?: string
}

const HourlySpendChart = ({ data, dailyBudget, className = '' }: HourlySpendChartProps) => {
  const currentHour = new Date().getHours()
  const maxVal = Math.max(...data.map((d) => Math.max(d.actual, d.predicted)), dailyBudget / 24, 1)
  const barH = 96

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Hourly Spend</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-gray-900" />
            <span className="text-[10px] text-gray-500">Actual</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-gray-300" />
            <span className="text-[10px] text-gray-500">Predicted</span>
          </div>
        </div>
      </div>

      <div className="flex items-end gap-px" style={{ height: barH }}>
        {data.map((point) => {
          const actualH = (point.actual / maxVal) * barH
          const predH = (point.predicted / maxVal) * barH
          const isNow = point.hour === currentHour
          return (
            <div key={point.hour} className="flex-1 flex items-end gap-px relative">
              <div className="flex-1 rounded-t bg-gray-200" style={{ height: `${predH}px` }} />
              <div
                className={`flex-1 rounded-t ${isNow ? 'bg-orange-500' : 'bg-gray-900'}`}
                style={{ height: `${actualH}px` }}
              />
              {isNow && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] text-orange-500 font-bold">
                  NOW
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex gap-px mt-1">
        {data.map((point) => (
          <div key={point.hour} className="flex-1 text-center text-[7px] text-gray-300">
            {point.hour % 6 === 0 ? `${point.hour}h` : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

export { HourlySpendChart }
