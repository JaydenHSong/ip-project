import type { Listing } from '@/types/listings'
import { VIOLATION_TYPES } from '@/constants/violations'
import type { ViolationCode } from '@/constants/violations'

type InterpolateContext = {
  listing: Partial<Listing>
  report?: { user_violation_type?: string; confirmed_violation_type?: string | null }
}

export const interpolateTemplate = (template: string, ctx: InterpolateContext): string => {
  const { listing, report } = ctx
  const now = new Date()

  const violationCode = (report?.confirmed_violation_type ?? report?.user_violation_type) as
    | ViolationCode
    | undefined
  const violationLabel = violationCode
    ? VIOLATION_TYPES[violationCode]?.name ?? violationCode
    : ''

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
