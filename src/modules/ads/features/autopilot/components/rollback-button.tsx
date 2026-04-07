// Autopilot — Rollback Button (single + batch)
// Design Ref: §2.1 autopilot/components/rollback-button.tsx, §5.3 S09 "[Undo]"
'use client'

import { useState } from 'react'

type RollbackButtonProps = {
  label?: string
  onRollback: () => Promise<void>
  variant?: 'default' | 'danger'
  size?: 'sm' | 'md'
}

const RollbackButton = ({
  label = 'Undo',
  onRollback,
  variant = 'default',
  size = 'sm',
}: RollbackButtonProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)
    try {
      await onRollback()
      setIsDone(true)
      setTimeout(() => setIsDone(false), 2000)
    } finally {
      setIsLoading(false)
    }
  }

  const baseClasses = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-1.5 text-sm'
  const variantClasses = variant === 'danger'
    ? 'bg-red-500 text-white hover:bg-red-600'
    : 'border border-th-border text-th-text-secondary hover:bg-th-bg-hover'

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || isDone}
      className={`rounded-md font-medium transition-colors disabled:opacity-50 ${baseClasses} ${variantClasses}`}
    >
      {isLoading ? 'Rolling back...' : isDone ? 'Done' : label}
    </button>
  )
}

export { RollbackButton }
