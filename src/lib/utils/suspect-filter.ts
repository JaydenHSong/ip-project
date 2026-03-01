import { ALL_RESTRICTED_KEYWORDS, RESTRICTED_KEYWORDS } from '@/constants/restricted-keywords'

type SuspectResult = {
  is_suspect: boolean
  suspect_reasons: string[]
}

export const checkSuspectListing = (listing: {
  title?: string | null
  description?: string | null
  bullet_points?: string[]
  brand?: string | null
  seller_name?: string | null
}): SuspectResult => {
  const reasons: string[] = []

  const searchText = [
    listing.title ?? '',
    listing.description ?? '',
    ...(listing.bullet_points ?? []),
    listing.brand ?? '',
    listing.seller_name ?? '',
  ]
    .join(' ')
    .toLowerCase()

  for (const [category, keywords] of Object.entries(RESTRICTED_KEYWORDS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        reasons.push(`${category}:${keyword}`)
      }
    }
  }

  return {
    is_suspect: reasons.length > 0,
    suspect_reasons: reasons,
  }
}
