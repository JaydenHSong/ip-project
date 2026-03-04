'use client'

import { cn } from '@/lib/utils/cn'

type ToggleProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export const Toggle = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className,
}: ToggleProps) => {
  const sizes = {
    sm: { track: 'h-5 w-9', thumb: 'h-3.5 w-3.5', translate: 'translate-x-4' },
    md: { track: 'h-6 w-11', thumb: 'h-4.5 w-4.5', translate: 'translate-x-5' },
  }

  const s = sizes[size]

  return (
    <label
      className={cn(
        'inline-flex items-center gap-3',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className,
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex shrink-0 rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-accent focus-visible:ring-offset-2',
          s.track,
          checked ? 'bg-th-accent' : 'bg-th-border-secondary',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out',
            s.thumb,
            checked ? s.translate : 'translate-x-0.5',
            'mt-[3px] ml-[1px]',
          )}
        />
      </button>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-sm font-medium text-th-text">{label}</span>
          )}
          {description && (
            <span className="text-xs text-th-text-muted">{description}</span>
          )}
        </div>
      )}
    </label>
  )
}
