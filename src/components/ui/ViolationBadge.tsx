'use client'

import { VIOLATION_TYPES, VIOLATION_CATEGORIES, type ViolationCode } from '@/constants/violations'
import { Badge } from '@/components/ui/Badge'
import { useI18n } from '@/lib/i18n/context'

type ViolationBadgeProps = {
  code: ViolationCode | string
  showLabel?: boolean
  size?: 'sm' | 'md'
  className?: string
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'violet'

const CATEGORY_VARIANT: Record<string, BadgeVariant> = {
  intellectual_property: 'danger',
  listing_content: 'warning',
  review_manipulation: 'violet',
  selling_practice: 'info',
  regulatory_safety: 'danger',
  // Extension 신규 카테고리
  variation: 'warning',
  main_image: 'info',
  wrong_category: 'violet',
  pre_announcement: 'info',
  review_violation: 'violet',
}

export const ViolationBadge = ({ code, showLabel = true, size = 'sm', className }: ViolationBadgeProps) => {
  const { t } = useI18n()
  const violation = VIOLATION_TYPES[code as ViolationCode]

  // V01~V19: 기존 로직
  if (violation) {
    const variant = CATEGORY_VARIANT[violation.category] ?? 'default'
    const label = t(`violations.types.${code}` as Parameters<typeof t>[0]) ?? violation.name
    return (
      <Badge variant={variant} size={size} className={className}>
        {code}{showLabel ? ` ${label}` : ''}
      </Badge>
    )
  }

  // 신규 카테고리 (variation, main_image 등): 카테고리명으로 표시
  const categoryName = VIOLATION_CATEGORIES[code as keyof typeof VIOLATION_CATEGORIES]
  if (categoryName) {
    const variant = CATEGORY_VARIANT[code] ?? 'default'
    return (
      <Badge variant={variant} size={size} className={className}>
        {categoryName}
      </Badge>
    )
  }

  // 알 수 없는 코드
  return <Badge className={className}>{code}</Badge>
}
