// 자동 제출 전 카운트다운 오버레이 UI
// Cancel 클릭 시 수동 모드로 전환

type CountdownResult = 'proceed' | 'cancelled'

export const showCountdown = (seconds: number): Promise<CountdownResult> => {
  return new Promise((resolve) => {
    let remaining = seconds
    let cancelled = false

    const overlay = document.createElement('div')
    Object.assign(overlay.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      padding: '16px 24px',
      borderRadius: '12px',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      color: '#fff',
      fontSize: '14px',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      zIndex: '99999',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    })

    const textEl = document.createElement('span')
    textEl.textContent = `\u{1F6E1}\uFE0F Sentinel: Auto submit in ${remaining}s...`

    const cancelBtn = document.createElement('button')
    cancelBtn.textContent = 'Cancel'
    Object.assign(cancelBtn.style, {
      padding: '4px 12px',
      borderRadius: '6px',
      border: '1px solid rgba(255,255,255,0.3)',
      backgroundColor: 'transparent',
      color: '#fff',
      fontSize: '13px',
      cursor: 'pointer',
    })

    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.backgroundColor = 'rgba(255,255,255,0.1)'
    })
    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.backgroundColor = 'transparent'
    })

    cancelBtn.addEventListener('click', () => {
      cancelled = true
      overlay.remove()
      resolve('cancelled')
    })

    overlay.appendChild(textEl)
    overlay.appendChild(cancelBtn)
    document.body.appendChild(overlay)

    const timer = setInterval(() => {
      if (cancelled) {
        clearInterval(timer)
        return
      }
      remaining--
      textEl.textContent = `\u{1F6E1}\uFE0F Sentinel: Auto submit in ${remaining}s...`

      if (remaining <= 0) {
        clearInterval(timer)
        overlay.remove()
        resolve('proceed')
      }
    }, 1000)
  })
}
