import type { Page } from 'playwright'
import type { TypingProfile, ScrollProfile, CrawlPersona } from './persona.js'

// ─── 기본 유틸 ───

const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min

const delay = (min: number, max: number): Promise<void> => {
  const ms = randomBetween(min, max)
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── 마우스 움직임 ───

const moveMouse = async (page: Page, selector: string): Promise<void> => {
  const element = await page.$(selector)
  if (!element) return

  const box = await element.boundingBox()
  if (!box) return

  const targetX = box.x + Math.random() * box.width
  const targetY = box.y + Math.random() * box.height

  const steps = randomBetween(3, 8)
  await page.mouse.move(targetX, targetY, { steps })
}

const moveMouseToCoords = async (
  page: Page,
  x: number,
  y: number,
): Promise<void> => {
  // 현재 위치에서 목표까지 자연스러운 커브로 이동
  const steps = randomBetween(5, 12)
  await page.mouse.move(x, y, { steps })
}

// ─── 페르소나 기반 타이핑 ───

const COMMON_TYPOS: Record<string, string[]> = {
  'a': ['s', 'q'], 'b': ['v', 'n'], 'c': ['x', 'v'], 'd': ['s', 'f'],
  'e': ['w', 'r'], 'f': ['d', 'g'], 'g': ['f', 'h'], 'h': ['g', 'j'],
  'i': ['u', 'o'], 'j': ['h', 'k'], 'k': ['j', 'l'], 'l': ['k', ';'],
  'm': ['n', ','], 'n': ['b', 'm'], 'o': ['i', 'p'], 'p': ['o', '['],
  'q': ['w', 'a'], 'r': ['e', 't'], 's': ['a', 'd'], 't': ['r', 'y'],
  'u': ['y', 'i'], 'v': ['c', 'b'], 'w': ['q', 'e'], 'x': ['z', 'c'],
  'y': ['t', 'u'], 'z': ['x', 'a'],
}

const typeWithPersona = async (
  page: Page,
  selector: string,
  text: string,
  typing: TypingProfile,
): Promise<void> => {
  const element = await page.$(selector)
  if (!element) return

  await element.click()
  await delay(200, 600) // 클릭 후 잠시 멈춤

  const words = text.split(' ')

  for (let w = 0; w < words.length; w++) {
    const word = words[w]!

    // 단어 사이 멈칫
    if (w > 0) {
      await page.keyboard.type(' ', {
        delay: randomBetween(typing.charDelayMin, typing.charDelayMax),
      })

      if (Math.random() < typing.pauseProbability) {
        await delay(typing.pauseDurationMin, typing.pauseDurationMax)
      }
    }

    for (const char of word) {
      // 오타 시뮬레이션
      if (Math.random() < typing.typoProbability) {
        const lowerChar = char.toLowerCase()
        const typoOptions = COMMON_TYPOS[lowerChar]
        if (typoOptions && typoOptions.length > 0) {
          const typo = typoOptions[Math.floor(Math.random() * typoOptions.length)]!
          await page.keyboard.type(typo, {
            delay: randomBetween(typing.charDelayMin, typing.charDelayMax),
          })
          await delay(200, 600) // 오타 인지 시간
          await page.keyboard.press('Backspace')
          await delay(100, 300)
        }
      }

      await page.keyboard.type(char, {
        delay: randomBetween(typing.charDelayMin, typing.charDelayMax),
      })
    }
  }
}

// ─── 페르소나 기반 스크롤 ───

const scrollWithPersona = async (
  page: Page,
  targetPercent: number,
  scroll: ScrollProfile,
): Promise<void> => {
  const totalHeight = await page.evaluate(() => document.body.scrollHeight)
  const viewportHeight = await page.evaluate(() => window.innerHeight)
  const targetScroll = Math.floor(totalHeight * targetPercent)
  let currentScroll = await page.evaluate(() => window.scrollY)

  while (currentScroll < targetScroll) {
    const pixelsToScroll = randomBetween(scroll.pixelsPerStepMin, scroll.pixelsPerStepMax)
    const nextScroll = Math.min(currentScroll + pixelsToScroll, targetScroll)

    await page.evaluate((y) => window.scrollTo(0, y), nextScroll)
    await delay(scroll.stepDelayMin, scroll.stepDelayMax)

    // 가끔 위로 올라가기 (비교하는 것처럼)
    if (Math.random() < scroll.reverseScrollProbability && nextScroll > viewportHeight) {
      const reverseAmount = randomBetween(100, 300)
      await page.evaluate((y) => window.scrollBy(0, -y), reverseAmount)
      await delay(scroll.stepDelayMin * 2, scroll.stepDelayMax * 2)
      await page.evaluate((y) => window.scrollBy(0, y), reverseAmount)
      await delay(scroll.stepDelayMin, scroll.stepDelayMax)
    }

    currentScroll = nextScroll
  }
}

// ─── 페르소나 기반 상세 페이지 행동 ───

const browseDetailPage = async (
  page: Page,
  persona: CrawlPersona,
): Promise<void> => {
  // 상세 페이지 체류
  await delay(persona.dwell.detailPageDwellMin, persona.dwell.detailPageDwellMax)

  // 이미지 갤러리 탐색
  if (persona.dwell.browseGallery) {
    const thumbnails = await page.$$('#altImages .a-button-thumbnail img')
    const maxThumbs = Math.min(thumbnails.length, randomBetween(2, 4))
    for (let i = 0; i < maxThumbs; i++) {
      try {
        await thumbnails[i]!.click()
        await delay(800, 2000)
      } catch {
        // 썸네일 클릭 실패 무시
      }
    }
  }

  // 스크롤 (페르소나에 따라 다른 깊이)
  const scrollDepth = persona.dwell.scrollToReviews ? 0.8 : 0.4
  await scrollWithPersona(page, scrollDepth, persona.scroll)

  // 리뷰 섹션에서 머무르기
  if (persona.dwell.scrollToReviews) {
    await delay(2000, 5000)
  }
}

// ─── 기존 호환 ───

const scrollPage = async (page: Page, scrollPercent: number): Promise<void> => {
  const totalHeight = await page.evaluate(() => document.body.scrollHeight)
  const targetScroll = Math.floor(totalHeight * scrollPercent)
  const currentScroll = await page.evaluate(() => window.scrollY)

  const distance = targetScroll - currentScroll
  const steps = Math.floor(Math.abs(distance) / 100) + 1

  for (let i = 0; i < steps; i++) {
    const scrollAmount = distance / steps
    await page.evaluate((amount) => {
      window.scrollBy(0, amount)
    }, scrollAmount)
    await delay(50, 150)
  }
}

const typeText = async (page: Page, selector: string, text: string): Promise<void> => {
  await page.click(selector)
  for (const char of text) {
    await page.keyboard.type(char, { delay: randomBetween(30, 120) })
  }
}

const humanBehavior = {
  delay,
  moveMouse,
  moveMouseToCoords,
  scrollPage,
  scrollWithPersona,
  typeText,
  typeWithPersona,
  browseDetailPage,
  randomBetween,
}

export { humanBehavior }
