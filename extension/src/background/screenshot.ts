// 현재 탭 스크린샷 캡처

const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

export const captureScreenshot = async (targetWindowId?: number): Promise<string> => {
  // windowId가 명시되지 않으면 현재 활성 탭의 윈도우를 찾아서 사용
  let windowId = targetWindowId

  if (!windowId) {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    if (!tab?.id || !tab.windowId) {
      throw new Error('No active tab to capture')
    }

    // 내부 페이지는 캡처 불가
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

  let quality = 85

  // JPEG format + quality를 낮추면서 2MB 이하가 될 때까지 시도
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

      quality -= 15
    } catch (err) {
      throw new Error(`Screenshot capture failed: ${(err as Error).message}`)
    }
  }

  // 최소 quality로도 초과하면 마지막 결과 반환
  return await chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 10 })
}
