// Popup 엔트리 — 뷰 라우터 + 초기화

import type { BackgroundResponse, AuthStatusResponse, PageDataResponse } from '@shared/messages'
import type { AuthUser } from '@shared/types'
import { renderLoadingView } from './views/LoadingView'
import { renderLoginView } from './views/LoginView'
import { renderReportFormView } from './views/ReportFormView'
import { renderSuccessView } from './views/SuccessView'

type ViewName = 'loading' | 'login' | 'form' | 'success'

const views: Record<ViewName, HTMLElement | null> = {
  loading: document.getElementById('view-loading'),
  login: document.getElementById('view-login'),
  form: document.getElementById('view-form'),
  success: document.getElementById('view-success'),
}

const showView = (name: ViewName): void => {
  for (const [key, el] of Object.entries(views)) {
    if (el) {
      el.classList.toggle('view--active', key === name)
    }
  }
}

const setAvatar = (user: AuthUser | null): void => {
  const avatar = document.getElementById('user-avatar') as HTMLImageElement | null
  if (!avatar) return

  if (user?.avatar_url) {
    avatar.src = user.avatar_url
    avatar.alt = user.name
    avatar.classList.remove('hidden')
  } else {
    avatar.classList.add('hidden')
  }
}

const sendMessage = <T>(message: unknown): Promise<BackgroundResponse<T>> => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, resolve)
  })
}

const showNotAmazonPage = (container: HTMLElement): void => {
  container.innerHTML = `
    <div class="status-message">
      <div class="status-message__icon">&#128722;</div>
      <h2 class="status-message__title">Not an Amazon Product Page</h2>
      <p class="status-message__desc">
        Navigate to an Amazon product page (e.g., amazon.com/dp/...) to report a violation.
      </p>
    </div>
  `
}

const init = async (): Promise<void> => {
  // 1. 로딩 표시
  showView('loading')
  renderLoadingView(views.loading!)

  // 2. 인증 확인
  const authResponse = await sendMessage<AuthStatusResponse>({ type: 'GET_AUTH_STATUS' })

  if (!authResponse.success || !authResponse.data.authenticated) {
    showView('login')
    renderLoginView(views.login!, () => {
      init()
    })
    return
  }

  setAvatar(authResponse.data.user)

  // 3. 페이지 데이터 가져오기
  const pageResponse = await sendMessage<PageDataResponse>({ type: 'GET_PAGE_DATA_FROM_TAB' })

  if (!pageResponse.success || !pageResponse.data) {
    showView('form')
    showNotAmazonPage(views.form!)
    return
  }

  // 4. 신고 폼 표시
  showView('form')
  renderReportFormView(views.form!, pageResponse.data, (reportId) => {
    // 5. 성공 화면
    showView('success')
    renderSuccessView(views.success!, reportId)

    const btnNew = views.success!.querySelector('#btn-new-report')
    btnNew?.addEventListener('click', () => init())
  })
}

// 팝업 오픈 시 초기화
init()
