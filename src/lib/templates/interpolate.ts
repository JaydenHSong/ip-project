import type { Listing } from '@/types/listings'
import { getBrFormTypeLabel } from '@/constants/br-form-types'

type InterpolateContext = {
  listing: Partial<Listing>
  report?: { br_form_type?: string; user_violation_type?: string; confirmed_violation_type?: string | null }
}

export const interpolateTemplate = (template: string, ctx: InterpolateContext): string => {
  const { listing, report } = ctx
  const now = new Date()

  const formType = report?.br_form_type ?? report?.user_violation_type ?? ''
  const violationLabel = formType ? getBrFormTypeLabel(formType) : ''

  const replacements: Record<string, string> = {
    '{{ASIN}}': listing.asin ?? '',
    '{{TITLE}}': listing.title ?? '',
    '{{SELLER}}': listing.seller_name ?? '',
    '{{BRAND}}': listing.brand ?? '',
    '{{MARKETPLACE}}': listing.marketplace ?? '',
    '{{PRICE}}': listing.price_amount != null
      ? `${listing.price_currency ?? '$'}${listing.price_amount}`
      : '',
    '{{VIOLATION_TYPE}}': violationLabel,
    '{{TODAY}}': now.toISOString().slice(0, 10),
    '{{RATING}}': listing.rating != null ? String(listing.rating) : '',
    '{{REVIEW_COUNT}}': listing.review_count != null ? String(listing.review_count) : '',
  }

  let result = template
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replaceAll(key, value)
  }
  return result
}
