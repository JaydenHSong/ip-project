'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-th-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'rounded-lg border border-th-border-secondary bg-surface-card px-3 py-2 text-sm text-th-text placeholder-th-text-muted transition-colors focus:border-th-accent focus:outline-none focus:ring-1 focus:ring-th-accent disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-st-danger-text focus:border-st-danger-text focus:ring-st-danger-text',
            className,
          )}
          {...props}
        />
        {error && <p className="text-sm text-st-danger-text">{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
