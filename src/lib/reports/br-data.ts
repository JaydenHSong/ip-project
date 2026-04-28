// BR (Brand Registry) Contact Support 제출 데이터 빌드 유틸리티
// v2: br_form_type 직접 사용 (V01~V19 매핑 제거)

import type { BrSubmitData } from '@/types/reports'
import { type BrFormTypeCode, isBrSubmittable, BR_FORM_TYPES, BR_FORM_TYPE_OPTIONS } from '@/constants/br-form-types'
import { MARKETPLACES } from '@/constants/marketplaces'
import { parseReportNote } from '@/lib/reports/report-note'

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

const splitTextValues = (value: unknown, separator: RegExp): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => splitTextValues(item, separator))
  }
  if (typeof value !== 'string') return []

  return value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean)
}

const normalizeLines = (value: unknown): string[] => splitTextValues(value, /[\r\n]+/)
const normalizeTokens = (value: unknown): string[] => splitTextValues(value, /[,;\r\n]+/)

const isAmazonProductDetailUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    if (!url.hostname.includes('amazon.')) return false
    return /^\/(?:dp|gp\/product)\//i.test(url.pathname)
  } catch {
    return false
  }
}

const removeProductDetailUrls = (urls: string[]): string[] =>
  urls.filter((url) => !isAmazonProductDetailUrl(url))

const firstNonEmpty = (primary?: string[], fallback?: string[]): string[] | undefined => {
  if (primary && primary.length > 0) return primary
  if (fallback && fallback.length > 0) return fallback
  return undefined
}

const firstText = (primary?: string, fallback?: string): string | undefined => {
  if (primary?.trim()) return primary.trim()
  if (fallback?.trim()) return fallback.trim()
  return undefined
}

const hasExtraFields = (extraFields: BrExtraFields): boolean =>
  Object.values(extraFields).some((value) => Array.isArray(value) ? value.length > 0 : !!value)

export const normalizeBrExtraFields = (value: Record<string, unknown> | BrExtraFields | null | undefined): BrExtraFields | undefined => {
  if (!value || typeof value !== 'object') return undefined

  const productUrls = normalizeLines(value.product_urls)
  const reviewUrls = removeProductDetailUrls(normalizeLines(value.review_urls))
  const asins = normalizeTokens(value.asins)

  const extraFields: BrExtraFields = {}
  if (productUrls.length > 0) extraFields.product_urls = productUrls
  if (reviewUrls.length > 0) extraFields.review_urls = reviewUrls
  if (asins.length > 0) extraFields.asins = asins
  if (typeof value.seller_storefront_url === 'string' && value.seller_storefront_url.trim()) {
    extraFields.seller_storefront_url = value.seller_storefront_url.trim()
  }
  if (typeof value.policy_url === 'string' && value.policy_url.trim()) {
    extraFields.policy_url = value.policy_url.trim()
  }
  if (typeof value.order_id === 'string' && value.order_id.trim()) {
    extraFields.order_id = value.order_id.trim()
  }

  return hasExtraFields(extraFields) ? extraFields : undefined
}

export const extractBrExtraFieldsFromNote = (note: string | null | undefined): BrExtraFields | undefined => {
  const noteData = parseReportNote(note).data
  return normalizeBrExtraFields(noteData)
}

export const extractBrExtraFieldsFromSubmitData = (
  submitData: Record<string, unknown> | BrSubmitData | null | undefined,
): BrExtraFields | undefined => normalizeBrExtraFields(submitData)

export const mergeBrExtraFields = (
  primary: BrExtraFields | undefined,
  fallback: BrExtraFields | undefined,
): BrExtraFields | undefined => {
  const merged: BrExtraFields = {}

  const productUrls = firstNonEmpty(primary?.product_urls, fallback?.product_urls)
  const reviewUrls = firstNonEmpty(primary?.review_urls, fallback?.review_urls)
  const asins = firstNonEmpty(primary?.asins, fallback?.asins)

  if (productUrls) merged.product_urls = productUrls
  if (reviewUrls) merged.review_urls = reviewUrls
  if (asins) merged.asins = asins

  const sellerStorefrontUrl = firstText(primary?.seller_storefront_url, fallback?.seller_storefront_url)
  const policyUrl = firstText(primary?.policy_url, fallback?.policy_url)
  const orderId = firstText(primary?.order_id, fallback?.order_id)

  if (sellerStorefrontUrl) merged.seller_storefront_url = sellerStorefrontUrl
  if (policyUrl) merged.policy_url = policyUrl
  if (orderId) merged.order_id = orderId

  return hasExtraFields(merged) ? merged : undefined
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
    product_urls: report.br_form_type === 'product_review' ? [] : productUrls,
    prepared_at: new Date().toISOString(),
  }

  // seller_storefront_url은 other_policy 폼에서만 사용
  if (listing.seller_storefront_url && report.br_form_type === 'other_policy') {
    data.seller_storefront_url = listing.seller_storefront_url
  }

  if (listing.asin) {
    data.asins = [listing.asin]
  }

  // extraFields 오버라이드 (사용자 입력 우선)
  if (report.br_form_type !== 'product_review' && extraFields?.product_urls && extraFields.product_urls.length > 0) {
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
