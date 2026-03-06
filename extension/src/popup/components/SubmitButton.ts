// 제출 버튼 컴포넌트

import { t } from '@shared/i18n'

const LOCK_ICON = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
`

export const renderSubmitButton = (
  container: HTMLElement,
  onClick: () => void,
): void => {
  container.innerHTML = `
    <button id="btn-submit" class="btn btn--primary" disabled>
      ${LOCK_ICON}
      ${t('form.submit')}
    </button>
    <p class="hint-text">${t('form.screenshot.hint')}</p>
  `

  const btn = container.querySelector('#btn-submit') as HTMLButtonElement
  btn.addEventListener('click', onClick)
}

export const setSubmitEnabled = (enabled: boolean): void => {
  const btn = document.querySelector('#btn-submit') as HTMLButtonElement | null
  if (btn) btn.disabled = !enabled
}

export const setSubmitLoading = (loading: boolean): void => {
  const btn = document.querySelector('#btn-submit') as HTMLButtonElement | null
  if (!btn) return

  if (loading) {
    btn.disabled = true
    btn.innerHTML = `<span class="spinner"></span> ${t('form.submit.loading')}`
  } else {
    btn.disabled = false
    btn.innerHTML = `${LOCK_ICON} ${t('form.submit')}`
  }
}
