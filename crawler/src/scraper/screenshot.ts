import type { Page } from 'playwright'

// 용도별 스크린샷 품질 설정
// - evidence: 서버 저장 + PD 신고 증거용 (적당한 품질)
// - scan: AI 분석용 (낮은 품질로 충분, 비용 절약)
type ScreenshotPurpose = 'evidence' | 'scan'

const SCREENSHOT_CONFIG = {
  evidence: { width: 720, height: 550, quality: 60, maxSize: 300 * 1024 },  // 300KB
  scan: { width: 720, height: 550, quality: 40, maxSize: 150 * 1024 },      // 150KB
} as const

const captureScreenshot = async (
  page: Page,
  width: number,
  height: number,
  purpose: ScreenshotPurpose = 'evidence',
): Promise<string> => {
  const config = SCREENSHOT_CONFIG[purpose]
  const captureWidth = purpose === 'scan' ? config.width : width
  const captureHeight = purpose === 'scan' ? config.height : height

  await page.setViewportSize({ width: captureWidth, height: captureHeight })

  const buffer = await page.screenshot({
    type: 'jpeg',
    quality: config.quality,
    fullPage: false,
  })

  // maxSize 이하면 그대로 반환
  if (buffer.length <= config.maxSize) {
    return buffer.toString('base64')
  }

  // 초과 시 quality 더 낮춤
  const lowBuffer = await page.screenshot({
    type: 'jpeg',
    quality: Math.max(config.quality - 20, 20),
    fullPage: false,
  })

  return lowBuffer.toString('base64')
}

export { captureScreenshot }
export type { ScreenshotPurpose }
