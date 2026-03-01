// 현재 탭 스크린샷 캡처

const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

export const captureScreenshot = async (): Promise<string> => {
  let quality = 85

  // JPEG format + quality를 낮추면서 2MB 이하가 될 때까지 시도
  while (quality >= 20) {
    const dataUrl = await chrome.tabs.captureVisibleTab(
      { format: 'jpeg', quality },
    )

    const base64Part = dataUrl.split(',')[1] ?? ''
    const estimatedBytes = Math.ceil(base64Part.length * 0.75)

    if (estimatedBytes <= MAX_SIZE_BYTES) {
      return dataUrl
    }

    quality -= 15
  }

  // 최소 quality로도 초과하면 마지막 결과 반환
  return await chrome.tabs.captureVisibleTab({ format: 'jpeg', quality: 10 })
}
