// 크롤링 세션별 랜덤 페르소나 생성
// 사람마다 다른 행동 패턴을 시뮬레이션

type TypingProfile = {
  charDelayMin: number
  charDelayMax: number
  pauseProbability: number    // 단어 사이 멈칫할 확률
  pauseDurationMin: number
  pauseDurationMax: number
  typoProbability: number     // 오타 낼 확률
}

type ScrollProfile = {
  pixelsPerStepMin: number
  pixelsPerStepMax: number
  stepDelayMin: number
  stepDelayMax: number
  reverseScrollProbability: number  // 위로 다시 올라갈 확률
}

type ClickProfile = {
  preferImage: number          // 0~1, 이미지 클릭 확률 (나머지는 제목)
  skipSponsoredProbability: number  // 스폰서 건너뛸 확률
  hoverBeforeClick: boolean    // 클릭 전 호버 여부
  openInNewTab: boolean        // 새 탭에서 열기
}

type DwellProfile = {
  searchResultDwellMin: number   // 검색 결과 각 상품 위 머무는 시간 (ms)
  searchResultDwellMax: number
  detailPageDwellMin: number     // 상세 페이지 체류 시간 (ms)
  detailPageDwellMax: number
  browseGallery: boolean         // 이미지 갤러리 탐색 여부
  scrollToReviews: boolean       // 리뷰 섹션까지 스크롤 여부
}

type NavigationProfile = {
  homeToSearchDelayMin: number   // 홈 도착 → 검색 시작 (ms)
  homeToSearchDelayMax: number
  searchToClickDelayMin: number  // 결과 로드 → 첫 클릭 (ms)
  searchToClickDelayMax: number
  backToNextClickDelayMin: number // 뒤로가기 → 다음 클릭 (ms)
  backToNextClickDelayMax: number
  betweenPagesDelayMin: number   // 페이지 이동 간격 (ms)
  betweenPagesDelayMax: number
  productsToViewPerPage: number  // 페이지당 몇 개 상세 보기
  useBackButton: boolean         // 뒤로가기 사용 여부 (false면 새 탭)
}

type CrawlPersona = {
  name: string
  typing: TypingProfile
  scroll: ScrollProfile
  click: ClickProfile
  dwell: DwellProfile
  navigation: NavigationProfile
}

// ─── 타이핑 프로파일 (8가지) ───

const TYPING_SLOW: TypingProfile = {
  charDelayMin: 180, charDelayMax: 450,
  pauseProbability: 0.15, pauseDurationMin: 500, pauseDurationMax: 1500,
  typoProbability: 0.10,
}

const TYPING_ELDERLY: TypingProfile = {
  charDelayMin: 250, charDelayMax: 600,
  pauseProbability: 0.20, pauseDurationMin: 800, pauseDurationMax: 2000,
  typoProbability: 0.15,
}

const TYPING_MEDIUM: TypingProfile = {
  charDelayMin: 70, charDelayMax: 200,
  pauseProbability: 0.08, pauseDurationMin: 300, pauseDurationMax: 800,
  typoProbability: 0.05,
}

const TYPING_FAST: TypingProfile = {
  charDelayMin: 25, charDelayMax: 90,
  pauseProbability: 0.03, pauseDurationMin: 100, pauseDurationMax: 400,
  typoProbability: 0.02,
}

const TYPING_HUNT_PECK: TypingProfile = {
  charDelayMin: 200, charDelayMax: 500,
  pauseProbability: 0.12, pauseDurationMin: 400, pauseDurationMax: 1200,
  typoProbability: 0.12,
}

const TYPING_BURST: TypingProfile = {
  charDelayMin: 30, charDelayMax: 60,
  pauseProbability: 0.25, pauseDurationMin: 600, pauseDurationMax: 1800,
  typoProbability: 0.03,
}

const TYPING_STEADY: TypingProfile = {
  charDelayMin: 100, charDelayMax: 150,
  pauseProbability: 0.05, pauseDurationMin: 200, pauseDurationMax: 500,
  typoProbability: 0.04,
}

const TYPING_MOBILE_LIKE: TypingProfile = {
  charDelayMin: 120, charDelayMax: 350,
  pauseProbability: 0.10, pauseDurationMin: 400, pauseDurationMax: 1000,
  typoProbability: 0.08,
}

const TYPING_PROFILES = [
  TYPING_SLOW, TYPING_ELDERLY, TYPING_MEDIUM, TYPING_FAST,
  TYPING_HUNT_PECK, TYPING_BURST, TYPING_STEADY, TYPING_MOBILE_LIKE,
] as const

// ─── 스크롤 프로파일 (7가지) ───

const SCROLL_SLOW_READER: ScrollProfile = {
  pixelsPerStepMin: 40, pixelsPerStepMax: 100,
  stepDelayMin: 150, stepDelayMax: 400,
  reverseScrollProbability: 0.15,
}

const SCROLL_FAST_SCANNER: ScrollProfile = {
  pixelsPerStepMin: 200, pixelsPerStepMax: 450,
  stepDelayMin: 20, stepDelayMax: 80,
  reverseScrollProbability: 0.05,
}

const SCROLL_MEDIUM: ScrollProfile = {
  pixelsPerStepMin: 100, pixelsPerStepMax: 250,
  stepDelayMin: 60, stepDelayMax: 180,
  reverseScrollProbability: 0.10,
}

const SCROLL_STOP_AND_GO: ScrollProfile = {
  pixelsPerStepMin: 150, pixelsPerStepMax: 300,
  stepDelayMin: 30, stepDelayMax: 100,
  reverseScrollProbability: 0.20,
}

const SCROLL_TRACKPAD: ScrollProfile = {
  pixelsPerStepMin: 30, pixelsPerStepMax: 80,
  stepDelayMin: 10, stepDelayMax: 40,
  reverseScrollProbability: 0.08,
}

const SCROLL_PAGE_DOWN: ScrollProfile = {
  pixelsPerStepMin: 600, pixelsPerStepMax: 900,
  stepDelayMin: 500, stepDelayMax: 2000,
  reverseScrollProbability: 0.03,
}

const SCROLL_LAZY: ScrollProfile = {
  pixelsPerStepMin: 80, pixelsPerStepMax: 150,
  stepDelayMin: 200, stepDelayMax: 600,
  reverseScrollProbability: 0.25,
}

const SCROLL_PROFILES = [
  SCROLL_SLOW_READER, SCROLL_FAST_SCANNER, SCROLL_MEDIUM,
  SCROLL_STOP_AND_GO, SCROLL_TRACKPAD, SCROLL_PAGE_DOWN, SCROLL_LAZY,
] as const

// ─── 클릭 프로파일 (6가지) ───

const CLICK_IMAGE_LOVER: ClickProfile = {
  preferImage: 0.85, skipSponsoredProbability: 0.60,
  hoverBeforeClick: true, openInNewTab: false,
}

const CLICK_TITLE_READER: ClickProfile = {
  preferImage: 0.20, skipSponsoredProbability: 0.75,
  hoverBeforeClick: false, openInNewTab: false,
}

const CLICK_CAREFUL: ClickProfile = {
  preferImage: 0.50, skipSponsoredProbability: 0.90,
  hoverBeforeClick: true, openInNewTab: false,
}

const CLICK_FAST_DECIDER: ClickProfile = {
  preferImage: 0.60, skipSponsoredProbability: 0.40,
  hoverBeforeClick: false, openInNewTab: false,
}

const CLICK_TAB_OPENER: ClickProfile = {
  preferImage: 0.45, skipSponsoredProbability: 0.65,
  hoverBeforeClick: false, openInNewTab: true,
}

const CLICK_DEAL_HUNTER: ClickProfile = {
  preferImage: 0.30, skipSponsoredProbability: 0.50,
  hoverBeforeClick: true, openInNewTab: false,
}

const CLICK_PROFILES = [
  CLICK_IMAGE_LOVER, CLICK_TITLE_READER, CLICK_CAREFUL,
  CLICK_FAST_DECIDER, CLICK_TAB_OPENER, CLICK_DEAL_HUNTER,
] as const

// ─── 체류 프로파일 (6가지) ───

const DWELL_SCANNER: DwellProfile = {
  searchResultDwellMin: 300, searchResultDwellMax: 1200,
  detailPageDwellMin: 2000, detailPageDwellMax: 5000,
  browseGallery: false, scrollToReviews: false,
}

const DWELL_READER: DwellProfile = {
  searchResultDwellMin: 1500, searchResultDwellMax: 4000,
  detailPageDwellMin: 8000, detailPageDwellMax: 20000,
  browseGallery: true, scrollToReviews: true,
}

const DWELL_COMPARER: DwellProfile = {
  searchResultDwellMin: 2000, searchResultDwellMax: 5000,
  detailPageDwellMin: 5000, detailPageDwellMax: 15000,
  browseGallery: true, scrollToReviews: false,
}

const DWELL_CASUAL: DwellProfile = {
  searchResultDwellMin: 800, searchResultDwellMax: 2500,
  detailPageDwellMin: 3000, detailPageDwellMax: 8000,
  browseGallery: false, scrollToReviews: true,
}

const DWELL_RESEARCH: DwellProfile = {
  searchResultDwellMin: 1000, searchResultDwellMax: 3000,
  detailPageDwellMin: 10000, detailPageDwellMax: 30000,
  browseGallery: true, scrollToReviews: true,
}

const DWELL_IMPATIENT: DwellProfile = {
  searchResultDwellMin: 200, searchResultDwellMax: 800,
  detailPageDwellMin: 1500, detailPageDwellMax: 4000,
  browseGallery: false, scrollToReviews: false,
}

const DWELL_PROFILES = [
  DWELL_SCANNER, DWELL_READER, DWELL_COMPARER,
  DWELL_CASUAL, DWELL_RESEARCH, DWELL_IMPATIENT,
] as const

// ─── 네비게이션 프로파일 (7가지) ───

const NAV_METHODICAL: NavigationProfile = {
  homeToSearchDelayMin: 2000, homeToSearchDelayMax: 5000,
  searchToClickDelayMin: 3000, searchToClickDelayMax: 8000,
  backToNextClickDelayMin: 1500, backToNextClickDelayMax: 4000,
  betweenPagesDelayMin: 3000, betweenPagesDelayMax: 7000,
  productsToViewPerPage: 5, useBackButton: true,
}

const NAV_QUICK: NavigationProfile = {
  homeToSearchDelayMin: 800, homeToSearchDelayMax: 2000,
  searchToClickDelayMin: 1000, searchToClickDelayMax: 3000,
  backToNextClickDelayMin: 500, backToNextClickDelayMax: 1500,
  betweenPagesDelayMin: 1500, betweenPagesDelayMax: 3000,
  productsToViewPerPage: 3, useBackButton: true,
}

const NAV_BROWSING: NavigationProfile = {
  homeToSearchDelayMin: 3000, homeToSearchDelayMax: 8000,
  searchToClickDelayMin: 4000, searchToClickDelayMax: 10000,
  backToNextClickDelayMin: 2000, backToNextClickDelayMax: 6000,
  betweenPagesDelayMin: 4000, betweenPagesDelayMax: 10000,
  productsToViewPerPage: 8, useBackButton: true,
}

const NAV_FOCUSED: NavigationProfile = {
  homeToSearchDelayMin: 1000, homeToSearchDelayMax: 2500,
  searchToClickDelayMin: 1500, searchToClickDelayMax: 4000,
  backToNextClickDelayMin: 800, backToNextClickDelayMax: 2000,
  betweenPagesDelayMin: 2000, betweenPagesDelayMax: 4000,
  productsToViewPerPage: 2, useBackButton: true,
}

const NAV_TAB_HEAVY: NavigationProfile = {
  homeToSearchDelayMin: 1500, homeToSearchDelayMax: 3500,
  searchToClickDelayMin: 2000, searchToClickDelayMax: 5000,
  backToNextClickDelayMin: 1000, backToNextClickDelayMax: 3000,
  betweenPagesDelayMin: 2500, betweenPagesDelayMax: 5000,
  productsToViewPerPage: 6, useBackButton: false,
}

const NAV_WINDOW_SHOPPER: NavigationProfile = {
  homeToSearchDelayMin: 4000, homeToSearchDelayMax: 10000,
  searchToClickDelayMin: 5000, searchToClickDelayMax: 12000,
  backToNextClickDelayMin: 3000, backToNextClickDelayMax: 8000,
  betweenPagesDelayMin: 5000, betweenPagesDelayMax: 12000,
  productsToViewPerPage: 10, useBackButton: true,
}

const NAV_EFFICIENT: NavigationProfile = {
  homeToSearchDelayMin: 600, homeToSearchDelayMax: 1500,
  searchToClickDelayMin: 800, searchToClickDelayMax: 2000,
  backToNextClickDelayMin: 400, backToNextClickDelayMax: 1200,
  betweenPagesDelayMin: 1000, betweenPagesDelayMax: 2500,
  productsToViewPerPage: 4, useBackButton: true,
}

const NAV_PROFILES = [
  NAV_METHODICAL, NAV_QUICK, NAV_BROWSING, NAV_FOCUSED,
  NAV_TAB_HEAVY, NAV_WINDOW_SHOPPER, NAV_EFFICIENT,
] as const

// ─── 페르소나 이름 풀 ───

const PERSONA_NAMES = [
  'careful_shopper', 'speed_buyer', 'price_hunter', 'brand_loyalist',
  'review_reader', 'casual_browser', 'deal_seeker', 'comparison_shopper',
  'impulse_buyer', 'research_guru', 'elderly_user', 'tech_savvy',
  'mobile_migrant', 'weekend_shopper', 'lunchtime_browser', 'gift_finder',
  'bulk_buyer', 'bargain_hunter', 'premium_shopper', 'first_timer',
  'returning_customer', 'skeptical_reader', 'visual_shopper', 'practical_buyer',
  'window_shopper', 'decisive_buyer', 'indecisive_browser', 'loyal_customer',
  'coupon_clipper', 'eco_conscious', 'feature_analyst', 'minimalist_shopper',
  'power_user', 'distracted_browser', 'late_night_shopper',
] as const

// ─── 랜덤 유틸 ───

const pickRandom = <T>(arr: readonly T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)]!
}

// ─── 페르소나 생성 ───

const generatePersona = (): CrawlPersona => {
  return {
    name: pickRandom(PERSONA_NAMES),
    typing: pickRandom(TYPING_PROFILES),
    scroll: pickRandom(SCROLL_PROFILES),
    click: pickRandom(CLICK_PROFILES),
    dwell: pickRandom(DWELL_PROFILES),
    navigation: pickRandom(NAV_PROFILES),
  }
}

// 프로파일 조합 수: 8 x 7 x 6 x 6 x 7 = 14,112 가지

export { generatePersona, pickRandom }
export type {
  CrawlPersona,
  TypingProfile,
  ScrollProfile,
  ClickProfile,
  DwellProfile,
  NavigationProfile,
}
