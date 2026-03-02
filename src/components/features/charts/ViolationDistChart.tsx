'use client'

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import { CHART_COLORS } from '@/constants/chart-colors'
import { useI18n } from '@/lib/i18n/context'

type ViolationDistChartProps = {
  data: { category: string; categoryLabel: string; count: number }[]
  onClickItem?: (category: string) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  intellectual_property: CHART_COLORS.intellectual_property,
  listing_content: CHART_COLORS.listing_content,
  review_manipulation: CHART_COLORS.review_manipulation,
  selling_practice: CHART_COLORS.selling_practice,
  regulatory_safety: CHART_COLORS.regulatory_safety,
}

export const ViolationDistChart = ({ data, onClickItem }: ViolationDistChartProps) => {
  const { t } = useI18n()
  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="rounded-lg border border-th-border bg-surface-card p-4">
      <h3 className="mb-4 text-sm font-semibold text-th-text">
        {t('dashboard.charts.violationDist' as Parameters<typeof t>[0])}
      </h3>
      <div role="img" aria-label="Violation distribution chart">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="categoryLabel"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              style={onClickItem ? { cursor: 'pointer' } : undefined}
              onClick={onClickItem ? (_: unknown, index: number) => {
                const entry = data[index]
                if (entry) onClickItem(entry.category)
              } : undefined}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.category}
                  fill={CATEGORY_COLORS[entry.category] ?? '#6b7280'}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface-card, #1f2937)',
                border: '1px solid var(--color-th-border, #374151)',
                borderRadius: '8px',
                fontSize: 12,
              }}
              formatter={(value: unknown) => {
                const v = Number(value)
                return [`${v} (${total > 0 ? Math.round((v / total) * 100) : 0}%)`, '']
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-th-text text-2xl font-bold"
            >
              {total}
            </text>
          </PieChart>
        </ResponsiveContainer>
        <span className="sr-only">
          {t('dashboard.charts.total' as Parameters<typeof t>[0])}: {total}
        </span>
      </div>
    </div>
  )
}
