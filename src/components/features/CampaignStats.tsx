import { Card, CardContent } from '@/components/ui/Card'

type CampaignStatsProps = {
  stats: {
    total_listings: number
    suspect_listings: number
  }
}

export const CampaignStats = ({ stats }: CampaignStatsProps) => {
  const suspectRate = stats.total_listings > 0
    ? Math.round((stats.suspect_listings / stats.total_listings) * 100)
    : 0

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardContent className="text-center">
          <p className="text-sm text-th-text-tertiary">Total Listings</p>
          <p className="mt-1 text-2xl font-bold text-th-text">{stats.total_listings}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="text-center">
          <p className="text-sm text-th-text-tertiary">Suspect Listings</p>
          <p className="mt-1 text-2xl font-bold text-st-danger-text">{stats.suspect_listings}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="text-center">
          <p className="text-sm text-th-text-tertiary">Suspect Rate</p>
          <p className="mt-1 text-2xl font-bold text-st-warning-text">{suspectRate}%</p>
        </CardContent>
      </Card>
    </div>
  )
}
