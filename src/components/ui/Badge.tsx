import { cn } from '@/lib/utils/cn'

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'violet'

type BadgeProps = {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const VARIANT_STYLES = {
  default: 'bg-st-default-bg text-st-default-text',
  success: 'bg-st-success-bg text-st-success-text',
  warning: 'bg-st-warning-bg text-st-warning-text',
  danger: 'bg-st-danger-bg text-st-danger-text',
  info: 'bg-st-info-bg text-st-info-text',
  violet: 'bg-st-violet-bg text-st-violet-text',
} as const

export const Badge = ({ children, variant = 'default', className }: BadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        VARIANT_STYLES[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
