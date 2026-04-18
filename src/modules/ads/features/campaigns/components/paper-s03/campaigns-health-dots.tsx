'use client'

type CampaignsHealthDotsProps = {
  critical: number
  attention: number
  onTrack: number
  isLoading?: boolean
}

const DotRow = ({
  colorClass,
  label,
  value,
}: {
  colorClass: string
  label: string
  value: number
}) => (
  <div className="flex items-center gap-1.5 text-xs text-th-text-secondary">
    <span className={`h-2 w-2 shrink-0 rounded-full ${colorClass}`} aria-hidden />
    <span className="font-medium tabular-nums text-th-text">{value}</span>
    <span className="text-th-text-muted">{label}</span>
  </div>
)

const CampaignsHealthDots = ({ critical, attention, onTrack, isLoading }: CampaignsHealthDotsProps) => {
  if (isLoading) {
    return <div className="h-6 w-full max-w-lg animate-pulse rounded bg-th-bg-hover" />
  }

  return (
    <div className="flex flex-wrap items-center gap-4" aria-label="Campaign health summary">
      <DotRow colorClass="bg-red-500" label="Critical" value={critical} />
      <DotRow colorClass="bg-orange-500" label="Attention" value={attention} />
      <DotRow colorClass="bg-th-text-muted/40" label="On Track" value={onTrack} />
    </div>
  )
}

export { CampaignsHealthDots }
