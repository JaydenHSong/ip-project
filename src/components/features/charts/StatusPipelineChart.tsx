'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
} from 'recharts'
import { CHART_COLORS } from '@/constants/chart-colors'
import { useI18n } from '@/lib/i18n/context'

type StatusPipelineChartProps = {
  data: { status: string; statusLabel: string; count: number }[]
  onClickItem?: (status: string) => void
}

export const StatusPipelineChart = ({ data, onClickItem }: StatusPipelineChartProps) => {
  const { t } = useI18n()

  return (
    <div className="rounded-lg border border-th-border bg-surface-card p-4">
      <h3 className="mb-4 text-sm font-semibold text-th-text">
        {t('dashboard.charts.statusPipeline' as Parameters<typeof t>[0])}
      </h3>
      <div role="img" aria-label="Report status pipeline chart">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-th-text-muted, #9ca3af)' }} />
            <YAxis
              type="category"
              dataKey="statusLabel"
              width={90}
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
            />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              style={onClickItem ? { cursor: 'pointer' } : undefined}
              onClick={onClickItem ? (_: unknown, index: number) => {
                const entry = data[index]
                if (entry) onClickItem(entry.status)
              } : undefined}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={(CHART_COLORS as Record<string, string>)[entry.status] ?? '#6b7280'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
