import { cn } from '@/lib/utils/cn'

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'violet'

type BadgeSize = 'sm' | 'md'

type BadgeProps = {
  children: React.ReactNode
  variant?: BadgeVariant
  dot?: boolean
  size?: BadgeSize
  className?: string
}

const SIZE_STYLES = {
  sm: 'px-2.5 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
} as const

const VARIANT_STYLES = {
  default: 'bg-st-default-bg text-st-default-text',
  success: 'bg-st-success-bg text-st-success-text',
  warning: 'bg-st-warning-bg text-st-warning-text',
  danger: 'bg-st-danger-bg text-st-danger-text',
  info: 'bg-st-info-bg text-st-info-text',
  violet: 'bg-st-violet-bg text-st-violet-text',
} as const

const DOT_COLORS = {
  default: 'bg-st-default-text',
  success: 'bg-st-success-text',
  warning: 'bg-st-warning-text',
  danger: 'bg-st-danger-text',
  info: 'bg-st-info-text',
  violet: 'bg-st-violet-text',
} as const

export const Badge = ({ children, variant = 'default', dot = false, size = 'sm', className }: BadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        SIZE_STYLES[size],
        VARIANT_STYLES[variant],
        className,
      )}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', DOT_COLORS[variant])} />
      )}
      {children}
    </span>
  )
}
