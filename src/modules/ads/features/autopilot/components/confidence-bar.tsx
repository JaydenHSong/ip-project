// Autopilot — Confidence Bar (visual progress with stages)
// Design Ref: §2.1 autopilot/components/confidence-bar.tsx
'use client'

type ConfidenceBarProps = {
  score: number  // 0-100
  className?: string
}

const getStage = (score: number): { label: string; color: string } => {
  if (score < 30) return { label: 'Initializing', color: 'bg-red-500' }
  if (score < 50) return { label: 'Learning', color: 'bg-orange-500' }
  if (score < 70) return { label: 'Calibrating', color: 'bg-orange-400' }
  if (score < 90) return { label: 'Optimizing', color: 'bg-emerald-400' }
  return { label: 'Confident', color: 'bg-emerald-500' }
}

const ConfidenceBar = ({ score, className = '' }: ConfidenceBarProps) => {
  const stage = getStage(score)

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-th-text-muted">AI Confidence</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-th-text-secondary">{stage.label}</span>
          <span className="text-xs font-semibold text-th-text">{score}%</span>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-th-bg-tertiary">
        <div
          className={`h-2 rounded-full transition-all ${stage.color}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      {/* Stage markers */}
      <div className="flex justify-between mt-0.5">
        {[30, 50, 70, 90].map((threshold) => (
          <div
            key={threshold}
            className="text-[8px] text-th-text-muted"
            style={{ marginLeft: `${threshold - 5}%` }}
          >
            |
          </div>
        ))}
      </div>
    </div>
  )
}

export { ConfidenceBar }
