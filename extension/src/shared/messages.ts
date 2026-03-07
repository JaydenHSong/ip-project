// Chrome Runtime 메시지 타입

import type { ParsedPageData, PassivePageData, PassiveSearchData, SubmitReportPayload, SubmitReportResponse, AuthUser } from './types'

// Popup → Service Worker
export type PopupMessage =
  | { type: 'GET_AUTH_STATUS' }
  | { type: 'SIGN_IN' }
  | { type: 'SIGN_OUT' }
  | { type: 'SUBMIT_REPORT'; payload: SubmitReportPayload }
  | { type: 'QUEUE_REPORT'; payload: SubmitReportPayload }
  | { type: 'PREPARE_REPORT'; payload: SubmitReportPayload }
  | { type: 'CONFIRM_REPORT' }
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
  | { type: 'PASSIVE_PAGE_DATA'; data: PassivePageData }
  | { type: 'PASSIVE_SEARCH_DATA'; data: PassiveSearchData }

// SC Form Filler → Service Worker
export type ScContentMessage =
  | { type: 'SC_FORM_FILLED'; reportId: string }
  | { type: 'SC_SUBMIT_DETECTED'; reportId: string; caseId: string | null }

// Service Worker → Content Script (Front-end auto-report)
export type FrontReportMessage = {
  type: 'EXECUTE_FRONT_REPORT'
  violationCode: string
  asin: string
  sellerName?: string
  brandName?: string
  aiDetails: string
  listingTitle?: string
  marketplace?: string
  reportId: string
}

// Content Script → Service Worker (Front-end report result)
export type FrontReportResultMessage = {
  type: 'FRONT_REPORT_RESULT'
  reportId: string
  success: boolean
  durationMs: number
  error?: string
}
