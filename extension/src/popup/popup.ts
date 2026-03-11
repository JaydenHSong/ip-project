// Popup 엔트리 — 뷰 라우터 + 초기화

import type { BackgroundResponse, AuthStatusResponse, PageDataResponse } from '@shared/messages'
import type { AuthUser, SubmitReportResponse } from '@shared/types'
import { initLocale, initTheme, t } from '@shared/i18n'
import { renderLoadingView } from './views/LoadingView'
import { renderLoginView } from './views/LoginView'
import { renderReportFormView } from './views/ReportFormView'
import { renderPreviewView } from './views/PreviewView'
import type { PreviewData } from './views/PreviewView'
import { renderSendingView } from './views/SendingView'
import { renderSuccessView } from './views/SuccessView'
import { renderSettingsView } from './views/SettingsView'

type ViewName = 'loading' | 'login' | 'form' | 'preview' | 'sending' | 'success' | 'settings'

const views: Record<ViewName, HTMLElement | null> = {
  loading: document.getElementById('view-loading'),
  login: document.getElementById('view-login'),
  form: document.getElementById('view-form'),
  preview: document.getElementById('view-preview'),
  sending: document.getElementById('view-sending'),
  success: document.getElementById('view-success'),
  settings: document.getElementById('view-settings'),
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

// 타임아웃 포함 메시지 전송 — SW 비활성 시 무한 대기 방지
const MESSAGE_TIMEOUT_MS = 10_000

const sendMessage = <T>(message: unknown): Promise<BackgroundResponse<T>> => {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({ success: false, error: 'Service worker not responding. Try again.' } as BackgroundResponse<T>)
    }, MESSAGE_TIMEOUT_MS)

    try {
      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timer)
        // chrome.runtime.lastError 발생 시 (SW 연결 끊김 등)
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message ?? 'Connection lost' } as BackgroundResponse<T>)
          return
        }
        resolve(response ?? { success: false, error: 'No response from background' } as BackgroundResponse<T>)
      })
    } catch {
      clearTimeout(timer)
      resolve({ success: false, error: 'Failed to connect to background' } as BackgroundResponse<T>)
    }
  })
}

// 에러 코드 → i18n 키 매핑
const ERROR_KEY_MAP: Record<string, { title: string; desc: string; icon: string }> = {
  NOT_AMAZON: { title: 'error.not_amazon.title', desc: 'error.not_amazon.desc', icon: '\uD83C\uDF10' },
  NOT_PRODUCT_PAGE: { title: 'error.not_product.title', desc: 'error.not_product.desc', icon: '\uD83D\uDD0D' },
  PARSE_FAILED: { title: 'error.parse.title', desc: 'error.parse.desc', icon: '\u26A0\uFE0F' },
  NO_TAB: { title: 'error.no_tab.title', desc: 'error.no_tab.desc', icon: '\uD83D\uDCD1' },
  CONNECTION_ERROR: { title: 'error.connection.title', desc: 'error.connection.desc', icon: '\uD83D\uDD0C' },
}

const showErrorView = (container: HTMLElement, errorCode: string): void => {
  const key = errorCode.startsWith('PARSE_FAILED') ? 'PARSE_FAILED' : errorCode
  const mapping = ERROR_KEY_MAP[key] ?? ERROR_KEY_MAP.PARSE_FAILED
  const debugInfo = errorCode.startsWith('PARSE_FAILED:') ? errorCode.substring(13) : ''

  container.innerHTML = `
    <div class="status-message error-view">
      <div class="error-view__icon">${mapping.icon}</div>
      <h2 class="status-message__title">${t(mapping.title as Parameters<typeof t>[0])}</h2>
      <p class="status-message__desc">${t(mapping.desc as Parameters<typeof t>[0])}</p>
      ${debugInfo ? `<p class="status-message__desc" style="font-size:11px;color:var(--text-muted);word-break:break-all;margin-top:8px">${debugInfo}</p>` : ''}
    </div>
  `
}

const sendToServiceWorker = (data: PreviewData): void => {
  showView('sending')
  renderSendingView(views.sending!)

  const timer = setTimeout(() => {
    // 15초 후에도 응답 없으면 에러 표시
    showView('form')
    showErrorView(views.form!, 'CONNECTION_ERROR')
  }, 15_000)

  try {
    chrome.runtime.sendMessage(
      {
        type: 'QUEUE_REPORT',
        payload: {
          page_data: data.pageData,
          violation_type: data.violationType,
          violation_category: data.violationCategory,
          note: data.note,
          screenshot_base64: data.screenshotBase64,
          extra_fields: data.extraFields,
        },
      },
      (response: BackgroundResponse<SubmitReportResponse>) => {
        clearTimeout(timer)

        if (chrome.runtime.lastError) {
          showView('form')
          showErrorView(views.form!, 'CONNECTION_ERROR')
          return
        }

        if (response?.success) {
          const rd = response.data as SubmitReportResponse & {
            screenshot_received?: boolean
            screenshot_size?: number
            screenshot_uploaded?: boolean
            screenshot_error?: string | null
          }
          console.log('[Sentinel] Submit result:', JSON.stringify({
            screenshot_received: rd.screenshot_received,
            screenshot_uploaded: rd.screenshot_uploaded,
            screenshot_size: rd.screenshot_size,
            screenshot_error: rd.screenshot_error,
          }))

          showView('success')
          renderSuccessView(views.success!, response.data.report_id, response.data.is_duplicate)

          const btnNew = views.success!.querySelector('#btn-new-report')
          btnNew?.addEventListener('click', () => init())
        } else {
          // 인증 에러 시 로그인 화면으로 리다이렉트 (세션 만료 안내)
          const isAuthError = response?.error?.toLowerCase().includes('session expired')
            || response?.error?.toLowerCase().includes('not authenticated')
          if (isAuthError) {
            setAvatar(null)
            showView('login')
            renderLoginView(views.login!, () => init(), 'session_expired')
            return
          }

          // 중복 리포트 → 가이드 메시지
          const isDuplicate = response?.error?.toLowerCase().includes('already exists')
            || response?.error?.toLowerCase().includes('duplicate')
            || response?.error?.toLowerCase().includes('unique_active')
          const errorMessage = isDuplicate
            ? t('form.error.duplicate')
            : (response?.error ?? t('form.error.submit'))

          showView('form')
          const errorEl = views.form!.querySelector('#form-error')
          if (errorEl) {
            errorEl.textContent = errorMessage
            errorEl.classList.remove('hidden')
          }
        }
      },
    )
  } catch {
    clearTimeout(timer)
    showView('form')
    showErrorView(views.form!, 'CONNECTION_ERROR')
  }
}

const init = async (): Promise<void> => {
  try {
    // 1. 로딩
    showView('loading')
    renderLoadingView(views.loading!)

    // 2. 인증
    const authResponse = await sendMessage<AuthStatusResponse>({ type: 'GET_AUTH_STATUS' })

    if (!authResponse.success || !authResponse.data?.authenticated) {
      setAvatar(null)
      showView('login')
      renderLoginView(views.login!, () => init())
      return
    }

    setAvatar(authResponse.data.user)

    // 3. 페이지 데이터
    const pageResponse = await sendMessage<PageDataResponse>({ type: 'GET_PAGE_DATA_FROM_TAB' })

    if (!pageResponse.success || !pageResponse.data) {
      showView('form')
      showErrorView(views.form!, (!pageResponse.success ? pageResponse.error : null) ?? 'PARSE_FAILED')
      return
    }

    // 4. 스크린샷 미리 캡처 (popup 열리자마자 — 탭이 아직 보이는 시점)
    let cachedScreenshot = ''
    const ssSettings = await new Promise<Record<string, unknown>>((resolve) => {
      chrome.storage.local.get('screenshot.enabled', resolve)
    })
    const ssEnabled = (ssSettings['screenshot.enabled'] as boolean) ?? true
    if (ssEnabled) {
      // 1차 시도
      let ssResponse = await sendMessage<string>({ type: 'CAPTURE_SCREENSHOT' })
      // 실패 시 500ms 후 1회 재시도 (SW 웜업 대기)
      if (!ssResponse.success) {
        console.warn('[Sentinel] Screenshot 1st attempt failed:', ssResponse.error)
        await new Promise((r) => setTimeout(r, 500))
        ssResponse = await sendMessage<string>({ type: 'CAPTURE_SCREENSHOT' })
      }
      if (ssResponse.success) {
        cachedScreenshot = ssResponse.data
        console.log('[Sentinel] Screenshot captured:', Math.round(ssResponse.data.length / 1024), 'KB')
      } else {
        console.warn('[Sentinel] Screenshot capture failed after retry:', ssResponse.error)
      }
    }

    // 5. 폼
    showView('form')
    renderReportFormView(views.form!, pageResponse.data, cachedScreenshot, (previewData) => {
      // 5. 프리뷰 + 카운트다운
      showView('preview')
      renderPreviewView(
        views.preview!,
        previewData,
        () => sendToServiceWorker(previewData),
        () => {
          // 취소 → 폼으로 복귀
          showView('form')
        },
      )
    })
  } catch {
    // init 중 예상치 못한 에러 → 로딩 뷰에서 멈추지 않도록
    showView('form')
    showErrorView(views.form!, 'CONNECTION_ERROR')
  }
}

// 설정 버튼 토글 이벤트
let previousView: ViewName = 'form'
const settingsBtn = document.getElementById('btn-settings')
settingsBtn?.addEventListener('click', () => {
  const isSettingsOpen = views.settings?.classList.contains('view--active')
  if (isSettingsOpen) {
    showView(previousView)
  } else {
    // 현재 활성 뷰 기억
    for (const [key, el] of Object.entries(views)) {
      if (el?.classList.contains('view--active') && key !== 'settings') {
        previousView = key as ViewName
        break
      }
    }
    showView('settings')
    renderSettingsView(views.settings!, () => {
      showView(previousView)
    }, () => {
      // locale 변경 시 전체 UI 재초기화
      init()
    })
  }
})

// Background Fetch 진행 배너
const bgFetchBanner = document.getElementById('bgfetch-banner')
const updateBgFetchBanner = (): void => {
  chrome.storage.local.get('bgfetch.status', (result) => {
    const status = result['bgfetch.status'] as { active: boolean; asin: string | null; marketplace: string | null } | undefined
    if (bgFetchBanner) {
      if (status?.active && status.asin) {
        bgFetchBanner.textContent = `${t('bgfetch.banner')}: ${status.asin} (${status.marketplace ?? 'US'})`
        bgFetchBanner.classList.remove('hidden')
      } else {
        bgFetchBanner.classList.add('hidden')
      }
    }
  })
}
updateBgFetchBanner()
// storage 변경 시 배너 업데이트
chrome.storage.onChanged.addListener((changes) => {
  if (changes['bgfetch.status']) updateBgFetchBanner()
})

// 팝업 오픈 시 초기화 — locale + theme 먼저 로드
Promise.all([initLocale(), initTheme()]).then(() => init())
