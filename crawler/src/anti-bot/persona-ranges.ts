// Range-based persona parameter definitions
// 매 세션마다 이 범위에서 완전 새로운 값을 생성하여
// 동일한 행동 패턴 반복을 방지한다

import type { SentinelClient } from '../api/sentinel-client.js'
import { log } from '../logger.js'

type Range = [number, number]

type PersonaRanges = {
  typing: {
    charDelayMin: Range
    charDelayMax: Range
    pauseProbability: Range
    pauseDurationMin: Range
    pauseDurationMax: Range
    typoProbability: Range
  }
  scroll: {
    pixelsPerStepMin: Range
    pixelsPerStepMax: Range
    stepDelayMin: Range
    stepDelayMax: Range
    reverseScrollProbability: Range
  }
  click: {
    preferImage: Range
    skipSponsoredProbability: Range
    hoverBeforeClick: Range
    openInNewTab: Range
  }
  dwell: {
    searchResultDwellMin: Range
    searchResultDwellMax: Range
    detailPageDwellMin: Range
    detailPageDwellMax: Range
    browseGallery: Range
    scrollToReviews: Range
  }
  navigation: {
    homeToSearchDelayMin: Range
    homeToSearchDelayMax: Range
    searchToClickDelayMin: Range
    searchToClickDelayMax: Range
    backToNextClickDelayMin: Range
    backToNextClickDelayMax: Range
    betweenPagesDelayMin: Range
    betweenPagesDelayMax: Range
    productsToViewPerPage: Range
    useBackButton: Range
  }
}

// 전체 범위 기본값 — AI 학습 전 초기 단계에서 사용
const DEFAULT_RANGES: PersonaRanges = {
  typing: {
    charDelayMin: [50, 600],
    charDelayMax: [100, 800],
    pauseProbability: [0.02, 0.25],
    pauseDurationMin: [100, 1000],
    pauseDurationMax: [400, 2500],
    typoProbability: [0.01, 0.15],
  },
  scroll: {
    pixelsPerStepMin: [30, 600],
    pixelsPerStepMax: [80, 900],
    stepDelayMin: [10, 500],
    stepDelayMax: [40, 2000],
    reverseScrollProbability: [0.03, 0.25],
  },
  click: {
    preferImage: [0.15, 0.90],
    skipSponsoredProbability: [0.30, 0.95],
    hoverBeforeClick: [0, 1],
    openInNewTab: [0, 1],
  },
  dwell: {
    searchResultDwellMin: [200, 2000],
    searchResultDwellMax: [800, 5000],
    detailPageDwellMin: [1500, 10000],
    detailPageDwellMax: [4000, 30000],
    browseGallery: [0, 1],
    scrollToReviews: [0, 1],
  },
  navigation: {
    homeToSearchDelayMin: [600, 4000],
    homeToSearchDelayMax: [1500, 10000],
    searchToClickDelayMin: [800, 5000],
    searchToClickDelayMax: [2000, 12000],
    backToNextClickDelayMin: [400, 3000],
    backToNextClickDelayMax: [1200, 8000],
    betweenPagesDelayMin: [1000, 5000],
    betweenPagesDelayMax: [2500, 12000],
    productsToViewPerPage: [2, 10],
    useBackButton: [0, 1],
  },
}

// Spigen + 서브브랜드 판별
const SPIGEN_PATTERNS = [
  /\bspigen\b/i,
  /\bcaseology\b/i,
  /\bcyrill\b/i,
  /\btough armor\b/i,
]

const isSpigenProduct = (
  title: string,
  brand: string | null,
  seller: string | null,
): boolean => {
  const texts = [title, brand, seller].filter(Boolean) as string[]
  return texts.some(text =>
    SPIGEN_PATTERNS.some(pattern => pattern.test(text)),
  )
}

// AI 학습 결과에서 성공 범위 로드
const loadSuccessRanges = async (
  sentinelClient: SentinelClient,
): Promise<PersonaRanges | null> => {
  try {
    const ranges = await sentinelClient.getPersonaRanges()
    return ranges
  } catch {
    log('warn', 'persona', 'Failed to load success ranges, using defaults')
    return null
  }
}

export { DEFAULT_RANGES, isSpigenProduct, loadSuccessRanges }
export type { Range, PersonaRanges }
