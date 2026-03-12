'use client'

import { BR_FORM_TYPES, BR_FORM_TYPE_VARIANT, type BrFormTypeCode } from '@/constants/br-form-types'
import { Badge } from '@/components/ui/Badge'

type ViolationBadgeProps = {
  code: BrFormTypeCode | string
  showLabel?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export const ViolationBadge = ({ code, showLabel = true, size = 'sm', className }: ViolationBadgeProps) => {
  const formType = BR_FORM_TYPES[code as BrFormTypeCode]

  if (formType) {
    const variant = BR_FORM_TYPE_VARIANT[code as BrFormTypeCode] ?? 'default'
    return (
      <Badge variant={variant} size={size} className={className}>
        {showLabel ? formType.label : formType.code}
      </Badge>
    )
  }

  // 알 수 없는 코드 (레거시 V01~V19 등)
  return <Badge className={className}>{code}</Badge>
}
