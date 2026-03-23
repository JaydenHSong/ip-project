'use client'

import dynamic from 'next/dynamic'
import { useI18n } from '@/lib/i18n/context'
import { useDashboardContext } from './DashboardContext'

const TopViolationsChart = dynamic(
  () => import('@/components/features/charts/TopViolationsChart').then((m) => m.TopViolationsChart),
  { ssr: false, loading: () => <div className="h-[350px] animate-pulse rounded-lg bg-th-bg-secondary" /> }
)

export const TopViolationsWidget = () => {
  const { t } = useI18n()
  const { stats, navigateToReports } = useDashboardContext()
  if (!stats) return <div className="h-[350px] animate-pulse rounded-lg bg-th-bg-secondary" />
  return (
    <TopViolationsChart
      data={stats.topViolations.map((d) => ({
        ...d,
        name: t(`violations.types.${d.code}` as Parameters<typeof t>[0]) ?? d.name,
      }))}
      onClickItem={(code) => navigateToReports({ violation_type: code })}
    />
  )
}
