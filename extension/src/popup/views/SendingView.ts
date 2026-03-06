// 전송 중 상태 뷰

import { t } from '@shared/i18n'

export const renderSendingView = (container: HTMLElement): void => {
  container.innerHTML = `
    <div class="status-message sending-view">
      <div class="sending-view__spinner"></div>
      <h2 class="status-message__title">${t('sending.title')}</h2>
      <p class="status-message__desc">${t('sending.desc')}</p>
    </div>
  `
}
