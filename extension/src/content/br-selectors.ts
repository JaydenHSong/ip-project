// BR (Brand Registry) Contact Support 페이지 DOM 셀렉터
// 셀렉터 분리 — BR 페이지 구조 변경 시 이 파일만 수정
//
// DOM 구조:
//   메인 프레임: kat-expander (Shadow DOM) → li.ctExpander-type → a
//   폼 영역: spl-hill-form → shadowRoot → iframe → kat-textarea/kat-input → shadowRoot → textarea/input

// --- 메인 프레임: 로그인 감지 ---
export const LOGIN_DETECT_SELECTOR = '#brand-registry-nav-settings-link'

// --- 폼 iframe 내부: kat-label 텍스트 기반 필드 매칭 ---

// 폼 타입별 Description label 텍스트 (시작 부분만 매칭)
export const DESC_LABEL_TEXT = {
  other_policy: 'Describe which Amazon policy is being violated',
  incorrect_variation: 'Describe what makes the product an incorrect variation',
  product_review: 'Describe the review policy violation',
  product_not_as_described: 'Describe which Amazon policy is being violated',
} as const

// URL(s) label 텍스트
export const URL_LABEL_PREFIX = 'Provide up to 10 URL(s)'

// Seller storefront URL label (Other policy / Product not as described)
export const STOREFRONT_LABEL_PREFIX = 'Provide the seller storefront URL'

// Amazon policy URL label (Other policy / Product not as described)
export const POLICY_URL_LABEL_PREFIX = 'Provide the URL to the specific Amazon policy'

// ASIN(s) label (Product review only)
export const ASIN_LABEL_PREFIX = 'List up to 10 ASIN(s)'

// Order ID label (Product review only)
export const ORDER_ID_LABEL_PREFIX = 'order ID for your purchase'

// Send button
export const SEND_BUTTON_TEXT = 'Send'
