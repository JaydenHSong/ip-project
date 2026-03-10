// Sentinel API 클라이언트

import { API_BASE } from '@shared/constants'
import type { AuthUser, SubmitReportPayload, SubmitReportResponse } from '@shared/types'
import { getSession, forceRefreshSession } from './auth'

class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

const getHeaders = async (): Promise<Record<string, string>> => {
  const session = await getSession()
  if (!session) throw new AuthError('Not authenticated')

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    'X-Extension-Version': chrome.runtime.getManifest().version,
  }
}

// 네트워크 상태 확인 + fetch 래퍼
const safeFetch = async (url: string, options: RequestInit): Promise<Response> => {
  if (!navigator.onLine) {
    throw new ApiError('You are offline. Check your internet connection.', 0)
  }

  try {
    return await fetch(url, options)
  } catch (err) {
    // TypeError: Failed to fetch (네트워크 연결 끊김, DNS 실패, CORS 등)
    if (err instanceof TypeError) {
      throw new ApiError('Network error. Check your internet connection and try again.', 0)
    }
    throw err
  }
}

export const submitReport = async (payload: SubmitReportPayload): Promise<SubmitReportResponse> => {
  const body = {
    asin: payload.page_data.asin,
    marketplace: payload.page_data.marketplace,
    title: payload.page_data.title,
    seller_name: payload.page_data.seller_name,
    seller_id: payload.page_data.seller_id,
    images: payload.page_data.images,
    violation_type: payload.violation_type,
    violation_category: payload.violation_category,
    note: payload.note,
    screenshot_base64: payload.screenshot_base64,
    extra_fields: payload.extra_fields,
  }

  // 1차 시도
  const headers = await getHeaders()
  const response = await safeFetch(`${API_BASE}/ext/submit-report`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  // 401 → 토큰 강제 갱신 후 재시도 (1회)
  if (response.status === 401) {
    const refreshed = await forceRefreshSession()
    if (!refreshed) throw new AuthError('Session expired. Please sign in again.')

    const retryHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${refreshed.access_token}`,
      'X-Extension-Version': chrome.runtime.getManifest().version,
    }
    const retryResponse = await safeFetch(`${API_BASE}/ext/submit-report`, {
      method: 'POST',
      headers: retryHeaders,
      body: JSON.stringify(body),
    })

    if (retryResponse.status === 401) {
      throw new AuthError('Session expired. Please sign in again.')
    }

    if (!retryResponse.ok) {
      const errorData = await retryResponse.json().catch(() => ({ error: { message: 'Unknown error' } }))
      throw new ApiError(
        errorData?.error?.message ?? `Request failed (${retryResponse.status})`,
        retryResponse.status,
      )
    }

    return retryResponse.json() as Promise<SubmitReportResponse>
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new ApiError(
      errorData?.error?.message ?? `Request failed (${response.status})`,
      response.status,
    )
  }

  return response.json() as Promise<SubmitReportResponse>
}

export const submitPassiveCollect = async (
  items: { id: string; type: string; data: unknown; collected_at: string }[],
): Promise<{ created: number; duplicates: number; errors: { asin: string; error: string }[] }> => {
  const headers = await getHeaders()
  const body = {
    items: items.map((item) => ({
      type: item.type,
      data: item.data,
      collected_at: item.collected_at,
    })),
  }

  const response = await safeFetch(`${API_BASE}/ext/passive-collect`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (response.status === 401) {
    throw new AuthError('Session expired')
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new ApiError(
      errorData?.error?.message ?? `Request failed (${response.status})`,
      response.status,
    )
  }

  return response.json()
}

export const checkAuthStatus = async (): Promise<{
  authenticated: boolean
  user: AuthUser | null
}> => {
  const session = await getSession()
  if (!session) return { authenticated: false, user: null }

  return {
    authenticated: true,
    user: session.user,
  }
}

// Background Fetch: pending queue item 조회
export const fetchPendingQueue = async (): Promise<{
  item: { id: string; asin: string; marketplace: string } | null
}> => {
  const headers = await getHeaders()
  const response = await safeFetch(`${API_BASE}/ext/fetch-queue`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) return { item: null }
  return response.json()
}

// Background Fetch: 결과 전송
export const submitFetchResult = async (
  queueId: string,
  pageData: Record<string, unknown>,
  screenshotBase64?: string,
): Promise<{ listing?: Record<string, unknown> }> => {
  const headers = await getHeaders()
  const response = await safeFetch(`${API_BASE}/ext/fetch-result`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      queue_id: queueId,
      page_data: pageData,
      screenshot_base64: screenshotBase64,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as { error: { message: string } }
    throw new ApiError(err.error?.message ?? 'Submit failed', response.status)
  }

  return response.json()
}
