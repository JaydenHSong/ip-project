'use client'

import dynamic from 'next/dynamic'
import { useDashboardContext } from './DashboardContext'

const ReportTrendChart = dynamic(
  () => import('@/components/features/charts/ReportTrendChart').then((m) => m.ReportTrendChart),
  { ssr: false, loading: () => <div className="h-[280px] animate-pulse rounded-lg bg-th-bg-secondary" /> }
)

export const ReportTrendWidget = () => {
  const { stats } = useDashboardContext()
  if (!stats) return <div className="h-[280px] animate-pulse rounded-lg bg-th-bg-secondary" />
  return <ReportTrendChart data={stats.reportTrend} />
}
