'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { useI18n } from '@/lib/i18n/context'

type CampaignStatsProps = {
  stats: {
    total_listings: number
    suspect_listings: number
  }
}

export const CampaignStats = ({ stats }: CampaignStatsProps) => {
  const { t } = useI18n()

  const suspectRate = stats.total_listings > 0
    ? Math.round((stats.suspect_listings / stats.total_listings) * 100)
    : 0

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardContent className="text-center">
          <p className="text-sm text-th-text-tertiary">{t('stats.totalListings')}</p>
          <p className="mt-1 text-2xl font-bold text-th-text">{stats.total_listings}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="text-center">
          <p className="text-sm text-th-text-tertiary">{t('stats.suspectListings')}</p>
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
