'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useI18n } from '@/lib/i18n/context'

type TopViolationsChartProps = {
  data: { code: string; name: string; count: number }[]
  onClickItem?: (code: string) => void
}

export const TopViolationsChart = ({ data, onClickItem }: TopViolationsChartProps) => {
  const { t } = useI18n()

  return (
    <div>
      <div role="img" aria-label="Top violation types chart" className="h-[200px] md:h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-th-border, #374151)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-th-text-muted, #9ca3af)' }} />
            <YAxis
              type="category"
              dataKey="code"
              width={50}
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
              formatter={(value: unknown, _name: unknown, props: unknown) => {
                const v = Number(value)
                const p = props as { payload?: { name?: string } }
                return [`${v} cases`, p?.payload?.name ?? '']
              }}
            />
            <Bar
              dataKey="count"
              fill="#3b82f6"
              radius={[0, 4, 4, 0]}
              style={onClickItem ? { cursor: 'pointer' } : undefined}
              onClick={onClickItem ? (_: unknown, index: number) => {
                const entry = data[index]
                if (entry) onClickItem(entry.code)
              } : undefined}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
