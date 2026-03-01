// Chrome Runtime 메시지 타입

import type { ParsedPageData, SubmitReportPayload, SubmitReportResponse, AuthUser } from './types'

// Popup → Service Worker
export type PopupMessage =
  | { type: 'GET_AUTH_STATUS' }
  | { type: 'SIGN_IN' }
  | { type: 'SIGN_OUT' }
  | { type: 'SUBMIT_REPORT'; payload: SubmitReportPayload }
  | { type: 'GET_PAGE_DATA_FROM_TAB' }
  | { type: 'CAPTURE_SCREENSHOT' }

// Service Worker → Popup/Content
export type BackgroundResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }

// 응답 타입 매핑
export type AuthStatusResponse = {
  authenticated: boolean
  user: AuthUser | null
}

export type PageDataResponse = ParsedPageData | null

export type ScreenshotResponse = string // Base64

export type SubmitResponse = SubmitReportResponse

// Content Script → Service Worker
export type ContentMessage =
  | { type: 'PAGE_DATA_READY'; data: ParsedPageData }
  | { type: 'OPEN_POPUP' }
