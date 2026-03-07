'use client'

import { VIOLATION_TYPES, type ViolationCode } from '@/constants/violations'
import { Badge } from '@/components/ui/Badge'
import { useI18n } from '@/lib/i18n/context'

type ViolationBadgeProps = {
  code: ViolationCode
  showLabel?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const CATEGORY_VARIANT = {
  intellectual_property: 'danger',
  listing_content: 'warning',
  review_manipulation: 'violet',
  selling_practice: 'info',
  regulatory_safety: 'danger',
} as const

export const ViolationBadge = ({ code, showLabel = true, size = 'sm', className }: ViolationBadgeProps) => {
  const { t } = useI18n()
  const violation = VIOLATION_TYPES[code]

  if (!violation) {
    return <Badge className={className}>{code}</Badge>
  }

  const variant = CATEGORY_VARIANT[violation.category] ?? 'default'
  const label = t(`violations.types.${code}` as Parameters<typeof t>[0]) ?? violation.name

  return (
    <Badge variant={variant} size={size} className={className}>
      {code}{showLabel ? ` ${label}` : ''}
    </Badge>
  )
}
