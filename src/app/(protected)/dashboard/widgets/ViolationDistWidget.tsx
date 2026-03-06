'use client'

import dynamic from 'next/dynamic'
import { useI18n } from '@/lib/i18n/context'
import { useDashboardContext } from './DashboardContext'

const ViolationDistChart = dynamic(
  () => import('@/components/features/charts/ViolationDistChart').then((m) => m.ViolationDistChart),
  { ssr: false, loading: () => <div className="h-[280px] animate-pulse rounded-lg bg-th-bg-secondary" /> }
)

export const ViolationDistWidget = () => {
  const { t } = useI18n()
  const { stats, navigateToReports } = useDashboardContext()
  if (!stats) return <div className="h-[280px] animate-pulse rounded-lg bg-th-bg-secondary" />
  return (
    <ViolationDistChart
      data={stats.violationDist.map((d) => ({
        ...d,
        categoryLabel: t(`violations.categories.${d.category}` as Parameters<typeof t>[0]) ?? d.categoryLabel,
      }))}
      onClickItem={(category) => navigateToReports({ category })}
    />
  )
}
