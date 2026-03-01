import type { Page } from 'playwright'

// 랜덤 딜레이 (min~max ms)
const delay = (min: number, max: number): Promise<void> => {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 자연스러운 마우스 움직임 (현재 위치 → 대상 요소)
const moveMouse = async (page: Page, selector: string): Promise<void> => {
  const element = await page.$(selector)
  if (!element) return

  const box = await element.boundingBox()
  if (!box) return

  // 대상 요소 내 랜덤 위치
  const targetX = box.x + Math.random() * box.width
  const targetY = box.y + Math.random() * box.height

  // 여러 중간 지점을 거쳐 이동 (베지에 커브 모방)
  const steps = Math.floor(Math.random() * 5) + 3
  await page.mouse.move(targetX, targetY, { steps })
}

// 자연스러운 스크롤 (전체 페이지의 일부를 점진적 스크롤)
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

// 자연스러운 타이핑 (키 사이 30~120ms 랜덤 간격)
const typeText = async (page: Page, selector: string, text: string): Promise<void> => {
  await page.click(selector)
  for (const char of text) {
    await page.keyboard.type(char, { delay: Math.floor(Math.random() * 90) + 30 })
  }
}

const humanBehavior = {
  delay,
  moveMouse,
  scrollPage,
  typeText,
}

export { humanBehavior }
