// BR (Brand Registry) Contact Support 폼 타입 매핑
// V01~V19 위반 유형 → BR 폼 타입 매핑

export type BrFormType =
  | 'other_policy'
  | 'incorrect_variation'
  | 'product_review'

// 좌측 트리 메뉴에서 클릭할 텍스트 (정확히 일치해야 함)
export const BR_MENU_TEXT: Record<BrFormType, string> = {
  other_policy: 'Other policy violations',
  incorrect_variation: 'Incorrect variation',
  product_review: 'Product review violation',
} as const

// 상위 메뉴 — 펼쳐져 있어야 하위 메뉴가 보임
export const BR_PARENT_MENU_TEXT = 'Report a store policy violation'

// V01~V19 → BR 폼 타입 매핑
// null = BR Track 대상 아님 (IP 위반은 RAV 경로 사용)
export const BR_VIOLATION_MAP: Record<string, BrFormType | null> = {
  // IP — BR "Report a violation" (RAV) 경로, 이 엔진 대상 아님
  V01: null,
  V02: null,
  V03: null,

  // Counterfeit
  V04: 'other_policy',

  // Listing Content
  V05: 'other_policy',          // False Advertising
  V06: 'other_policy',          // Prohibited Keywords
  V07: 'other_policy',            // Inaccurate Product Info
  V08: 'other_policy',          // Image Policy
  V09: 'other_policy',          // Comparative Advertising
  V10: 'incorrect_variation',   // Variation Policy Violation

  // Review
  V11: 'product_review',        // Review Manipulation
  V12: 'product_review',        // Review Hijacking

  // Selling Practice
  V13: 'other_policy',          // Price Manipulation
  V14: 'other_policy',          // Resale Violation
  V15: 'other_policy',          // Bundling Violation

  // Regulatory
  V16: 'other_policy',          // Missing Certification
  V17: 'other_policy',          // Safety Standards
  V18: 'other_policy',          // Missing Warning Label
  V19: 'other_policy',          // Import Regulation
} as const

export const isBrReportable = (violationCode: string): boolean =>
  BR_VIOLATION_MAP[violationCode] !== null && BR_VIOLATION_MAP[violationCode] !== undefined

export const getBrFormType = (violationCode: string): BrFormType | null =>
  BR_VIOLATION_MAP[violationCode] ?? null
