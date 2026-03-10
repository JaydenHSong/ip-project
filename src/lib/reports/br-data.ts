// BR (Brand Registry) Contact Support 제출 데이터 빌드 유틸리티
// Report + Listing 정보로 BR 폼 데이터 생성

import type { BrSubmitData, BrFormType } from '@/types/reports'

// V01~V19 → BR 폼 타입 매핑
// null = BR Track 대상 아님 (IP 위반은 RAV 경로 사용)
// extension/src/shared/br-report-config.ts와 동기화 필수
const BR_VIOLATION_MAP: Record<string, BrFormType | null> = {
  V01: null,
  V02: null,
  V03: null,
  V04: 'other_policy',
  V05: 'other_policy',
  V06: 'other_policy',
  V07: 'product_not_as_described',
  V08: 'other_policy',
  V09: 'other_policy',
  V10: 'incorrect_variation',
  V11: 'product_review',
  V12: 'product_review',
  V13: 'other_policy',
  V14: 'other_policy',
  V15: 'other_policy',
  V16: 'other_policy',
  V17: 'other_policy',
  V18: 'other_policy',
  V19: 'other_policy',
}

type BuildBrDataInput = {
  report: {
    id: string
    user_violation_type: string
    draft_body: string | null
    draft_title: string | null
  }
  listing: {
    asin: string
    url: string | null
    marketplace?: string
    seller_storefront_url?: string | null
  }
}

export const isBrReportable = (violationCode: string): boolean =>
  BR_VIOLATION_MAP[violationCode] !== null && BR_VIOLATION_MAP[violationCode] !== undefined

export const getBrFormType = (violationCode: string): BrFormType | null =>
  BR_VIOLATION_MAP[violationCode] ?? null

export const buildBrSubmitData = ({ report, listing }: BuildBrDataInput): BrSubmitData | null => {
  const formType = BR_VIOLATION_MAP[report.user_violation_type]
  if (!formType) return null

  const productUrls: string[] = []
  if (listing.url) {
    productUrls.push(listing.url)
  } else if (listing.asin) {
    productUrls.push(`https://www.amazon.com/dp/${listing.asin}`)
  }

  const data: BrSubmitData = {
    form_type: formType,
    description: report.draft_body ?? '',
    product_urls: productUrls,
    prepared_at: new Date().toISOString(),
  }

  // 폼 타입별 추가 필드
  if (listing.seller_storefront_url) {
    data.seller_storefront_url = listing.seller_storefront_url
  }

  if (listing.asin) {
    data.asins = [listing.asin]
  }

  return data
}
