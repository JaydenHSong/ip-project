'use client'

import { useI18n } from '@/lib/i18n/context'
import { cn } from '@/lib/utils/cn'

type OwnerToggleProps = {
  value: 'my' | 'all'
  onChange: (value: 'my' | 'all') => void
}

export const OwnerToggle = ({ value, onChange }: OwnerToggleProps) => {
  const { t } = useI18n()

  const options: { key: 'my' | 'all'; label: string }[] = [
    { key: 'my', label: t('common.my' as Parameters<typeof t>[0]) },
    { key: 'all', label: t('common.all') },
  ]

  return (
    <div className="flex gap-1 rounded-xl border border-th-border bg-th-bg-secondary p-1">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            value === opt.key
              ? 'bg-surface-card text-th-text shadow-sm'
              : 'text-th-text-muted hover:text-th-text-secondary',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
