// Sentinel API 클라이언트

import { API_BASE } from '@shared/constants'
import type { AuthUser, SubmitReportPayload, SubmitReportResponse } from '@shared/types'
import { getSession } from './auth'

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

export const submitReport = async (payload: SubmitReportPayload): Promise<SubmitReportResponse> => {
  const headers = await getHeaders()

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
  }

  const response = await fetch(`${API_BASE}/ext/submit-report`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new ApiError(
      errorData?.error?.message ?? `Request failed (${response.status})`,
      response.status,
    )
  }

  return response.json() as Promise<SubmitReportResponse>
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
