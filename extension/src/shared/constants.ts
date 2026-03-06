// Sentinel 위반 유형 체계 (Web src/constants/violations.ts와 동기화)

export const VIOLATION_CATEGORIES = {
  intellectual_property: 'Intellectual Property',
  listing_content: 'Listing Content',
  review_manipulation: 'Review Manipulation',
  selling_practice: 'Selling Practice',
  regulatory_safety: 'Regulatory / Safety',
} as const

export type ViolationCategory = keyof typeof VIOLATION_CATEGORIES

export const VIOLATION_TYPES = {
  V01: { code: 'V01' as const, nameEn: 'Trademark Infringement', nameKo: '상표권 침해', category: 'intellectual_property' as const, severity: 'high' as const },
  V02: { code: 'V02' as const, nameEn: 'Copyright Infringement', nameKo: '저작권 침해', category: 'intellectual_property' as const, severity: 'high' as const },
  V03: { code: 'V03' as const, nameEn: 'Patent Infringement', nameKo: '특허 침해', category: 'intellectual_property' as const, severity: 'high' as const },
  V04: { code: 'V04' as const, nameEn: 'Counterfeit Product', nameKo: '위조 상품', category: 'intellectual_property' as const, severity: 'high' as const },
  V05: { code: 'V05' as const, nameEn: 'False Advertising', nameKo: '허위 광고', category: 'listing_content' as const, severity: 'medium' as const },
  V06: { code: 'V06' as const, nameEn: 'Prohibited Keywords', nameKo: '금지 키워드', category: 'listing_content' as const, severity: 'medium' as const },
  V07: { code: 'V07' as const, nameEn: 'Inaccurate Product Info', nameKo: '부정확한 상품 정보', category: 'listing_content' as const, severity: 'medium' as const },
  V08: { code: 'V08' as const, nameEn: 'Image Policy Violation', nameKo: '이미지 정책 위반', category: 'listing_content' as const, severity: 'medium' as const },
  V09: { code: 'V09' as const, nameEn: 'Comparative Advertising', nameKo: '비교 광고', category: 'listing_content' as const, severity: 'medium' as const },
  V10: { code: 'V10' as const, nameEn: 'Variation Policy Violation', nameKo: '변형 정책 위반', category: 'listing_content' as const, severity: 'medium' as const },
  V11: { code: 'V11' as const, nameEn: 'Review Manipulation', nameKo: '리뷰 조작', category: 'review_manipulation' as const, severity: 'high' as const },
  V12: { code: 'V12' as const, nameEn: 'Review Hijacking', nameKo: '리뷰 하이재킹', category: 'review_manipulation' as const, severity: 'high' as const },
  V13: { code: 'V13' as const, nameEn: 'Price Manipulation', nameKo: '가격 조작', category: 'selling_practice' as const, severity: 'medium' as const },
  V14: { code: 'V14' as const, nameEn: 'Resale Violation', nameKo: '재판매 위반', category: 'selling_practice' as const, severity: 'low' as const },
  V15: { code: 'V15' as const, nameEn: 'Bundling Violation', nameKo: '번들링 위반', category: 'selling_practice' as const, severity: 'low' as const },
  V16: { code: 'V16' as const, nameEn: 'Missing Certification (FCC/UL)', nameKo: '인증 누락 (FCC/UL)', category: 'regulatory_safety' as const, severity: 'high' as const },
  V17: { code: 'V17' as const, nameEn: 'Safety Standards Failure', nameKo: '안전 기준 미달', category: 'regulatory_safety' as const, severity: 'high' as const },
  V18: { code: 'V18' as const, nameEn: 'Missing Warning Label', nameKo: '경고 라벨 누락', category: 'regulatory_safety' as const, severity: 'medium' as const },
  V19: { code: 'V19' as const, nameEn: 'Import Regulation Violation', nameKo: '수입 규정 위반', category: 'regulatory_safety' as const, severity: 'medium' as const },
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
