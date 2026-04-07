// S01 — ROAS Trend 30d Chart (3-line: Spigen, Legato, Cyrill)
// Design Ref: §5.3 S01 "ROAS Trend 30d 3-line 차트 + 타겟 기준선"
'use client'

import type { RoasTrendPoint } from '../types'

type RoasTrendChartProps = {
  data: RoasTrendPoint[]
  targetRoas?: number
  className?: string
}

const BRAND_COLORS: Record<string, string> = {
  spigen: '#18181B',  // zinc-900
  legato: '#F97316',  // orange-500
  cyrill: '#9CA3AF',  // gray-400
}

const RoasTrendChart = ({ data, targetRoas = 3.0, className = '' }: RoasTrendChartProps) => {
  if (data.length === 0) {
    return (
      <div className={`rounded-lg border border-th-border bg-surface-card p-4 ${className}`}>
        <h3 className="text-sm font-medium text-th-text mb-3">ROAS Trend (30 Days)</h3>
        <div className="flex items-center justify-center h-48 text-sm text-th-text-muted">
          No trend data available yet
        </div>
      </div>
    )
  }

  // Calculate SVG chart
  const width = 400
  const height = 160
  const padX = 40
  const padY = 20

  const allValues = data.flatMap((d) => [d.spigen, d.legato, d.cyrill, targetRoas])
  const maxVal = Math.max(...allValues) * 1.1
  const minVal = Math.min(...allValues) * 0.9

  const scaleX = (i: number) => padX + (i / Math.max(data.length - 1, 1)) * (width - padX * 2)
  const scaleY = (v: number) => padY + (1 - (v - minVal) / (maxVal - minVal)) * (height - padY * 2)

  const makePath = (key: 'spigen' | 'legato' | 'cyrill') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(d[key])}`).join(' ')

  // Target line
  const targetY = scaleY(targetRoas)

  return (
    <div className={`rounded-lg border border-th-border bg-surface-card p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-th-text">ROAS Trend (30 Days)</h3>
        <div className="flex items-center gap-3">
          {Object.entries(BRAND_COLORS).map(([brand, color]) => (
            <div key={brand} className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[11px] text-th-text-muted capitalize">{brand}</span>
            </div>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = padY + pct * (height - padY * 2)
          const val = maxVal - pct * (maxVal - minVal)
          return (
            <g key={pct}>
              <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#E5E7EB" strokeWidth="0.5" />
              <text x={padX - 4} y={y + 3} textAnchor="end" className="text-[9px] fill-gray-400">
                {val.toFixed(1)}
              </text>
            </g>
          )
        })}

        {/* Target line */}
        <line
          x1={padX} y1={targetY} x2={width - padX} y2={targetY}
          stroke="#F97316" strokeWidth="1" strokeDasharray="4,4" opacity="0.5"
        />
        <text x={width - padX + 4} y={targetY + 3} className="text-[9px] fill-orange-500">
          Target
        </text>

        {/* Brand lines */}
        {(['spigen', 'legato', 'cyrill'] as const).map((brand) => (
          <path
            key={brand}
            d={makePath(brand)}
            fill="none"
            stroke={BRAND_COLORS[brand]}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* X-axis labels (first, middle, last) */}
        {[0, Math.floor(data.length / 2), data.length - 1].map((i) => {
          if (!data[i]) return null
          return (
            <text key={i} x={scaleX(i)} y={height - 2} textAnchor="middle" className="text-[9px] fill-gray-400">
              {data[i].date.slice(5)} {/* MM-DD */}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

export { RoasTrendChart }
