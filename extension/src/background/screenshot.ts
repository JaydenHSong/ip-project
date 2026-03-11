// 현재 탭 스크린샷 캡처 (WebP, quality 40, max 300KB)

const MAX_SIZE_BYTES = 300 * 1024 // 300KB
const INITIAL_QUALITY = 40

export const captureScreenshot = async (targetWindowId?: number): Promise<string> => {
  let windowId = targetWindowId

  if (!windowId) {
    // Amazon 탭을 직접 찾기 (popup 윈도우가 아닌 일반 윈도우의 Amazon 탭)
    const amazonTabs = await chrome.tabs.query({ url: '*://*.amazon.*/*' })
    const activeAmazon = amazonTabs.find((t) => t.active) ?? amazonTabs[0]

    if (activeAmazon?.windowId) {
      windowId = activeAmazon.windowId
    } else {
      throw new Error('No Amazon tab found to capture')
    }
  }

  let quality = INITIAL_QUALITY

  while (quality >= 20) {
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab(
        windowId,
        { format: 'jpeg', quality },
      )

      const base64Part = dataUrl.split(',')[1] ?? ''
      const estimatedBytes = Math.ceil(base64Part.length * 0.75)

      if (estimatedBytes <= MAX_SIZE_BYTES) {
        return dataUrl
      }

      quality -= 10
    } catch (err) {
      throw new Error(`Screenshot capture failed: ${(err as Error).message}`)
    }
  }

  return await chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 10 })
}
