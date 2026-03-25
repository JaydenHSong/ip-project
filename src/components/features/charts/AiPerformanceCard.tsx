'use client'

import { useI18n } from '@/lib/i18n/context'

type AiPerformanceCardProps = {
  data: {
    avgConfidence: number
    disagreementRate: number
    approveRate: number
    rewriteRate: number
    rejectRate: number
  }
  onClickDisagreement?: () => void
}

const ProgressBar = ({ value, color, label }: { value: number; color: string; label: string }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs">
      <span className="text-th-text-secondary">{label}</span>
      <span className="font-medium text-th-text">{value}%</span>
    </div>
    <div className="h-2 w-full rounded-full bg-th-bg-tertiary">
      <div
        className="h-2 rounded-full transition-all"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  </div>
)

export const AiPerformanceCard = ({ data, onClickDisagreement }: AiPerformanceCardProps) => {
  const { t } = useI18n()

  return (
    <div>
      <div className="space-y-4">
        <ProgressBar
          value={data.avgConfidence}
          color="#3b82f6"
          label={t('dashboard.charts.avgConfidence' as Parameters<typeof t>[0])}
        />
        <div
          onClick={onClickDisagreement}
          className={onClickDisagreement ? 'cursor-pointer rounded-md p-1 -m-1 transition-colors hover:bg-th-bg-hover' : ''}
          role={onClickDisagreement ? 'button' : undefined}
          tabIndex={onClickDisagreement ? 0 : undefined}
          onKeyDown={onClickDisagreement ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClickDisagreement() } : undefined}
        >
          <ProgressBar
            value={data.disagreementRate}
            color={data.disagreementRate > 20 ? '#f59e0b' : '#10b981'}
            label={t('dashboard.charts.disagreementRate' as Parameters<typeof t>[0])}
          />
        </div>

        <div className="pt-2">
          <p className="mb-2 text-xs font-medium text-th-text-secondary">
            {t('dashboard.charts.decisionBreakdown' as Parameters<typeof t>[0])}
          </p>
          <div className="flex h-4 w-full overflow-hidden rounded-full">
            <div
              className="transition-all"
              style={{ width: `${data.approveRate}%`, backgroundColor: '#10b981' }}
              title={`${t('dashboard.charts.approveRate' as Parameters<typeof t>[0])}: ${data.approveRate}%`}
            />
            <div
              className="transition-all"
              style={{ width: `${data.rewriteRate}%`, backgroundColor: '#f59e0b' }}
              title={`${t('dashboard.charts.rewriteRate' as Parameters<typeof t>[0])}: ${data.rewriteRate}%`}
            />
            <div
              className="transition-all"
              style={{ width: `${data.rejectRate}%`, backgroundColor: '#ef4444' }}
              title={`${t('dashboard.charts.rejectRate' as Parameters<typeof t>[0])}: ${data.rejectRate}%`}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-th-text-muted">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              {t('dashboard.charts.approveRate' as Parameters<typeof t>[0])} {data.approveRate}%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              {t('dashboard.charts.rewriteRate' as Parameters<typeof t>[0])} {data.rewriteRate}%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              {t('dashboard.charts.rejectRate' as Parameters<typeof t>[0])} {data.rejectRate}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
