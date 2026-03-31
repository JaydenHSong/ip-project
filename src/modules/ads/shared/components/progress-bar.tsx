// Design Ref: §2.1 shared/components — 예산 소진율 등
'use client'

type ProgressBarProps = {
  value: number  // 0-100
  label?: string
  showPercent?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const getBarColor = (value: number): string => {
  if (value >= 90) return 'bg-red-500'
  if (value >= 75) return 'bg-orange-500'
  return 'bg-emerald-500'
}

const ProgressBar = ({
  value,
  label,
  showPercent = true,
  size = 'sm',
  className = '',
}: ProgressBarProps) => {
  const clamped = Math.min(100, Math.max(0, value))
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5'

  return (
    <div className={className}>
      {(label || showPercent) && (
        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
          {label && <span>{label}</span>}
          {showPercent && <span>{clamped.toFixed(0)}%</span>}
        </div>
      )}
      <div className={`w-full rounded-full bg-gray-100 ${height}`}>
        <div
          className={`${height} rounded-full transition-all ${getBarColor(clamped)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

export { ProgressBar }
