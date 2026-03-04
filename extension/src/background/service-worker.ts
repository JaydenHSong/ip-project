// Service Worker 엔트리 — 메시지 핸들러

import type { PopupMessage, BackgroundResponse, AuthStatusResponse, PageDataResponse, ScreenshotResponse, SubmitResponse } from '@shared/messages'
import type { ParsedPageData } from '@shared/types'
import { signInWithGoogle, getSession, signOut } from './auth'
import { submitReport, checkAuthStatus } from './api'
import { captureScreenshot } from './screenshot'
import { enqueue, flush, cleanExpiredDedup } from './passive-queue'

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

const handleGetPageData = async (): Promise<BackgroundResponse<PageDataResponse>> => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return { success: false, error: 'No active tab' }

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_DATA' })
    if (response?.success) {
      return { success: true, data: response.data as ParsedPageData }
    }
    return { success: false, error: 'Failed to get page data' }
  } catch (err) {
    return { success: false, error: (err as Error).message }
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

const handleOpenPopup = (): void => {
  // Manifest V3에서는 programmatic popup open 불가
  // 대신 badge로 사용자에게 알림
  chrome.action.setBadgeText({ text: '!' })
  chrome.action.setBadgeBackgroundColor({ color: '#F97316' })

  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' })
  }, 3000)
}

// 패시브 수집: 5분마다 배치 전송, 1시간마다 중복 필터 정리
chrome.alarms.create('passive-flush', { periodInMinutes: 5 })
chrome.alarms.create('passive-dedup-cleanup', { periodInMinutes: 60 })

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'passive-flush') flush()
  if (alarm.name === 'passive-dedup-cleanup') cleanExpiredDedup()
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
        default:
          response = { success: false, error: 'Unknown message type' }
      }

      sendResponse(response)
    }

    handle()
    return true // 비동기 응답 허용
  },
)
