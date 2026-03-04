import { cn } from '@/lib/utils/cn'

type CardProps = {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export const Card = ({ children, className, hover = false }: CardProps) => {
  return (
    <div className={cn(
      'rounded-xl border border-th-border bg-surface-card shadow-sm',
      hover && 'hover-lift cursor-pointer',
      className,
    )}>
      {children}
    </div>
  )
}

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

export const CardContent = ({ children, className }: CardContentProps) => {
  return <div className={cn('px-6 py-5', className)}>{children}</div>
}
