// 현재 탭 스크린샷 캡처 (JPEG, quality 60, max 500KB)

const MAX_SIZE_BYTES = 500 * 1024 // 500KB
const INITIAL_QUALITY = 60

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

  return await chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 15 })
}
