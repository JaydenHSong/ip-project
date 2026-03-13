'use client'

import { Badge } from '@/components/ui/Badge'

// 9개 세분화 표시 (Extension 카테고리 기반)
const VIOLATION_DISPLAY: Record<string, { label: string; short: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'violet' }> = {
  // IP 하위 타입 (violation_category)
  V01: { label: 'IP V01 — Trademark', short: 'IP V01', variant: 'danger' },
  V02: { label: 'IP V02 — Copyright', short: 'IP V02', variant: 'danger' },
  V03: { label: 'IP V03 — Design Patent', short: 'IP V03', variant: 'danger' },
  V04: { label: 'IP V04 — Counterfeit', short: 'IP V04', variant: 'danger' },
  // IP 카테고리 (하위 타입 미지정)
  intellectual_property: { label: 'IP Violation', short: 'IP', variant: 'danger' },
  // 비-IP 카테고리 (user_violation_type)
  variation: { label: 'Variation', short: 'Variation', variant: 'info' },
  main_image: { label: 'Main Image', short: 'Main Image', variant: 'warning' },
  wrong_category: { label: 'Wrong Category', short: 'Wrong Cat.', variant: 'warning' },
  pre_announcement: { label: 'Pre-announcement', short: 'Pre-annc.', variant: 'default' },
  review_violation: { label: 'Review Violation', short: 'Review', variant: 'violet' },
  // BR form type 폴백 (레거시 데이터)
  ip_violation: { label: 'IP Violation', short: 'IP', variant: 'danger' },
  incorrect_variation: { label: 'Variation', short: 'Variation', variant: 'info' },
  product_review: { label: 'Review Violation', short: 'Review', variant: 'violet' },
  other_policy: { label: 'Other Policy', short: 'Other', variant: 'warning' },
}

type ViolationBadgeProps = {
  code: string
  violationCategory?: string | null
  showLabel?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export const ViolationBadge = ({ code, violationCategory, showLabel = true, size = 'sm', className }: ViolationBadgeProps) => {
  // 우선순위: code(V01~V04, 세분화) > violationCategory > 폴백
  const displayKey = VIOLATION_DISPLAY[code] ? code : (violationCategory || code)
  const display = VIOLATION_DISPLAY[displayKey]

  if (display) {
    return (
      <Badge variant={display.variant} size={size} className={className}>
        {showLabel ? display.label : display.short}
      </Badge>
    )
  }

  return <Badge className={className}>{code}</Badge>
}

// 필터 드롭다운용 옵션 (9개 세분화)
export const VIOLATION_FILTER_OPTIONS = [
  { value: 'V01', label: 'IP V01 — Trademark' },
  { value: 'V02', label: 'IP V02 — Copyright' },
  { value: 'V03', label: 'IP V03 — Design Patent' },
  { value: 'V04', label: 'IP V04 — Counterfeit' },
  { value: 'variation', label: 'Variation' },
  { value: 'main_image', label: 'Main Image' },
  { value: 'wrong_category', label: 'Wrong Category' },
  { value: 'pre_announcement', label: 'Pre-announcement' },
  { value: 'review_violation', label: 'Review Violation' },
] as const
