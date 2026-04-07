// S01 — Brand Pulse Card (ROAS + TACoS gauge + sparkline)
// Design Ref: §5.3 S01 "Brand Pulse Card × 3"
'use client'

import type { BrandSummary } from '../types'

type BrandPulseCardProps = {
  brand: BrandSummary
  className?: string
}

const formatCurrency = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`
  return `$${v.toFixed(0)}`
}

// Mini sparkline (SVG, no external lib)
const Sparkline = ({ data, className = '' }: { data: number[]; className?: string }) => {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 80
  const h = 24
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`${className}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

const BrandPulseCard = ({ brand, className = '' }: BrandPulseCardProps) => {
  // Aggregate across markets
  const totalSpend = brand.markets.reduce((s, m) => s + m.spend_mtd, 0)
  const totalSales = brand.markets.reduce((s, m) => s + m.sales_mtd, 0)
  const totalOrders = brand.markets.reduce((s, m) => s + m.orders_mtd, 0)
  const avgRoas = totalSpend > 0 ? totalSales / totalSpend : 0
  const avgAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0

  // Collect sparkline data from first market that has it
  const sparkData = brand.markets.find((m) => m.roas_trend.length > 0)?.roas_trend ?? []

  return (
    <div className={`rounded-lg border border-th-border bg-surface-card p-5 ${className}`}>
      {/* Brand name */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-th-text">{brand.brand_name}</h3>
        <span className="text-xs text-th-text-muted">{brand.markets.length} markets</span>
      </div>

      {/* ROAS hero + sparkline */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="text-xs text-th-text-muted">ROAS</p>
          <p className="text-3xl font-bold text-th-text">{avgRoas.toFixed(2)}x</p>
        </div>
        {sparkData.length > 0 && (
          <Sparkline data={sparkData} className="h-6 w-20 text-orange-500" />
        )}
      </div>

      {/* TACoS gauge */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-th-text-muted">ACoS</span>
          <span className={`font-medium ${avgAcos > 30 ? 'text-red-600' : avgAcos > 20 ? 'text-orange-600' : 'text-emerald-600'}`}>
            {avgAcos.toFixed(1)}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-th-bg-tertiary">
          <div
            className={`h-1.5 rounded-full transition-all ${
              avgAcos > 30 ? 'bg-red-500' : avgAcos > 20 ? 'bg-orange-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(avgAcos, 100)}%` }}
          />
        </div>
      </div>

      {/* Bottom stats */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-th-border">
        <div>
          <p className="text-[11px] text-th-text-muted">Spend</p>
          <p className="text-xs font-semibold text-th-text-secondary">{formatCurrency(totalSpend)}</p>
        </div>
        <div>
          <p className="text-[11px] text-th-text-muted">Sales</p>
          <p className="text-xs font-semibold text-th-text-secondary">{formatCurrency(totalSales)}</p>
        </div>
        <div>
          <p className="text-[11px] text-th-text-muted">Orders</p>
          <p className="text-xs font-semibold text-th-text-secondary">{totalOrders.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

export { BrandPulseCard }
