import { cn } from '@/lib/utils/cn'

type CardProps = {
  children: React.ReactNode
  className?: string
}

export const Card = ({ children, className }: CardProps) => {
  return (
    <div className={cn('rounded-lg border border-th-border bg-surface-card', className)}>
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
    <div className={cn('border-b border-th-border px-6 py-4', className)}>
      {children}
    </div>
  )
}

type CardContentProps = {
  children: React.ReactNode
  className?: string
}

export const CardContent = ({ children, className }: CardContentProps) => {
  return <div className={cn('px-6 py-4', className)}>{children}</div>
}
