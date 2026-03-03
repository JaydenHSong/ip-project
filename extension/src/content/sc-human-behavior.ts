// 봇 탐지 방지를 위한 사람 행동 시뮬레이션 모듈
// SC 자동 제출 시 마우스/스크롤/딜레이를 사람처럼 수행

// 랜덤 딜레이 (ms)
export const delay = (min: number, max: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)))

// 랜덤 스크롤 (px 범위)
export const randomScroll = async (minY: number, maxY: number): Promise<void> => {
  const targetY = minY + Math.random() * (maxY - minY)
  window.scrollTo({ top: targetY, behavior: 'smooth' })
  await delay(300, 800)
}

// 마우스 이동 시뮬레이션 (대상 요소 근처)
export const moveMouseNear = async (el: HTMLElement): Promise<void> => {
  const rect = el.getBoundingClientRect()
  const event = new MouseEvent('mousemove', {
    clientX: rect.left + rect.width / 2 + (Math.random() - 0.5) * 20,
    clientY: rect.top + rect.height / 2 + (Math.random() - 0.5) * 10,
    bubbles: true,
  })
  document.dispatchEvent(event)
  await delay(200, 600)
}

// 자연스러운 클릭 (mousedown → mouseup → click 시퀀스)
export const naturalClick = async (el: HTMLElement): Promise<void> => {
  const rect = el.getBoundingClientRect()
  const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 6
  const y = rect.top + rect.height / 2 + (Math.random() - 0.5) * 4

  el.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, bubbles: true }))
  await delay(50, 150)
  el.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y, bubbles: true }))
  await delay(10, 50)
  el.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }))
}

// 전체 사람 행동 시퀀스 (폼 하단 스크롤 → 마우스 이동 → 클릭)
export const humanSubmit = async (submitButton: HTMLElement): Promise<void> => {
  await randomScroll(400, 800)
  await delay(500, 1500)
  await moveMouseNear(submitButton)
  await delay(300, 800)
  await naturalClick(submitButton)
}
