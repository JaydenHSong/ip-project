// 로딩 상태 뷰

import { t } from '@shared/i18n'

export const renderLoadingView = (container: HTMLElement): void => {
  container.innerHTML = `
    <div class="status-message loading-view">
      <div class="loading-view__spinner"></div>
      <p class="status-message__desc">${t('loading.text')}</p>
    </div>
  `
}
