'use client'

type CampaignsContextHeaderProps = {
  marketLabel: string | null
  campaignTotal: number
  userDisplayName: string | null
  isLoading?: boolean
}

const CampaignsContextHeader = ({
  marketLabel,
  campaignTotal,
  userDisplayName,
  isLoading,
}: CampaignsContextHeaderProps) => {
  if (isLoading) {
    return <div className="h-5 w-full max-w-md animate-pulse rounded bg-th-bg-hover" />
  }

  const parts = [marketLabel, `${campaignTotal} campaigns`, userDisplayName].filter(Boolean)
  if (parts.length === 0) {
    return <p className="text-sm text-th-text-muted">Select a market to see context.</p>
  }

  return (
    <p className="text-sm text-th-text-muted">
      {parts.join(' · ')}
    </p>
  )
}

export { CampaignsContextHeader }
