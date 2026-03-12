// BR Form Type 체계 (v2) — violations.ts (V01~V19) 대체
// Extension 카테고리 = BR 폼 타입 = 템플릿 카테고리 (1:1:1)

export const BR_FORM_TYPES = {
  ip_violation: {
    code: 'ip_violation' as const,
    label: 'IP Violation',
    amazonMenu: 'Report an Intellectual Property (IP) violation',
    subject: '',
    descriptionLabel: '',
    fields: ['description'],
    note: 'RAV (Report a Violation) 도구 경유',
  },
  incorrect_variation: {
    code: 'incorrect_variation' as const,
    label: 'Incorrect Variation',
    amazonMenu: 'Report a store policy violation > Incorrect variation',
    subject: 'Product incorrectly added as a variation of another product listing',
    descriptionLabel: 'Describe what makes the product an incorrect variation of the original product listing.',
    fields: ['description', 'product_urls'],
  },
  product_review: {
    code: 'product_review' as const,
    label: 'Product Review Violation',
    amazonMenu: 'Report a store policy violation > Product review violation',
    subject: 'Product review violation',
    descriptionLabel: 'Describe the review policy violation.',
    fields: ['description', 'asins', 'review_urls', 'order_id'],
  },
  other_policy: {
    code: 'other_policy' as const,
    label: 'Other Policy Violations',
    amazonMenu: 'Report a store policy violation > Other policy violations',
    subject: 'Other policy violations',
    descriptionLabel: 'Describe which Amazon policy is being violated and how the specified party is violating it.',
    fields: ['description', 'product_urls', 'seller_storefront_url', 'policy_url'],
  },
} as const

export type BrFormTypeCode = keyof typeof BR_FORM_TYPES

export const BR_FORM_TYPE_CODES = Object.keys(BR_FORM_TYPES) as BrFormTypeCode[]

// 드롭다운/필터용 옵션 배열
export const BR_FORM_TYPE_OPTIONS: { value: BrFormTypeCode; label: string }[] =
  BR_FORM_TYPE_CODES.map((code) => ({
    value: code,
    label: BR_FORM_TYPES[code].label,
  }))

// 헬퍼
export const getBrFormTypeLabel = (code: BrFormTypeCode | string): string =>
  BR_FORM_TYPES[code as BrFormTypeCode]?.label ?? code

export const getBrFormTypeFields = (code: BrFormTypeCode): readonly string[] =>
  BR_FORM_TYPES[code].fields

export const brFormHasField = (code: BrFormTypeCode, field: string): boolean =>
  (BR_FORM_TYPES[code].fields as readonly string[]).includes(field)

// IP violation은 RAV 경로 → BR Contact Support 대상 아님
export const isBrSubmittable = (code: BrFormTypeCode): boolean =>
  code !== 'ip_violation'

// Badge variant 매핑
export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'violet'

export const BR_FORM_TYPE_VARIANT: Record<BrFormTypeCode, BadgeVariant> = {
  ip_violation: 'danger',
  incorrect_variation: 'info',
  product_review: 'violet',
  other_policy: 'warning',
}
