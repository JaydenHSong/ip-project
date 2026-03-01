import { VIOLATION_TYPES, type ViolationCode } from '@/constants/violations'
import { Badge } from '@/components/ui/Badge'

type ViolationBadgeProps = {
  code: ViolationCode
  showLabel?: boolean
  className?: string
}

const CATEGORY_VARIANT = {
  intellectual_property: 'danger',
  listing_content: 'warning',
  review_manipulation: 'violet',
  selling_practice: 'info',
  regulatory_safety: 'danger',
} as const

export const ViolationBadge = ({ code, showLabel = true, className }: ViolationBadgeProps) => {
  const violation = VIOLATION_TYPES[code]

  if (!violation) {
    return <Badge className={className}>{code}</Badge>
  }

  const variant = CATEGORY_VARIANT[violation.category] ?? 'default'

  return (
    <Badge variant={variant} className={className}>
      {code}{showLabel ? ` ${violation.name}` : ''}
    </Badge>
  )
}
