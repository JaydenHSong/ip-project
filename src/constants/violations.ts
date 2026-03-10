// Sentinel 위반 유형 체계 (V01~V19)
// Based on: Sentinel_Project_Context.md + OMS 매핑 (D41)

export const VIOLATION_CATEGORIES = {
  intellectual_property: 'Intellectual Property',
  listing_content: 'Listing Content',
  review_manipulation: 'Review Manipulation',
  selling_practice: 'Selling Practice',
  regulatory_safety: 'Regulatory / Safety',
} as const

export type ViolationCategory = keyof typeof VIOLATION_CATEGORIES

export const VIOLATION_TYPES = {
  // Intellectual Property
  V01: { code: 'V01', name: 'Trademark Infringement', category: 'intellectual_property' as const, severity: 'high' as const },
  V02: { code: 'V02', name: 'Copyright Infringement', category: 'intellectual_property' as const, severity: 'high' as const },
  V03: { code: 'V03', name: 'Patent Infringement', category: 'intellectual_property' as const, severity: 'high' as const },
  V04: { code: 'V04', name: 'Counterfeit Product', category: 'intellectual_property' as const, severity: 'high' as const },

  // Listing Content
  V05: { code: 'V05', name: 'False Advertising', category: 'listing_content' as const, severity: 'medium' as const },
  V06: { code: 'V06', name: 'Prohibited Keywords', category: 'listing_content' as const, severity: 'medium' as const },
  V07: { code: 'V07', name: 'Inaccurate Product Info', category: 'listing_content' as const, severity: 'medium' as const },
  V08: { code: 'V08', name: 'Image Policy Violation', category: 'listing_content' as const, severity: 'medium' as const },
  V09: { code: 'V09', name: 'Comparative Advertising', category: 'listing_content' as const, severity: 'medium' as const },
  V10: { code: 'V10', name: 'Variation Policy Violation', category: 'listing_content' as const, severity: 'medium' as const },

  // Review Manipulation
  V11: { code: 'V11', name: 'Review Manipulation', category: 'review_manipulation' as const, severity: 'high' as const },
  V12: { code: 'V12', name: 'Review Hijacking', category: 'review_manipulation' as const, severity: 'high' as const },

  // Selling Practice
  V13: { code: 'V13', name: 'Price Manipulation', category: 'selling_practice' as const, severity: 'medium' as const },
  V14: { code: 'V14', name: 'Resale Violation', category: 'selling_practice' as const, severity: 'low' as const },
  V15: { code: 'V15', name: 'Bundling Violation', category: 'selling_practice' as const, severity: 'low' as const },

  // Regulatory / Safety
  V16: { code: 'V16', name: 'Missing Certification (FCC/UL)', category: 'regulatory_safety' as const, severity: 'high' as const },
  V17: { code: 'V17', name: 'Safety Standards Failure', category: 'regulatory_safety' as const, severity: 'high' as const },
  V18: { code: 'V18', name: 'Missing Warning Label', category: 'regulatory_safety' as const, severity: 'medium' as const },
  V19: { code: 'V19', name: 'Import Regulation Violation', category: 'regulatory_safety' as const, severity: 'medium' as const },
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

// V01~V19 → SC "Report a Violation" 위반 유형 매핑
// SC 드롭다운 value는 실제 PD 페이지 확인 후 업데이트
export const SC_VIOLATION_MAP: Record<ViolationCode, string> = {
  V01: 'trademark',
  V02: 'copyright',
  V03: 'patent',
  V04: 'counterfeit',
  V05: 'misleading_claims',
  V06: 'prohibited_content',
  V07: 'inaccurate_information',
  V08: 'image_violation',
  V09: 'comparative_advertising',
  V10: 'variation_abuse',
  V11: 'review_manipulation',
  V12: 'review_hijacking',
  V13: 'pricing_abuse',
  V14: 'unauthorized_reseller',
  V15: 'bundling_violation',
  V16: 'missing_certification',
  V17: 'safety_violation',
  V18: 'missing_warnings',
  V19: 'import_violation',
} as const

// SC RAV 페이지 URL (마켓플레이스별)
export const SC_RAV_URLS: Record<string, string> = {
  US: 'https://sellercentral.amazon.com/abuse-submission/report-abuse',
  UK: 'https://sellercentral.amazon.co.uk/abuse-submission/report-abuse',
  JP: 'https://sellercentral.amazon.co.jp/abuse-submission/report-abuse',
  DE: 'https://sellercentral.amazon.de/abuse-submission/report-abuse',
  FR: 'https://sellercentral.amazon.fr/abuse-submission/report-abuse',
  IT: 'https://sellercentral.amazon.it/abuse-submission/report-abuse',
  ES: 'https://sellercentral.amazon.es/abuse-submission/report-abuse',
  CA: 'https://sellercentral.amazon.ca/abuse-submission/report-abuse',
} as const

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
