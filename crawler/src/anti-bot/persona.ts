// Dynamic persona generator v2
// 고정 프로파일 대신 범위에서 매번 완전 새로운 값을 생성
// 같은 페르소나는 두 번 다시 만들어지지 않는다

import { DEFAULT_RANGES } from './persona-ranges.js'
import type { PersonaRanges, Range } from './persona-ranges.js'

type TypingProfile = {
  charDelayMin: number
  charDelayMax: number
  pauseProbability: number
  pauseDurationMin: number
  pauseDurationMax: number
  typoProbability: number
}

type ScrollProfile = {
  pixelsPerStepMin: number
  pixelsPerStepMax: number
  stepDelayMin: number
  stepDelayMax: number
  reverseScrollProbability: number
}

type ClickProfile = {
  preferImage: number
  skipSponsoredProbability: number
  hoverBeforeClick: boolean
  openInNewTab: boolean
}

type DwellProfile = {
  searchResultDwellMin: number
  searchResultDwellMax: number
  detailPageDwellMin: number
  detailPageDwellMax: number
  browseGallery: boolean
  scrollToReviews: boolean
}

type NavigationProfile = {
  homeToSearchDelayMin: number
  homeToSearchDelayMax: number
  searchToClickDelayMin: number
  searchToClickDelayMax: number
  backToNextClickDelayMin: number
  backToNextClickDelayMax: number
  betweenPagesDelayMin: number
  betweenPagesDelayMax: number
  productsToViewPerPage: number
  useBackButton: boolean
}

type CrawlPersona = {
  name: string
  typing: TypingProfile
  scroll: ScrollProfile
  click: ClickProfile
  dwell: DwellProfile
  navigation: NavigationProfile
}

// ─── 랜덤 유틸 ───

const randInRange = (range: Range): number => {
  const [min, max] = range
  return min + Math.random() * (max - min)
}

const randIntInRange = (range: Range): number => {
  return Math.round(randInRange(range))
}

// min < max를 보장하며 두 값 생성 (최소 gap 적용)
const randMinMax = (minRange: Range, maxRange: Range, minGap: number): [number, number] => {
  const min = randIntInRange(minRange)
  const max = Math.max(min + minGap, randIntInRange(maxRange))
  return [min, max]
}

// ─── 페르소나 생성 ───

const generatePersona = (
  ranges: PersonaRanges = DEFAULT_RANGES,
  successRanges?: PersonaRanges | null,
): CrawlPersona => {
  // 성공 범위가 있으면 70% 확률로 사용, 30%는 전체 범위 탐색
  const r = (successRanges && Math.random() < 0.7) ? successRanges : ranges

  // Typing
  const [charDelayMin, charDelayMax] = randMinMax(r.typing.charDelayMin, r.typing.charDelayMax, 20)
  const [pauseDurationMin, pauseDurationMax] = randMinMax(r.typing.pauseDurationMin, r.typing.pauseDurationMax, 100)

  // Scroll
  const [pixelsPerStepMin, pixelsPerStepMax] = randMinMax(r.scroll.pixelsPerStepMin, r.scroll.pixelsPerStepMax, 20)
  const [stepDelayMin, stepDelayMax] = randMinMax(r.scroll.stepDelayMin, r.scroll.stepDelayMax, 10)

  // Dwell
  const [searchResultDwellMin, searchResultDwellMax] = randMinMax(r.dwell.searchResultDwellMin, r.dwell.searchResultDwellMax, 200)
  const [detailPageDwellMin, detailPageDwellMax] = randMinMax(r.dwell.detailPageDwellMin, r.dwell.detailPageDwellMax, 1000)

  // Navigation
  const [homeToSearchDelayMin, homeToSearchDelayMax] = randMinMax(r.navigation.homeToSearchDelayMin, r.navigation.homeToSearchDelayMax, 500)
  const [searchToClickDelayMin, searchToClickDelayMax] = randMinMax(r.navigation.searchToClickDelayMin, r.navigation.searchToClickDelayMax, 500)
  const [backToNextClickDelayMin, backToNextClickDelayMax] = randMinMax(r.navigation.backToNextClickDelayMin, r.navigation.backToNextClickDelayMax, 300)
  const [betweenPagesDelayMin, betweenPagesDelayMax] = randMinMax(r.navigation.betweenPagesDelayMin, r.navigation.betweenPagesDelayMax, 500)

  // 유니크 이름: timestamp + 랜덤
  const name = `dyn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`

  return {
    name,
    typing: {
      charDelayMin,
      charDelayMax,
      pauseProbability: randInRange(r.typing.pauseProbability),
      pauseDurationMin,
      pauseDurationMax,
      typoProbability: randInRange(r.typing.typoProbability),
    },
    scroll: {
      pixelsPerStepMin,
      pixelsPerStepMax,
      stepDelayMin,
      stepDelayMax,
      reverseScrollProbability: randInRange(r.scroll.reverseScrollProbability),
    },
    click: {
      preferImage: randInRange(r.click.preferImage),
      skipSponsoredProbability: randInRange(r.click.skipSponsoredProbability),
      hoverBeforeClick: randInRange(r.click.hoverBeforeClick) > 0.5,
      openInNewTab: randInRange(r.click.openInNewTab) > 0.8,
    },
    dwell: {
      searchResultDwellMin,
      searchResultDwellMax,
      detailPageDwellMin,
      detailPageDwellMax,
      browseGallery: randInRange(r.dwell.browseGallery) > 0.5,
      scrollToReviews: randInRange(r.dwell.scrollToReviews) > 0.4,
    },
    navigation: {
      homeToSearchDelayMin,
      homeToSearchDelayMax,
      searchToClickDelayMin,
      searchToClickDelayMax,
      backToNextClickDelayMin,
      backToNextClickDelayMax,
      betweenPagesDelayMin,
      betweenPagesDelayMax,
      productsToViewPerPage: randIntInRange(r.navigation.productsToViewPerPage),
      useBackButton: randInRange(r.navigation.useBackButton) > 0.3,
    },
  }
}

export { generatePersona }
export type {
  CrawlPersona,
  TypingProfile,
  ScrollProfile,
  ClickProfile,
  DwellProfile,
  NavigationProfile,
}
