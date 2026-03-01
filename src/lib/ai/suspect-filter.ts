// 의심 리스팅 필터 — 규칙 기반 사전 필터링
// is_suspect: false → AI 미호출 (비용 절약)

import { RESTRICTED_KEYWORDS, type RestrictedKeywordCategory } from '@/constants/restricted-keywords'

type SuspectCheckResult = {
  isSuspect: boolean
  reasons: string[]
  matchedKeywords: { category: RestrictedKeywordCategory; keyword: string }[]
}

const checkSuspectListing = (listing: {
  title: string
  description: string | null
  bullet_points: string[]
  seller_name: string | null
  brand: string | null
}): SuspectCheckResult => {
  const searchText = [
    listing.title,
    listing.description ?? '',
    ...listing.bullet_points,
    listing.brand ?? '',
  ].join(' ').toLowerCase()

  const matchedKeywords: { category: RestrictedKeywordCategory; keyword: string }[] = []
  const reasons: string[] = []

  for (const [category, keywords] of Object.entries(RESTRICTED_KEYWORDS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        matchedKeywords.push({
          category: category as RestrictedKeywordCategory,
          keyword,
        })
      }
    }
  }

  // 카테고리별 이유 생성
  const categoriesFound = new Set(matchedKeywords.map(m => m.category))

  if (categoriesFound.has('trademark_abuse')) {
    reasons.push('Spigen trademark detected in non-Spigen listing')
  }
  if (categoriesFound.has('compatibility_misleading')) {
    reasons.push('Misleading compatibility claim')
  }
  if (categoriesFound.has('counterfeit_signals')) {
    reasons.push('Counterfeit signals detected')
  }
  if (categoriesFound.has('image_theft')) {
    reasons.push('Potential image theft indicators')
  }
  if (categoriesFound.has('review_manipulation')) {
    reasons.push('Review manipulation indicators')
  }
  if (categoriesFound.has('regulatory_missing')) {
    reasons.push('Missing regulatory certification')
  }

  // Spigen이 셀러가 아닌데 Spigen 키워드가 있으면 의심
  const isSpigenSeller = listing.seller_name?.toLowerCase().includes('spigen') ?? false
  const isSpigenBrand = listing.brand?.toLowerCase().includes('spigen') ?? false

  if (!isSpigenSeller && !isSpigenBrand && matchedKeywords.length > 0) {
    return {
      isSuspect: true,
      reasons,
      matchedKeywords,
    }
  }

  // Spigen 제품이면 의심 아님 (자사 제품)
  if (isSpigenSeller || isSpigenBrand) {
    return {
      isSuspect: false,
      reasons: [],
      matchedKeywords: [],
    }
  }

  // 키워드 없어도 기본적으로 non-suspect
  return {
    isSuspect: matchedKeywords.length > 0,
    reasons,
    matchedKeywords,
  }
}

export { checkSuspectListing, type SuspectCheckResult }
