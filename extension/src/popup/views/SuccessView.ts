// 제출 성공 화면

import { WEB_BASE } from '@shared/constants'

const CHECK_SVG = `
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
`

export const renderSuccessView = (
  container: HTMLElement,
  reportId: string,
): void => {
  const webUrl = `${WEB_BASE}/reports/${reportId}`

  container.innerHTML = `
    <div class="status-message success-view">
      <div class="success-check">
        ${CHECK_SVG}
      </div>
      <h2 class="status-message__title">Report Submitted</h2>
      <p class="status-message__desc">
        Your violation report has been submitted successfully. The team will review it shortly.
      </p>
      <a href="${webUrl}" target="_blank" rel="noopener" class="btn btn--ghost success-view__btn">
        View in Sentinel
      </a>
      <button id="btn-new-report" class="btn btn--primary success-view__btn">
        Report Another
      </button>
    </div>
  `
}
