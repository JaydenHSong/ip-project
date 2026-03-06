// Supabase Auth — Google OAuth via chrome.identity

import { createClient } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'
import { storage } from '@shared/storage'
import { API_BASE } from '@shared/constants'
import type { AuthUser } from '@shared/types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
})

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000 // 만료 5분 전 갱신

const storeSession = async (session: Session): Promise<void> => {
  await Promise.all([
    storage.set('auth.access_token', session.access_token),
    storage.set('auth.refresh_token', session.refresh_token),
    storage.set('auth.expires_at', session.expires_at ?? 0),
  ])

  if (session.user) {
    // 실제 역할은 API에서 조회, 기본값은 viewer
    let role = 'viewer'
    try {
      const res = await fetch(`${API_BASE}/ext/auth-status`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        role = data?.user?.role ?? 'viewer'
      }
    } catch {
      // 역할 조회 실패 시 기본값 사용
    }

    const user: AuthUser = {
      id: session.user.id,
      email: session.user.email ?? '',
      name: session.user.user_metadata?.full_name ?? session.user.email ?? '',
      avatar_url: session.user.user_metadata?.avatar_url ?? '',
      role,
    }
    await storage.set('auth.user', user)
  }
}

const clearSession = async (): Promise<void> => {
  await storage.remove('auth.access_token', 'auth.refresh_token', 'auth.user', 'auth.expires_at')
}

const isTokenExpiringSoon = (expiresAt: number): boolean => {
  return Date.now() >= (expiresAt * 1000) - TOKEN_REFRESH_BUFFER_MS
}

export const signInWithGoogle = async (): Promise<AuthUser> => {
  const redirectUrl = chrome.identity.getRedirectURL()
  const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`

  const responseUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      (url) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        if (!url) {
          reject(new Error('Auth flow returned no URL'))
          return
        }
        resolve(url)
      },
    )
  })

  const hashParams = new URLSearchParams(responseUrl.split('#')[1] ?? '')
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')

  if (!accessToken || !refreshToken) {
    throw new Error('Missing tokens in auth response')
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (error || !data.session) {
    throw new Error(error?.message ?? 'Failed to set session')
  }

  await storeSession(data.session)

  const user = await storage.get('auth.user')
  if (!user) throw new Error('Failed to store user')
  return user
}

export const getSession = async (): Promise<{ access_token: string; user: AuthUser } | null> => {
  const accessToken = await storage.get('auth.access_token')
  const refreshToken = await storage.get('auth.refresh_token')
  const expiresAt = await storage.get('auth.expires_at')
  const user = await storage.get('auth.user')

  if (!accessToken || !refreshToken || !user) return null

  // 토큰 만료 임박 시 자동 갱신 (expiresAt 없거나 0이면 무조건 갱신 시도)
  if (!expiresAt || isTokenExpiringSoon(expiresAt)) {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    })

    if (error || !data.session) {
      await clearSession()
      return null
    }

    await storeSession(data.session)
    return { access_token: data.session.access_token, user }
  }

  return { access_token: accessToken, user }
}

// 401 발생 시 강제 토큰 갱신 — API 재시도용
export const forceRefreshSession = async (): Promise<{ access_token: string; user: AuthUser } | null> => {
  const refreshToken = await storage.get('auth.refresh_token')
  const user = await storage.get('auth.user')
  if (!refreshToken || !user) return null

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  })

  if (error || !data.session) {
    await clearSession()
    return null
  }

  await storeSession(data.session)
  return { access_token: data.session.access_token, user }
}

export const signOut = async (): Promise<void> => {
  const accessToken = await storage.get('auth.access_token')
  if (accessToken) {
    await supabase.auth.signOut().catch(() => {})
  }
  await clearSession()
}
