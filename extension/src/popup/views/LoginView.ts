// 로그인 화면

import type { BackgroundResponse, AuthStatusResponse } from '@shared/messages'
import { t } from '@shared/i18n'

const SENTINEL_SVG = `
  <svg class="login-logo" viewBox="0 0 24.8 28" fill="var(--accent)" xmlns="http://www.w3.org/2000/svg">
    <path d="M14,0c2.6,0,4.6,2.1,4.6,4.7S16.5,9.3,14,9.3c-2.6,0-4.7,2.1-4.7,4.7s2,4.8,4.7,4.8s4.6,2.1,4.6,4.6c0,2.6-2.1,4.6-4.6,4.6c-2.6,0-4.7-2.1-4.7-4.6c0-2.6-2.1-4.6-4.6-4.6l0,0c-2.6,0-4.6-2.1-4.6-4.7s2.1-4.6,4.7-4.6l0,0c2.6,0,4.6-2.1,4.6-4.7C9.3,2.1,11.4,0,14,0z"/>
    <path d="M21,10.2c2.1,0,3.8,1.7,3.8,3.7c0,2.1-1.7,3.8-3.8,3.8s-3.7-1.7-3.7-3.8C17.2,11.9,18.9,10.2,21,10.2z"/>
  </svg>
`

const GOOGLE_ICON = `
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.26c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
`

export const renderLoginView = (
  container: HTMLElement,
  onSuccess: () => void,
  reason?: 'session_expired',
): void => {
  const desc = reason === 'session_expired'
    ? t('login.desc.expired')
    : t('login.desc')

  container.innerHTML = `
    <div class="login-container">
      ${SENTINEL_SVG}
      <h1 class="login-title">${t('login.title')}</h1>
      <p class="login-desc">${desc}</p>
      <button id="btn-google-login" class="btn btn--ghost login-btn">
        ${GOOGLE_ICON}
        ${t('login.btn')}
      </button>
      <div id="login-error" class="error-text hidden"></div>
    </div>
  `

  const btn = container.querySelector('#btn-google-login') as HTMLButtonElement
  const errorEl = container.querySelector('#login-error') as HTMLElement

  btn.addEventListener('click', async () => {
    btn.disabled = true
    btn.innerHTML = `<span class="spinner"></span> ${t('login.btn.loading')}`
    errorEl.classList.add('hidden')

    chrome.runtime.sendMessage(
      { type: 'SIGN_IN' },
      (response: BackgroundResponse<AuthStatusResponse>) => {
        if (response?.success) {
          onSuccess()
        } else {
          errorEl.textContent = response?.error ?? t('login.error')
          errorEl.classList.remove('hidden')
          btn.disabled = false
          btn.innerHTML = `${GOOGLE_ICON} ${t('login.btn')}`
        }
      },
    )
  })
}
