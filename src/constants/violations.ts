// Sentinel 위반 유형 체계 (V01~V19)
// Based on: Sentinel_Project_Context.md + OMS 매핑 (D41)

export const VIOLATION_CATEGORIES = {
  intellectual_property: '지적재산권 침해',
  listing_content: '리스팅 콘텐츠 위반',
  review_manipulation: '리뷰 조작',
  selling_practice: '판매 관행 위반',
  regulatory_safety: '규제/안전 위반',
} as const

export type ViolationCategory = keyof typeof VIOLATION_CATEGORIES

export const VIOLATION_TYPES = {
  // 지적재산권 침해
  V01: { code: 'V01', name: '상표권 침해', category: 'intellectual_property' as const, severity: 'high' as const },
  V02: { code: 'V02', name: '저작권 침해 (이미지 도용)', category: 'intellectual_property' as const, severity: 'high' as const },
  V03: { code: 'V03', name: '특허 침해', category: 'intellectual_property' as const, severity: 'high' as const },
  V04: { code: 'V04', name: '위조품 판매', category: 'intellectual_property' as const, severity: 'high' as const },

  // 리스팅 콘텐츠 위반
  V05: { code: 'V05', name: '허위/과장 광고', category: 'listing_content' as const, severity: 'medium' as const },
  V06: { code: 'V06', name: '금지 키워드 사용', category: 'listing_content' as const, severity: 'medium' as const },
  V07: { code: 'V07', name: '부정확한 상품 정보', category: 'listing_content' as const, severity: 'medium' as const },
  V08: { code: 'V08', name: '이미지 정책 위반', category: 'listing_content' as const, severity: 'medium' as const },
  V09: { code: 'V09', name: '타 브랜드 비교 광고', category: 'listing_content' as const, severity: 'medium' as const },
  V10: { code: 'V10', name: 'Variation 정책 위반', category: 'listing_content' as const, severity: 'medium' as const },

  // 리뷰 조작
  V11: { code: 'V11', name: '리뷰 조작/인센티브 리뷰', category: 'review_manipulation' as const, severity: 'high' as const },
  V12: { code: 'V12', name: '리뷰 하이재킹', category: 'review_manipulation' as const, severity: 'high' as const },

  // 판매 관행 위반
  V13: { code: 'V13', name: '가격 조작', category: 'selling_practice' as const, severity: 'medium' as const },
  V14: { code: 'V14', name: '재판매 위반', category: 'selling_practice' as const, severity: 'low' as const },
  V15: { code: 'V15', name: '번들링 위반', category: 'selling_practice' as const, severity: 'low' as const },

  // 규제/안전 위반
  V16: { code: 'V16', name: '인증 미비 (FCC/UL 등)', category: 'regulatory_safety' as const, severity: 'high' as const },
  V17: { code: 'V17', name: '안전 기준 미달', category: 'regulatory_safety' as const, severity: 'high' as const },
  V18: { code: 'V18', name: '필수 경고문 누락', category: 'regulatory_safety' as const, severity: 'medium' as const },
  V19: { code: 'V19', name: '수입 규정 위반', category: 'regulatory_safety' as const, severity: 'medium' as const },
} as const

export type ViolationCode = keyof typeof VIOLATION_TYPES

// 위반 카테고리별 그룹핑 (Extension UI 드롭다운용)
export const VIOLATION_GROUPS = Object.entries(VIOLATION_TYPES).reduce(
  (acc, [, violation]) => {
    const group = acc[violation.category] ?? []
    group.push(violation)
    acc[violation.category] = group
    return acc
  },
  {} as Record<ViolationCategory, (typeof VIOLATION_TYPES)[ViolationCode][]>,
)

// OMS 위반 유형 매핑 (마이그레이션 참조용)
export const OMS_VIOLATION_MAPPING = {
  'Variation': ['V10'],
  'Main Image': ['V08'],
  'Wrong Category': ['V07'],
  'Review Violation': ['V11', 'V12'],
  'Pre-announcement': ['V07'],
  'Duplicate Listing': ['V10'],
  'Counterfeit': ['V04'],
  'Trademark': ['V01'],
  'Copyright': ['V02'],
  'Other Concerns': ['V05', 'V06', 'V07'],
} as const
