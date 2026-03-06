'use client'

import dynamic from 'next/dynamic'
import { useDashboardContext } from './DashboardContext'

const StatusPipelineChart = dynamic(
  () => import('@/components/features/charts/StatusPipelineChart').then((m) => m.StatusPipelineChart),
  { ssr: false, loading: () => <div className="h-[280px] animate-pulse rounded-lg bg-th-bg-secondary" /> }
)

export const StatusPipelineWidget = () => {
  const { stats, navigateToReports } = useDashboardContext()
  if (!stats) return <div className="h-[280px] animate-pulse rounded-lg bg-th-bg-secondary" />
  return (
    <StatusPipelineChart
      data={stats.statusPipeline}
      onClickItem={(status) => navigateToReports({ status })}
    />
  )
}
