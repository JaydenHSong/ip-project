import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

type CardProps = {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ children, className, hover = false }, ref) => {
  return (
    <div ref={ref} className={cn(
      'rounded-xl border border-th-border bg-surface-card shadow-sm',
      hover && 'hover-lift cursor-pointer',
      className,
    )}>
      {children}
    </div>
  )
})
Card.displayName = 'Card'

type CardHeaderProps = {
  children: React.ReactNode
  className?: string
}

export const CardHeader = ({ children, className }: CardHeaderProps) => {
  return (
    <div className={cn('border-b border-th-border px-6 py-5', className)}>
      {children}
    </div>
  )
}

type CardContentProps = {
  children: React.ReactNode
  className?: string
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(({ children, className }, ref) => {
  return <div ref={ref} className={cn('px-6 py-5', className)}>{children}</div>
})
CardContent.displayName = 'CardContent'
