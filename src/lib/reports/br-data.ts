// BR (Brand Registry) Contact Support 제출 데이터 빌드 유틸리티
// v2: br_form_type 직접 사용 (V01~V19 매핑 제거)

import type { BrSubmitData } from '@/types/reports'
import { type BrFormTypeCode, isBrSubmittable, BR_FORM_TYPES, BR_FORM_TYPE_OPTIONS } from '@/constants/br-form-types'
import { MARKETPLACES } from '@/constants/marketplaces'

// BR 폼 타입별 description 필드 가이드 — AI 프롬프트 주입용
const BR_FORM_DESCRIPTION_GUIDE: Record<string, string> = {
  other_policy:
    'Describe which Amazon policy is being violated and how. Be specific: cite the exact policy name, explain the violation clearly, and reference the listing content that violates it.',
  incorrect_variation:
    'Describe what makes the product an incorrect variation. Explain how this ASIN is improperly grouped with unrelated products (e.g., different brand, category, or product type) and why it does not belong in this variation family.',
  product_review:
    'Describe the review policy violation. Explain how reviews were manipulated (e.g., incentivized, fake, review swapping) and provide specific evidence from the listing or seller behavior.',
}

// BR 폼 타입별 추가 컨텍스트 — Amazon BR 실제 폼 필드 기반
const BR_FORM_FIELD_CONTEXT: Record<string, string> = {
  other_policy:
    'This form also accepts: product detail page URLs (up to 10), seller storefront URL, and a link to the specific Amazon policy being violated.',
  incorrect_variation:
    'This form also accepts: product detail page URLs (up to 10). Keep the description focused on why the variation grouping is incorrect.',
  product_review:
    'This form also accepts: ASINs (up to 10, comma-separated), review URLs (up to 10), and an order ID if the violation occurred during a purchase.',
}

const getBrFormContext = (formType: BrFormTypeCode): string | null => {
  if (!isBrSubmittable(formType)) return null

  const typeInfo = BR_FORM_TYPES[formType]

  return [
    `## BR Form Context`,
    `This report will be submitted through Amazon Brand Registry using the **"${typeInfo.label}"** form.`,
    ``,
    `**How to write the description for this form:**`,
    BR_FORM_DESCRIPTION_GUIDE[formType] ?? '',
    ``,
    BR_FORM_FIELD_CONTEXT[formType] ?? '',
    ``,
    `Tailor the draft_body specifically for this BR form. The draft_body will be copied directly into the form's description field.`,
  ].join('\n')
}

// Subject에 ASIN suffix 추가 (중복 방지)
const buildSubjectWithAsin = (draftTitle: string | null, asin: string): string | undefined => {
  if (!draftTitle) return undefined
  if (!asin) return draftTitle
  if (draftTitle.includes(asin)) return draftTitle
  return `${draftTitle} [${asin}]`
}

export type BrExtraFields = {
  product_urls?: string[]
  seller_storefront_url?: string
  policy_url?: string
  asins?: string[]
  review_urls?: string[]
  order_id?: string
}

type BuildBrDataInput = {
  report: {
    id: string
    br_form_type: BrFormTypeCode
    draft_body: string | null
    draft_title: string | null
    draft_subject: string | null
  }
  listing: {
    asin: string
    url: string | null
    marketplace?: string
    seller_storefront_url?: string | null
  }
  extraFields?: BrExtraFields
}

export const buildBrSubmitData = ({ report, listing, extraFields }: BuildBrDataInput): BrSubmitData | null => {
  if (!isBrSubmittable(report.br_form_type)) return null

  const productUrls: string[] = []
  if (listing.url) {
    productUrls.push(listing.url)
  } else if (listing.asin) {
    // marketplace에 맞는 도메인 사용 (CA → amazon.ca, JP → amazon.co.jp 등)
    const mp = listing.marketplace?.toUpperCase() as keyof typeof MARKETPLACES | undefined
    const domain = (mp && MARKETPLACES[mp]?.domain) || 'amazon.com'
    productUrls.push(`https://www.${domain}/dp/${listing.asin}`)
  }

  const data: BrSubmitData = {
    form_type: report.br_form_type,
    subject: buildSubjectWithAsin(report.draft_subject ?? report.draft_title, listing.asin),
    description: report.draft_body ?? '',
    product_urls: productUrls,
    prepared_at: new Date().toISOString(),
  }

  // seller_storefront_url은 other_policy 폼에서만 사용
  if (listing.seller_storefront_url && report.br_form_type === 'other_policy') {
    data.seller_storefront_url = listing.seller_storefront_url
  }

  // product_review 폼: 리스팅 URL을 review_urls에도 기본값으로 넣기
  // (실제 BR 폼의 URL 필드가 "product review you want to report" 용도)
  if (report.br_form_type === 'product_review' && productUrls.length > 0) {
    data.review_urls = [...productUrls]
  }

  if (listing.asin) {
    data.asins = [listing.asin]
  }

  // extraFields 오버라이드 (사용자 입력 우선)
  if (extraFields?.product_urls && extraFields.product_urls.length > 0) {
    data.product_urls = extraFields.product_urls
  }
  if (extraFields?.seller_storefront_url) {
    data.seller_storefront_url = extraFields.seller_storefront_url
  }
  if (extraFields?.policy_url) {
    data.policy_url = extraFields.policy_url
  }
  if (extraFields?.asins && extraFields.asins.length > 0) {
    data.asins = extraFields.asins
  }
  if (extraFields?.review_urls && extraFields.review_urls.length > 0) {
    data.review_urls = extraFields.review_urls
  }
  if (extraFields?.order_id) {
    data.order_id = extraFields.order_id
  }

  return data
}

export { getBrFormContext, BR_FORM_DESCRIPTION_GUIDE, BR_FORM_FIELD_CONTEXT, BR_FORM_TYPE_OPTIONS }
