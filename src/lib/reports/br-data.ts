// BR (Brand Registry) Contact Support 제출 데이터 빌드 유틸리티
// Report + Listing 정보로 BR 폼 데이터 생성

import type { BrSubmitData, BrFormType } from '@/types/reports'

// BR 폼 타입별 description 필드 가이드 — AI 프롬프트 주입용
// crawler/src/br-submit/form-config.ts의 description 필드 기준을 미러링
const BR_FORM_DESCRIPTION_GUIDE: Record<BrFormType, string> = {
  other_policy:
    'Describe which Amazon policy is being violated and how. Be specific: cite the exact policy name, explain the violation clearly, and reference the listing content that violates it.',
  incorrect_variation:
    'Describe what makes the product an incorrect variation. Explain how this ASIN is improperly grouped with unrelated products (e.g., different brand, category, or product type) and why it does not belong in this variation family.',
  product_not_as_described:
    'Describe how the product received differs from what was described in the listing. Compare the advertised attributes (title, images, bullet points) against the actual product received.',
  product_review:
    'Describe the review policy violation. Explain how reviews were manipulated (e.g., incentivized, fake, review swapping) and provide specific evidence from the listing or seller behavior.',
}

// BR 폼 타입별 추가 컨텍스트 (어떤 필드가 채워지는지 AI에게 알림)
const BR_FORM_FIELD_CONTEXT: Record<BrFormType, string> = {
  other_policy:
    'This form also accepts: seller storefront URL and a link to the specific Amazon policy being violated.',
  incorrect_variation:
    'This form only requires the description and product URLs — keep the description focused and self-contained.',
  product_not_as_described:
    'This form also accepts: seller storefront URL and a test-buy order ID if available.',
  product_review:
    'This form also accepts: ASINs and an order ID if the violation occurred during a purchase.',
}

/**
 * Returns a prompt-injection string describing how to write the BR description
 * for the given violation code. Returns null if the violation is not BR-reportable.
 */
const getBrFormContext = (violationCode: string): string | null => {
  const formType = BR_VIOLATION_MAP[violationCode]
  if (!formType) return null

  const menuLabel: Record<BrFormType, string> = {
    other_policy: 'Other policy violations',
    incorrect_variation: 'Incorrect variation',
    product_not_as_described: 'Product not as described',
    product_review: 'Product review violation',
  }

  return [
    `## BR Form Context`,
    `This report will be submitted through Amazon Brand Registry using the **"${menuLabel[formType]}"** form.`,
    ``,
    `**How to write the description for this form:**`,
    BR_FORM_DESCRIPTION_GUIDE[formType],
    ``,
    BR_FORM_FIELD_CONTEXT[formType],
    ``,
    `Tailor the draft_body specifically for this BR form. The draft_body will be copied directly into the form's description field.`,
  ].join('\n')
}

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

export { getBrFormContext }

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
