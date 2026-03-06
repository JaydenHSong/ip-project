// Service Worker 엔트리 — 메시지 핸들러

import type { PopupMessage, BackgroundResponse, AuthStatusResponse, PageDataResponse, ScreenshotResponse, SubmitResponse } from '@shared/messages'
import type { ParsedPageData, SubmitReportPayload } from '@shared/types'
import { signInWithGoogle, getSession, signOut } from './auth'
import { submitReport, checkAuthStatus } from './api'
import { captureScreenshot } from './screenshot'
import { enqueue, flush, cleanExpiredDedup } from './passive-queue'
import { pollFetchQueue } from './bg-fetch'

const handleGetAuthStatus = async (): Promise<BackgroundResponse<AuthStatusResponse>> => {
  try {
    const status = await checkAuthStatus()
    return { success: true, data: status }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

const handleSignIn = async (): Promise<BackgroundResponse<AuthStatusResponse>> => {
  try {
    const user = await signInWithGoogle()
    return {
      success: true,
      data: { authenticated: true, user },
    }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

const handleSignOut = async (): Promise<BackgroundResponse<null>> => {
  try {
    await signOut()
    return { success: true, data: null }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

const AMAZON_PRODUCT_RE = /amazon\.[a-z.]+\/(dp\/|.*\/dp\/|gp\/product\/|gp\/aw\/d\/)/
const AMAZON_HOST_RE = /amazon\.[a-z.]+/

const handleGetPageData = async (): Promise<BackgroundResponse<PageDataResponse>> => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id || !tab.url) return { success: false, error: 'NO_TAB' }

    if (!AMAZON_HOST_RE.test(tab.url)) return { success: false, error: 'NOT_AMAZON' }
    if (!AMAZON_PRODUCT_RE.test(tab.url)) return { success: false, error: 'NOT_PRODUCT_PAGE' }

    // 1차: 기존 content script에 메시지
    let firstAttemptError = ''
    try {
      const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_DATA' })
      if (res?.success) return { success: true, data: res.data as ParsedPageData }
      firstAttemptError = 'Content script responded but no data (ASIN not found)'
    } catch (err) {
      firstAttemptError = (err as Error).message ?? 'sendMessage failed'
    }

    // 2차: 동적 주입 후 재시도 (최대 3회, 200ms 간격)
    let injectError = ''
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      })
      for (let attempt = 0; attempt < 3; attempt++) {
        await new Promise((r) => setTimeout(r, 200))
        try {
          const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_DATA' })
          if (res?.success) return { success: true, data: res.data as ParsedPageData }
          injectError = `Attempt ${attempt + 1}: script loaded but parse returned null`
        } catch (err) {
          injectError = `Attempt ${attempt + 1}: ${(err as Error).message}`
        }
      }
    } catch (err) {
      injectError = `executeScript failed: ${(err as Error).message}`
    }

    return {
      success: false,
      error: `PARSE_FAILED: 1st=[${firstAttemptError}] 2nd=[${injectError}] url=${tab.url.substring(0, 80)}`,
    }
  } catch (err) {
    return { success: false, error: `PARSE_FAILED: ${(err as Error).message}` }
  }
}

const handleCaptureScreenshot = async (): Promise<BackgroundResponse<ScreenshotResponse>> => {
  try {
    const screenshot = await captureScreenshot()
    return { success: true, data: screenshot }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

const handleSubmitReport = async (message: PopupMessage & { type: 'SUBMIT_REPORT' }): Promise<BackgroundResponse<SubmitResponse>> => {
  try {
    const result = await submitReport(message.payload)
    return { success: true, data: result }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

const showBadge = (text: string, color: string, durationMs: number = 5000): void => {
  chrome.action.setBadgeText({ text })
  chrome.action.setBadgeBackgroundColor({ color })
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), durationMs)
}

const handleQueueReport = async (payload: SubmitReportPayload): Promise<BackgroundResponse<SubmitResponse>> => {
  try {
    const result = await submitReport(payload)
    showBadge('\u2713', '#22C55E')
    return { success: true, data: result }
  } catch (err) {
    showBadge('!', '#EF4444')
    return { success: false, error: (err as Error).message }
  }
}

const handlePrepareReport = async (payload: SubmitReportPayload): Promise<BackgroundResponse<null>> => {
  try {
    await chrome.storage.session.set({ pending_report: payload })
    return { success: true, data: null }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

const handleConfirmReport = async (): Promise<BackgroundResponse<SubmitResponse>> => {
  try {
    const result = await chrome.storage.session.get('pending_report')
    const payload = result.pending_report as SubmitReportPayload | undefined
    if (!payload) return { success: false, error: 'No pending report' }

    await chrome.storage.session.remove('pending_report')
    return handleQueueReport(payload)
  } catch (err) {
    showBadge('!', '#EF4444')
    return { success: false, error: (err as Error).message }
  }
}

const handleOpenPopup = (): void => {
  // Manifest V3에서는 programmatic popup open 불가
  // 대신 badge로 사용자에게 알림
  chrome.action.setBadgeText({ text: '!' })
  chrome.action.setBadgeBackgroundColor({ color: '#F97316' })

  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' })
  }, 3000)
}

// SW 시작 시 미전송 리포트 자동 전송 (팝업 닫힘 + CONFIRM_REPORT 실패 대비)
const recoverPendingReport = async (): Promise<void> => {
  try {
    const result = await chrome.storage.session.get('pending_report')
    const payload = result.pending_report as SubmitReportPayload | undefined
    if (!payload) return

    await chrome.storage.session.remove('pending_report')
    await handleQueueReport(payload)
  } catch {
    // 복구 실패 시 무시 — 다음 SW 활성화 시 재시도
  }
}
recoverPendingReport()

// 패시브 수집: 5분마다 배치 전송, 1시간마다 중복 필터 정리
chrome.alarms.create('passive-flush', { periodInMinutes: 5 })
chrome.alarms.create('passive-dedup-cleanup', { periodInMinutes: 60 })
// Background Fetch: 30초마다 큐 폴링
chrome.alarms.create('bgfetch-poll', { periodInMinutes: 0.5 })

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'passive-flush') flush()
  if (alarm.name === 'passive-dedup-cleanup') cleanExpiredDedup()
  if (alarm.name === 'bgfetch-poll') pollFetchQueue()
})

// 단일 메시지 라우터
chrome.runtime.onMessage.addListener(
  (message: PopupMessage | { type: 'OPEN_POPUP' | 'PASSIVE_PAGE_DATA' | 'PASSIVE_SEARCH_DATA'; data?: unknown }, _sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
    // OPEN_POPUP는 동기 처리, 응답 불필요
    if (message.type === 'OPEN_POPUP') {
      handleOpenPopup()
      return false
    }

    // 패시브 수집 메시지: fire-and-forget, 응답 불필요
    if (message.type === 'PASSIVE_PAGE_DATA') {
      enqueue('page', message.data as never)
      return false
    }
    if (message.type === 'PASSIVE_SEARCH_DATA') {
      enqueue('search', message.data as never)
      return false
    }

    const handle = async (): Promise<void> => {
      try {
        let response: BackgroundResponse<unknown>

        switch (message.type) {
          case 'GET_AUTH_STATUS':
            response = await handleGetAuthStatus()
            break
          case 'SIGN_IN':
            response = await handleSignIn()
            break
          case 'SIGN_OUT':
            response = await handleSignOut()
            break
          case 'GET_PAGE_DATA_FROM_TAB':
            response = await handleGetPageData()
            break
          case 'CAPTURE_SCREENSHOT':
            response = await handleCaptureScreenshot()
            break
          case 'SUBMIT_REPORT':
            response = await handleSubmitReport(message)
            break
          case 'QUEUE_REPORT':
            response = await handleQueueReport(message.payload)
            break
          case 'PREPARE_REPORT':
            response = await handlePrepareReport(message.payload)
            break
          case 'CONFIRM_REPORT':
            response = await handleConfirmReport()
            break
          default:
            response = { success: false, error: 'Unknown message type' }
        }

        sendResponse(response)
      } catch (err) {
        // 예상치 못한 에러 — popup이 무한 대기하지 않도록 반드시 응답
        sendResponse({ success: false, error: (err as Error).message ?? 'Internal error' })
      }
    }

    handle()
    return true // 비동기 응답 허용
  },
)
