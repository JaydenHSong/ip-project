// 금지/의심 키워드 (크롤러 의심 리스팅 필터링용)
// 6개 카테고리 기반 — 기획서 섹션 2 참조

export const RESTRICTED_KEYWORDS = {
  trademark_abuse: [
    'spigen', 'tough armor', 'rugged armor', 'ultra hybrid',
    'thin fit', 'liquid air', 'liquid crystal', 'neo hybrid',
    'crystal flex', 'ez fit', 'glas.tr', 'glastr', 'ciel', 'cyrill',
  ],
  compatibility_misleading: [
    'compatible with spigen', 'fits spigen', 'for spigen',
    'spigen compatible', 'works with spigen',
  ],
  counterfeit_signals: [
    'oem', 'same as', 'replica',
    'replacement for spigen', 'alternative to spigen',
  ],
  image_theft: [
    'stock photo', 'reference image',
  ],
  review_manipulation: [
    'free product', 'honest review', 'exchange for review',
    'review for discount',
  ],
  regulatory_missing: [
    'no fcc', 'no ul', 'no certification',
  ],
} as const

export type RestrictedKeywordCategory = keyof typeof RESTRICTED_KEYWORDS

// 전체 키워드 플랫 배열 (빠른 검색용)
export const ALL_RESTRICTED_KEYWORDS = Object.values(RESTRICTED_KEYWORDS).flat()
