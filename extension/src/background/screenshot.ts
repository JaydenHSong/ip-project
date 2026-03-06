// 현재 탭 스크린샷 캡처 (WebP, quality 40, max 300KB)

const MAX_SIZE_BYTES = 300 * 1024 // 300KB
const INITIAL_QUALITY = 40

export const captureScreenshot = async (targetWindowId?: number): Promise<string> => {
  let windowId = targetWindowId

  if (!windowId) {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    if (!tab?.id || !tab.windowId) {
      throw new Error('No active tab to capture')
    }

    if (tab.url && (
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://') ||
      tab.url.startsWith('edge://') ||
      tab.url.startsWith('about:')
    )) {
      throw new Error('Cannot capture internal browser pages')
    }

    windowId = tab.windowId
  }

  let quality = INITIAL_QUALITY

  while (quality >= 20) {
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab(
        windowId,
        { format: 'webp', quality },
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

  return await chrome.tabs.captureVisibleTab(windowId, { format: 'webp', quality: 10 })
}
