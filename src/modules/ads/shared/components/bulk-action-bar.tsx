// Design Ref: §2.1 shared/components — 다크 벌크 액션 바
'use client'

type BulkAction = {
  key: string
  label: string
  variant?: 'default' | 'danger'
}

type BulkActionBarProps = {
  selectedCount: number
  actions: BulkAction[]
  onAction: (actionKey: string) => void
  onClear: () => void
}

const BulkActionBar = ({ selectedCount, actions, onAction, onClear }: BulkActionBarProps) => {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-th-text px-4 py-2.5 shadow-lg">
      <div className="flex items-center gap-3">
        <span className="text-sm text-white">
          <span className="font-medium">{selectedCount}</span> selected
        </span>
        <div className="h-4 w-px bg-th-bg-tertiary" />
        {actions.map((action) => (
          <button
            key={action.key}
            onClick={() => onAction(action.key)}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
              action.variant === 'danger'
                ? 'text-red-400 hover:bg-red-900/30'
                : 'text-white hover:bg-th-bg-tertiary'
            }`}
          >
            {action.label}
          </button>
        ))}
        <div className="h-4 w-px bg-th-bg-tertiary" />
        <button
          onClick={onClear}
          className="text-sm text-th-text-muted hover:text-white"
        >
          Clear
        </button>
      </div>
    </div>
  )
}

export { BulkActionBar }
export type { BulkAction }
