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
  /** `dense`: dashboard strip / 8-up grids (matches AD campaign status strip). */
  variant?: 'default' | 'dense'
  hint?: string
  className?: string
}

const KpiCard = ({
  label,
  value,
  prefix,
  suffix,
  trend,
  trendValue,
  variant = 'default',
  hint,
  className = '',
}: KpiCardProps) => {
  const isDense = variant === 'dense'
  return (
    <div
      className={`rounded-lg border border-th-border bg-surface-card ${
        isDense ? 'px-3 py-2.5' : 'p-4'
      } ${className}`}
    >
      <p
        className={
          isDense
            ? 'text-[10px] font-medium uppercase tracking-wide text-th-text-muted'
            : 'text-xs text-th-text-muted'
        }
      >
        {label}
      </p>
      <p
        className={`font-semibold text-th-text ${
          isDense ? 'mt-1 text-base leading-none' : 'mt-1 text-2xl'
        }`}
      >
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
        {suffix
          ? isDense
            ? <span className="text-[10px] font-medium text-th-text-muted">{suffix}</span>
            : suffix
          : null}
      </p>
      {hint ? <p className="mt-0.5 text-[10px] leading-snug text-th-text-muted">{hint}</p> : null}
      {!isDense && trend && trendValue && (
        <div className="mt-1">
          <TrendTag direction={trend} value={trendValue} />
        </div>
      )}
    </div>
  )
}

export { KpiCard }
