// 아마존 검색 결과 페이지 셀렉터
// HTML 구조 변경 시 이 파일만 수정하면 됩니다
const SEARCH_SELECTORS = {
  resultItems: '[data-component-type="s-search-result"]',
  asin: '[data-asin]',
  title: 'h2 a span',
  price: '.a-price .a-offscreen',
  image: '.s-image',
  sponsored: '.puis-label-popover',
  nextPage: '.s-pagination-next',
  noResults: '.s-no-results-filler',
  captcha: '#captchacharacters',
  variationBadge: '.a-size-base-plus.a-color-secondary, .a-size-base.a-color-secondary',
} as const

// 아마존 상세 페이지 셀렉터
const DETAIL_SELECTORS = {
  title: '#productTitle',
  price: '.a-price .a-offscreen',
  listPrice: '.a-text-price .a-offscreen',
  description: '#productDescription',
  bulletPoints: '#feature-bullets li span',
  images: '#imgTagWrapperId img, #altImages .a-button-thumbnail img',
  mainImage: '#landingImage',
  sellerName: '#sellerProfileTriggerId, #merchant-info a',
  sellerId: '#sellerProfileTriggerId',
  brand: '#bylineInfo',
  category: '#wayfinding-breadcrumbs_container li a',
  rating: '#acrPopover .a-size-base',
  reviewCount: '#acrCustomerReviewText',
  unavailable: '#availability .a-color-state',
  captcha: '#captchacharacters',
} as const

export { SEARCH_SELECTORS, DETAIL_SELECTORS }
