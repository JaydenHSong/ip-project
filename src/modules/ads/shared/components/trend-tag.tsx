// Design Ref: §2.1 shared/components — Rising/Emerging/Stable/Declining

import type { TrendDirection } from '../types'

type TrendTagProps = {
  direction: TrendDirection
  value?: string
  className?: string
}

const TREND_STYLES: Record<TrendDirection, { color: string; icon: string }> = {
  improving: { color: 'text-emerald-600', icon: '↑' },
  stable: { color: 'text-gray-500', icon: '→' },
  worsening: { color: 'text-red-600', icon: '↓' },
}

const TrendTag = ({ direction, value, className = '' }: TrendTagProps) => {
  const style = TREND_STYLES[direction]
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${style.color} ${className}`}>
      {style.icon} {value}
    </span>
  )
}

export { TrendTag }
