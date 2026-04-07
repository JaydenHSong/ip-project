// S01/S02 — Brand×Market ACoS Heatmap (3×4 grid)
// Design Ref: §5.3 S01 "Brand×Market ACoS 히트맵 3×4 (컬러 = semantic)"
'use client'

import type { AcosHeatmapCell } from '../types'

type AcosHeatmapProps = {
  data: AcosHeatmapCell[]
  className?: string
}

const getAcosBg = (acos: number): string => {
  if (acos === 0) return 'bg-th-bg-hover text-th-text-muted'
  if (acos <= 15) return 'bg-emerald-50 text-emerald-700'
  if (acos <= 25) return 'bg-emerald-100 text-emerald-800'
  if (acos <= 35) return 'bg-orange-50 text-orange-700'
  if (acos <= 50) return 'bg-orange-100 text-orange-800'
  return 'bg-red-50 text-red-700'
}

const getDeltaColor = (delta: number): string => {
  if (delta < -2) return 'text-emerald-600' // improving
  if (delta > 2) return 'text-red-600'      // worsening
  return 'text-th-text-muted'                     // stable
}

const AcosHeatmap = ({ data, className = '' }: AcosHeatmapProps) => {
  // Extract unique brands and markets
  const brands = [...new Set(data.map((d) => d.brand))]
  const markets = [...new Set(data.map((d) => d.market))]

  const getCell = (brand: string, market: string) =>
    data.find((d) => d.brand === brand && d.market === market)

  if (data.length === 0) {
    return (
      <div className={`rounded-lg border border-th-border bg-surface-card p-4 ${className}`}>
        <h3 className="text-sm font-medium text-th-text mb-3">ACoS Heatmap</h3>
        <p className="text-sm text-th-text-muted text-center py-8">No data available</p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border border-th-border bg-surface-card p-4 ${className}`}>
      <h3 className="text-sm font-medium text-th-text mb-3">ACoS Heatmap</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1.5 text-left text-th-text-muted font-medium">Brand</th>
              {markets.map((m) => (
                <th key={m} className="px-2 py-1.5 text-center text-th-text-muted font-medium">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => (
              <tr key={brand}>
                <td className="px-2 py-1.5 font-medium text-th-text-secondary">{brand}</td>
                {markets.map((market) => {
                  const cell = getCell(brand, market)
                  if (!cell) {
                    return <td key={market} className="px-2 py-1.5 text-center text-th-text-muted">—</td>
                  }
                  return (
                    <td key={market} className="px-1 py-1">
                      <div className={`rounded px-2 py-1.5 text-center ${getAcosBg(cell.acos)}`}>
                        <span className="font-semibold">{cell.acos.toFixed(1)}%</span>
                        {cell.delta !== 0 && (
                          <span className={`ml-1 text-[10px] ${getDeltaColor(cell.delta)}`}>
                            {cell.delta > 0 ? '+' : ''}{cell.delta.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-th-border">
        <span className="text-[10px] text-th-text-muted">ACoS:</span>
        <div className="flex gap-1">
          {[
            { label: '<15%', cls: 'bg-emerald-50 text-emerald-700' },
            { label: '15-25%', cls: 'bg-emerald-100 text-emerald-800' },
            { label: '25-35%', cls: 'bg-orange-50 text-orange-700' },
            { label: '35-50%', cls: 'bg-orange-100 text-orange-800' },
            { label: '>50%', cls: 'bg-red-50 text-red-700' },
          ].map((l) => (
            <span key={l.label} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${l.cls}`}>
              {l.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export { AcosHeatmap }
