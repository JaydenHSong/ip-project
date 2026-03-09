// BR (Brand Registry) Contact Support 페이지 DOM 셀렉터
// 셀렉터 분리 — BR 페이지 구조 변경 시 이 파일만 수정

// --- 메인 프레임 셀렉터 ---

// 좌측 트리 메뉴 아이템
export const TREE_ITEM_SELECTOR = 'li.cu-tree-browseTree-ctExpander-type'

// 트리 메뉴 활성 상태
export const TREE_ITEM_ACTIVE_CLASS = 'active'

// 우측 콘텐츠 iframe (폼이 여기 안에 있음)
// 페이지에 role="presentation" iframe이 2개: 1) 숨겨진 tracking (display:none) 2) 실제 폼
export const FORM_IFRAME_SELECTOR = 'iframe[role="presentation"]'

// 로그인 감지 — settings 링크가 있으면 로그인 상태
export const LOGIN_DETECT_SELECTOR = '#brand-registry-nav-settings-link'

// --- iframe 내부 셀렉터 ---

// 폼 타입별 Description label 텍스트 (시작 부분만 매칭)
export const DESC_LABEL_TEXT = {
  other_policy: 'Describe which Amazon policy is being violated',
  incorrect_variation: 'Describe what makes the product an incorrect variation',
  product_review: 'Describe the review policy violation',
  product_not_as_described: 'Describe which Amazon policy is being violated',
} as const

// URL(s) label 텍스트
export const URL_LABEL_PREFIX = 'Provide up to 10 URL(s)'

// Seller storefront URL label (Other policy only)
export const STOREFRONT_LABEL_PREFIX = 'Provide the seller storefront URL'

// Amazon policy URL label (Other policy only)
export const POLICY_URL_LABEL_PREFIX = 'Provide the URL to the specific Amazon policy'

// ASIN(s) label (Product review only)
export const ASIN_LABEL_PREFIX = 'List up to 10 ASIN(s)'

// Order ID label (Product review only)
export const ORDER_ID_LABEL_PREFIX = 'order ID for your purchase'

// Send button
export const SEND_BUTTON_TEXT = 'Send'
