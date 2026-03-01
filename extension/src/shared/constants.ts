// Sentinel 위반 유형 체계 (Web src/constants/violations.ts와 동기화)

export const VIOLATION_CATEGORIES = {
  intellectual_property: '지적재산권 침해',
  listing_content: '리스팅 콘텐츠 위반',
  review_manipulation: '리뷰 조작',
  selling_practice: '판매 관행 위반',
  regulatory_safety: '규제/안전 위반',
} as const

export type ViolationCategory = keyof typeof VIOLATION_CATEGORIES

export const VIOLATION_TYPES = {
  V01: { code: 'V01' as const, name: '상표권 침해', nameEn: 'Trademark Infringement', category: 'intellectual_property' as const, severity: 'high' as const },
  V02: { code: 'V02' as const, name: '저작권 침해 (이미지 도용)', nameEn: 'Copyright Infringement', category: 'intellectual_property' as const, severity: 'high' as const },
  V03: { code: 'V03' as const, name: '특허 침해', nameEn: 'Patent Infringement', category: 'intellectual_property' as const, severity: 'high' as const },
  V04: { code: 'V04' as const, name: '위조품 판매', nameEn: 'Counterfeit Product', category: 'intellectual_property' as const, severity: 'high' as const },
  V05: { code: 'V05' as const, name: '허위/과장 광고', nameEn: 'False Advertising', category: 'listing_content' as const, severity: 'medium' as const },
  V06: { code: 'V06' as const, name: '금지 키워드 사용', nameEn: 'Prohibited Keywords', category: 'listing_content' as const, severity: 'medium' as const },
  V07: { code: 'V07' as const, name: '부정확한 상품 정보', nameEn: 'Inaccurate Product Info', category: 'listing_content' as const, severity: 'medium' as const },
  V08: { code: 'V08' as const, name: '이미지 정책 위반', nameEn: 'Image Policy Violation', category: 'listing_content' as const, severity: 'medium' as const },
  V09: { code: 'V09' as const, name: '타 브랜드 비교 광고', nameEn: 'Comparative Advertising', category: 'listing_content' as const, severity: 'medium' as const },
  V10: { code: 'V10' as const, name: 'Variation 정책 위반', nameEn: 'Variation Policy Violation', category: 'listing_content' as const, severity: 'medium' as const },
  V11: { code: 'V11' as const, name: '리뷰 조작/인센티브 리뷰', nameEn: 'Review Manipulation', category: 'review_manipulation' as const, severity: 'high' as const },
  V12: { code: 'V12' as const, name: '리뷰 하이재킹', nameEn: 'Review Hijacking', category: 'review_manipulation' as const, severity: 'high' as const },
  V13: { code: 'V13' as const, name: '가격 조작', nameEn: 'Price Manipulation', category: 'selling_practice' as const, severity: 'medium' as const },
  V14: { code: 'V14' as const, name: '재판매 위반', nameEn: 'Resale Violation', category: 'selling_practice' as const, severity: 'low' as const },
  V15: { code: 'V15' as const, name: '번들링 위반', nameEn: 'Bundling Violation', category: 'selling_practice' as const, severity: 'low' as const },
  V16: { code: 'V16' as const, name: '인증 미비 (FCC/UL 등)', nameEn: 'Missing Certification', category: 'regulatory_safety' as const, severity: 'high' as const },
  V17: { code: 'V17' as const, name: '안전 기준 미달', nameEn: 'Safety Standards Failure', category: 'regulatory_safety' as const, severity: 'high' as const },
  V18: { code: 'V18' as const, name: '필수 경고문 누락', nameEn: 'Missing Warning Label', category: 'regulatory_safety' as const, severity: 'medium' as const },
  V19: { code: 'V19' as const, name: '수입 규정 위반', nameEn: 'Import Regulation Violation', category: 'regulatory_safety' as const, severity: 'medium' as const },
} as const

export type ViolationCode = keyof typeof VIOLATION_TYPES

export const VIOLATION_GROUPS = Object.entries(VIOLATION_TYPES).reduce(
  (acc, [, violation]) => {
    const group = acc[violation.category] ?? []
    group.push(violation)
    acc[violation.category] = group
    return acc
  },
  {} as Record<ViolationCategory, (typeof VIOLATION_TYPES)[ViolationCode][]>,
)

export const MARKETPLACE_MAP: Record<string, string> = {
  'www.amazon.com': 'US',
  'www.amazon.co.uk': 'UK',
  'www.amazon.co.jp': 'JP',
  'www.amazon.de': 'DE',
  'www.amazon.fr': 'FR',
  'www.amazon.it': 'IT',
  'www.amazon.es': 'ES',
  'www.amazon.ca': 'CA',
}

export const WEB_BASE = 'https://ip-project-khaki.vercel.app'
export const API_BASE = `${WEB_BASE}/api`
