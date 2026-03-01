// 로딩 상태 뷰

export const renderLoadingView = (container: HTMLElement): void => {
  container.innerHTML = `
    <div class="status-message">
      <div class="spinner" style="width: 32px; height: 32px; border-width: 3px;"></div>
      <p class="status-message__desc">Loading...</p>
    </div>
  `
}
