'use client'

import dynamic from 'next/dynamic'
import { useDashboardContext } from './DashboardContext'

const AiPerformanceCard = dynamic(
  () => import('@/components/features/charts/AiPerformanceCard').then((m) => m.AiPerformanceCard),
  { ssr: false, loading: () => <div className="h-[280px] animate-pulse rounded-lg bg-th-bg-secondary" /> }
)

export const AiPerformanceWidget = () => {
  const { stats, navigateToReports } = useDashboardContext()
  if (!stats) return <div className="h-[280px] animate-pulse rounded-lg bg-th-bg-secondary" />
  return (
    <AiPerformanceCard
      data={stats.aiPerformance}
      onClickDisagreement={() => navigateToReports({ disagreement: 'true' })}
    />
  )
}
