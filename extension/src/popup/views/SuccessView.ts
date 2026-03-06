// 제출 성공 화면

import { WEB_BASE } from '@shared/constants'
import { t } from '@shared/i18n'

const CHECK_SVG = `
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
`

export const renderSuccessView = (
  container: HTMLElement,
  reportId: string,
  isDuplicate: boolean = false,
): void => {
  const webUrl = `${WEB_BASE}/reports/${reportId}`

  container.innerHTML = `
    <div class="status-message success-view">
      <div class="success-check success-check--animated">
        ${CHECK_SVG}
      </div>
      <h2 class="status-message__title">${t('success.title')}</h2>
      ${isDuplicate ? `
        <p class="status-message__desc status-message__desc--warn">
          ${t('success.duplicate')}
        </p>
      ` : `
        <p class="status-message__desc">
          ${t('success.desc')}
        </p>
      `}
      <a href="${webUrl}" target="_blank" rel="noopener" class="btn btn--ghost success-view__btn">
        ${t('success.view')}
      </a>
      <button id="btn-new-report" class="btn btn--primary success-view__btn">
        ${t('success.another')}
      </button>
    </div>
  `
}
