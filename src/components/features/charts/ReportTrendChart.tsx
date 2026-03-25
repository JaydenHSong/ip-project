'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { CHART_COLORS } from '@/constants/chart-colors'
import { useI18n } from '@/lib/i18n/context'

type ReportTrendChartProps = {
  data: { date: string; newReports: number; resolved: number }[]
}

const formatDate = (dateStr: unknown): string => {
  const d = new Date(String(dateStr))
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const ReportTrendChart = ({ data }: ReportTrendChartProps) => {
  const { t } = useI18n()

  return (
    <div>
      <div role="img" aria-label="Report trend chart" className="h-[200px] md:h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-th-border, #374151)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fill: 'var(--color-th-text-muted, #9ca3af)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--color-th-text-muted, #9ca3af)' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface-card, #1f2937)',
                border: '1px solid var(--color-th-border, #374151)',
                borderRadius: '8px',
                fontSize: 12,
              }}
              labelFormatter={formatDate}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="newReports"
              name={t('dashboard.charts.newReports' as Parameters<typeof t>[0])}
              stroke={CHART_COLORS.newReports}
              fill={CHART_COLORS.newReports}
              fillOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="resolved"
              name={t('dashboard.charts.resolved' as Parameters<typeof t>[0])}
              stroke={CHART_COLORS.resolvedLine}
              fill={CHART_COLORS.resolvedLine}
              fillOpacity={0.2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
