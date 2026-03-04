'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
}

const VARIANT_STYLES = {
  primary: 'bg-th-accent text-white hover:bg-th-accent-hover shadow-sm hover:shadow-md active:scale-[0.98]',
  secondary: 'bg-th-bg-tertiary text-th-text hover:bg-th-bg-hover active:scale-[0.98]',
  danger: 'bg-st-danger-text text-white hover:opacity-90 shadow-sm active:scale-[0.98]',
  ghost: 'text-th-text-secondary hover:bg-th-bg-hover active:scale-[0.98]',
  outline: 'border border-th-border text-th-text-secondary hover:bg-th-bg-hover hover:border-th-border-secondary active:scale-[0.98]',
} as const

const SIZE_STYLES = {
  sm: 'px-3.5 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
} as const

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
          VARIANT_STYLES[variant],
          SIZE_STYLES[size],
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : icon ? (
          icon
        ) : null}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'
