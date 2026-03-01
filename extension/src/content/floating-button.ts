// 플로팅 버튼 — Shadow DOM으로 아마존 CSS와 격리

const BUTTON_ID = 'sentinel-floating-btn'

const BUTTON_STYLES = `
  :host {
    all: initial;
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    font-family: Inter, system-ui, sans-serif;
  }
  .sentinel-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #F97316;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .sentinel-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(249, 115, 22, 0.5);
  }
  .sentinel-btn:active {
    transform: scale(0.95);
  }
  .sentinel-btn svg {
    width: 24px;
    height: 24px;
    fill: white;
  }
`

const SENTINEL_ICON_SVG = `
  <svg viewBox="0 0 24.8 28" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M14,0c2.6,0,4.6,2.1,4.6,4.7S16.5,9.3,14,9.3c-2.6,0-4.7,2.1-4.7,4.7s2,4.8,4.7,4.8s4.6,2.1,4.6,4.6c0,2.6-2.1,4.6-4.6,4.6c-2.6,0-4.7-2.1-4.7-4.6c0-2.6-2.1-4.6-4.6-4.6l0,0c-2.6,0-4.6-2.1-4.6-4.7s2.1-4.6,4.7-4.6l0,0c2.6,0,4.6-2.1,4.6-4.7C9.3,2.1,11.4,0,14,0z"/>
    <path d="M21,10.2c2.1,0,3.8,1.7,3.8,3.7c0,2.1-1.7,3.8-3.8,3.8s-3.7-1.7-3.7-3.8C17.2,11.9,18.9,10.2,21,10.2z"/>
  </svg>
`

export const createFloatingButton = (): void => {
  if (document.getElementById(BUTTON_ID)) return

  const host = document.createElement('div')
  host.id = BUTTON_ID
  const shadow = host.attachShadow({ mode: 'closed' })

  const style = document.createElement('style')
  style.textContent = BUTTON_STYLES

  const button = document.createElement('button')
  button.className = 'sentinel-btn'
  button.innerHTML = SENTINEL_ICON_SVG
  button.title = 'Report Violation — Sentinel'
  button.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_POPUP' })
  })

  shadow.appendChild(style)
  shadow.appendChild(button)
  document.body.appendChild(host)
}

export const removeFloatingButton = (): void => {
  document.getElementById(BUTTON_ID)?.remove()
}
