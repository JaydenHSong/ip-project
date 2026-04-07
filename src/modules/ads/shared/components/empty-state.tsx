// Design Ref: §2.1 shared/components — 빈 상태 메시지

type EmptyStateProps = {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

const EmptyState = ({ title, description, actionLabel, onAction, className = '' }: EmptyStateProps) => {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <div className="mb-3 h-12 w-12 rounded-full bg-th-bg-tertiary" />
      <h3 className="text-sm font-medium text-th-text">{title}</h3>
      {description && <p className="mt-1 text-sm text-th-text-muted">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export { EmptyState }
