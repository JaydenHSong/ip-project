// V01~V19 → SC "Report a Violation" 위반 유형 매핑
// SC 드롭다운의 정확한 value는 실제 PD 페이지에서 확인 후 업데이트

import type { ViolationCode } from './constants'

export const SC_VIOLATION_MAP: Record<ViolationCode, string> = {
  // 지적재산권 침해
  V01: 'trademark',
  V02: 'copyright',
  V03: 'patent',
  V04: 'counterfeit',

  // 리스팅 콘텐츠 위반
  V05: 'misleading_claims',
  V06: 'prohibited_content',
  V07: 'inaccurate_information',
  V08: 'image_violation',
  V09: 'comparative_advertising',
  V10: 'variation_abuse',

  // 리뷰 조작
  V11: 'review_manipulation',
  V12: 'review_hijacking',

  // 판매 관행 위반
  V13: 'pricing_abuse',
  V14: 'unauthorized_reseller',
  V15: 'bundling_violation',

  // 규제/안전 위반
  V16: 'missing_certification',
  V17: 'safety_violation',
  V18: 'missing_warnings',
  V19: 'import_violation',
} as const

export type ScViolationType = (typeof SC_VIOLATION_MAP)[ViolationCode]

// SC 위반 유형 → Sentinel 코드 역매핑
export const SC_TO_SENTINEL_MAP = Object.entries(SC_VIOLATION_MAP).reduce(
  (acc, [code, scType]) => {
    acc[scType] = code as ViolationCode
    return acc
  },
  {} as Record<string, ViolationCode>,
)
