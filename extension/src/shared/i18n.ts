// Extension i18n 시스템

export type Locale = 'en' | 'ko'

const STORAGE_KEY = 'ext.locale'

let currentLocale: Locale = 'en'

const en = {
  // Common
  'common.sentinel': 'Sentinel',
  'common.cancel': 'Cancel',
  'common.settings': 'Settings',

  // Loading
  'loading.text': 'Loading...',

  // Login
  'login.title': 'Sentinel',
  'login.desc': 'Sign in with your Spigen Google account to report violations.',
  'login.desc.expired': 'Your session has expired. Please sign in again to continue.',
  'login.btn': 'Sign in with Google',
  'login.btn.loading': 'Signing in...',
  'login.error': 'Sign in failed',

  // Report Form
  'form.seller': 'Seller',
  'form.violation': 'Violation Type',
  'form.category.placeholder': 'Select Category',
  'form.violation.placeholder': 'Select Violation Type',
  'form.note.label': 'Note (optional)',
  'form.note.placeholder': 'Describe the violation...',
  'form.submit': 'Submit Report',
  'form.submit.loading': 'Submitting...',
  'form.screenshot.hint': 'Screenshot will be captured automatically.',
  'form.error.submit': 'Submission failed. Please try again.',

  // Preview
  'preview.title': 'Report Preview',
  'preview.label.asin': 'ASIN',
  'preview.label.product': 'Product',
  'preview.label.marketplace': 'Marketplace',
  'preview.label.category': 'Category',
  'preview.label.violation': 'Violation',
  'preview.label.note': 'Note',
  'preview.label.screenshot': 'Screenshot',
  'preview.screenshot.auto': 'Auto-attached',
  'preview.countdown': 'Sending automatically...',

  // Sending
  'sending.title': 'Sending Report...',
  'sending.desc': 'You can close this popup safely.<br/>The report will be sent in the background.',

  // Success
  'success.title': 'Report Submitted!',
  'success.desc': 'Your violation report has been submitted successfully. The team will review it shortly.',
  'success.duplicate': 'A similar report already exists for this listing. Your report has been recorded for reference.',
  'success.view': 'View in Sentinel',
  'success.another': 'Report Another',

  // Settings
  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.theme': 'Theme',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',
  'settings.bgfetch.title': 'Background ASIN Fetch',
  'settings.bgfetch.toggle': 'Enable Background Fetch',
  'settings.bgfetch.hint1': 'Sentinel automatically looks up ASINs in the background when requested from the web dashboard. A new tab opens briefly (~3s), collects product info, and closes automatically.',
  'settings.bgfetch.hint2': 'Your existing Amazon session is used. No additional login required.',
  'settings.bgfetch.hint3': 'Background Fetch is enabled by default.',

  // Errors
  'error.not_amazon.title': 'Not an Amazon Page',
  'error.not_amazon.desc': 'Open an Amazon product page to report a violation.',
  'error.not_product.title': 'Not a Product Page',
  'error.not_product.desc': 'Navigate to an individual product page (with /dp/ in the URL). Search and category pages are not supported.',
  'error.parse.title': 'Could Not Read Page',
  'error.parse.desc': 'Failed to extract product data. Try refreshing the page.',
  'error.no_tab.title': 'No Active Tab',
  'error.no_tab.desc': 'Could not detect the current tab. Try clicking the extension icon again.',
  'error.connection.title': 'Connection Error',
  'error.connection.desc': 'Could not connect to the extension background. Try reloading the extension.',

  // BG Fetch Banner
  'bgfetch.banner': 'Background Fetch',

  // Violation Categories
  'cat.intellectual_property': 'Intellectual Property',
  'cat.variation': 'Variation',
  'cat.main_image': 'Main Image',
  'cat.wrong_category': 'Wrong Category',
  'cat.pre_announcement': 'Pre-announcement Listing',
  'cat.review_violation': 'Review Violation',
} as const

const ko: Record<keyof typeof en, string> = {
  'common.sentinel': '센티널',
  'common.cancel': '취소',
  'common.settings': '설정',

  'loading.text': '로딩 중...',

  'login.title': 'Sentinel',
  'login.desc': 'Spigen Google 계정으로 로그인하여 위반을 신고하세요.',
  'login.desc.expired': '세션이 만료되었습니다. 다시 로그인해 주세요.',
  'login.btn': 'Google로 로그인',
  'login.btn.loading': '로그인 중...',
  'login.error': '로그인 실패',

  'form.seller': '판매자',
  'form.violation': '위반 유형',
  'form.category.placeholder': '카테고리 선택',
  'form.violation.placeholder': '위반 유형 선택',
  'form.note.label': '메모 (선택)',
  'form.note.placeholder': '위반 사항을 설명하세요...',
  'form.submit': '신고서 제출',
  'form.submit.loading': '제출 중...',
  'form.screenshot.hint': '스크린샷이 자동으로 캡처됩니다.',
  'form.error.submit': '제출에 실패했습니다. 다시 시도해 주세요.',

  'preview.title': '신고 미리보기',
  'preview.label.asin': 'ASIN',
  'preview.label.product': '상품',
  'preview.label.marketplace': '마켓플레이스',
  'preview.label.category': '카테고리',
  'preview.label.violation': '위반',
  'preview.label.note': '메모',
  'preview.label.screenshot': '스크린샷',
  'preview.screenshot.auto': '자동 첨부',
  'preview.countdown': '자동으로 전송됩니다...',

  'sending.title': '신고서 전송 중...',
  'sending.desc': '이 팝업을 닫아도 안전합니다.<br/>신고서는 백그라운드에서 전송됩니다.',

  'success.title': '신고 완료!',
  'success.desc': '위반 신고서가 성공적으로 제출되었습니다. 팀에서 곧 검토할 예정입니다.',
  'success.duplicate': '이 리스팅에 대해 유사한 신고서가 이미 존재합니다. 귀하의 신고서는 참고용으로 기록되었습니다.',
  'success.view': 'Sentinel에서 보기',
  'success.another': '추가 신고',

  'settings.title': '설정',
  'settings.language': '언어',
  'settings.theme': '테마',
  'settings.theme.light': '라이트',
  'settings.theme.dark': '다크',
  'settings.bgfetch.title': '백그라운드 ASIN 조회',
  'settings.bgfetch.toggle': '백그라운드 조회 활성화',
  'settings.bgfetch.hint1': 'Sentinel이 웹 대시보드에서 요청 시 백그라운드에서 자동으로 ASIN을 조회합니다. 새 탭이 잠시(~3초) 열리고 상품 정보를 수집한 후 자동으로 닫힙니다.',
  'settings.bgfetch.hint2': '기존 Amazon 세션이 사용됩니다. 추가 로그인이 필요하지 않습니다.',
  'settings.bgfetch.hint3': '백그라운드 조회는 기본적으로 활성화되어 있습니다.',

  'error.not_amazon.title': '아마존 페이지가 아닙니다',
  'error.not_amazon.desc': '위반을 신고하려면 아마존 상품 페이지를 열어주세요.',
  'error.not_product.title': '상품 페이지가 아닙니다',
  'error.not_product.desc': 'URL에 /dp/가 포함된 개별 상품 페이지로 이동해 주세요. 검색/카테고리 페이지는 지원되지 않습니다.',
  'error.parse.title': '페이지를 읽을 수 없습니다',
  'error.parse.desc': '상품 데이터 추출에 실패했습니다. 페이지를 새로고침해 보세요.',
  'error.no_tab.title': '활성 탭 없음',
  'error.no_tab.desc': '현재 탭을 감지할 수 없습니다. 확장 프로그램 아이콘을 다시 클릭해 보세요.',
  'error.connection.title': '연결 오류',
  'error.connection.desc': '확장 프로그램 백그라운드에 연결할 수 없습니다. 확장 프로그램을 다시 로드해 보세요.',

  'bgfetch.banner': '백그라운드 조회',

  'cat.intellectual_property': '지식재산권',
  'cat.variation': '베리에이션',
  'cat.main_image': '메인 이미지',
  'cat.wrong_category': '잘못된 카테고리',
  'cat.pre_announcement': '사전 공지 리스팅',
  'cat.review_violation': '리뷰 위반',
}

type TranslationKey = keyof typeof en

const locales: Record<Locale, Record<TranslationKey, string>> = { en, ko }

export const t = (key: TranslationKey): string => {
  return locales[currentLocale][key] ?? locales.en[key] ?? key
}

export const getLocale = (): Locale => currentLocale

export const setLocale = (locale: Locale): void => {
  currentLocale = locale
  chrome.storage.local.set({ [STORAGE_KEY]: locale })
}

export const initLocale = (): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const stored = result[STORAGE_KEY]
      if (stored === 'ko' || stored === 'en') {
        currentLocale = stored
      }
      resolve()
    })
  })
}

// Theme
export type Theme = 'light' | 'dark'

const THEME_KEY = 'ext.theme'
let currentTheme: Theme = 'light'

export const getTheme = (): Theme => currentTheme

export const setTheme = (theme: Theme): void => {
  currentTheme = theme
  chrome.storage.local.set({ [THEME_KEY]: theme })
  applyTheme(theme)
}

export const applyTheme = (theme: Theme): void => {
  document.documentElement.setAttribute('data-theme', theme)
}

export const initTheme = (): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(THEME_KEY, (result) => {
      const stored = result[THEME_KEY]
      if (stored === 'light' || stored === 'dark') {
        currentTheme = stored
      }
      applyTheme(currentTheme)
      resolve()
    })
  })
}
