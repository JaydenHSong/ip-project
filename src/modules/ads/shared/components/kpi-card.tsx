// Design Ref: §2.1 shared/components — KPI 숫자 카드 (재사용)

import { TrendTag } from './trend-tag'
import type { TrendDirection } from '../types'

type KpiCardProps = {
  label: string
  value: string | number
  prefix?: string
  suffix?: string
  trend?: TrendDirection | null
  trendValue?: string
  className?: string
}

const KpiCard = ({
  label,
  value,
  prefix,
  suffix,
  trend,
  trendValue,
  className = '',
}: KpiCardProps) => {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </p>
      {trend && trendValue && (
        <div className="mt-1">
          <TrendTag direction={trend} value={trendValue} />
        </div>
      )}
    </div>
  )
}

export { KpiCard }
