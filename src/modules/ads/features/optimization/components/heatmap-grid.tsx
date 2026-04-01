// S07 — 24h×7d Heatmap Grid (reusable)
// Design Ref: §2.1 optimization/components/heatmap-grid.tsx
'use client'

import type { HeatmapCell } from '../types'

type HeatmapGridProps = {
  cells: HeatmapCell[]
  onCellToggle?: (day: number, hour: number) => void
  highlightNow?: boolean
  className?: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const getIntensity = (weight: number): string => {
  if (weight === 0) return 'bg-gray-50'
  if (weight < 0.25) return 'bg-gray-200'
  if (weight < 0.5) return 'bg-gray-400'
  if (weight < 0.75) return 'bg-gray-600'
  return 'bg-gray-800'
}

const HeatmapGrid = ({ cells, onCellToggle, highlightNow = true, className = '' }: HeatmapGridProps) => {
  const now = new Date()
  const currentDay = now.getDay()
  const currentHour = now.getHours()

  const getCell = (day: number, hour: number) =>
    cells.find((c) => c.day === day && c.hour === hour)

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="w-10" />
            {Array.from({ length: 24 }, (_, h) => (
              <th key={h} className="text-[8px] text-gray-400 text-center w-4">{h % 6 === 0 ? h : ''}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day, dayIdx) => (
            <tr key={day}>
              <td className="text-[10px] text-gray-500 font-medium pr-1">{day}</td>
              {Array.from({ length: 24 }, (_, hour) => {
                const cell = getCell(dayIdx, hour)
                const weight = cell?.weight ?? 0
                const isNow = highlightNow && dayIdx === currentDay && hour === currentHour
                return (
                  <td key={hour} className="p-0">
                    <button
                      onClick={() => onCellToggle?.(dayIdx, hour)}
                      className={`h-3.5 w-full ${getIntensity(weight)} ${
                        isNow ? 'ring-1 ring-orange-500 ring-inset' : ''
                      } transition-colors hover:opacity-80`}
                      disabled={!onCellToggle}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { HeatmapGrid }
