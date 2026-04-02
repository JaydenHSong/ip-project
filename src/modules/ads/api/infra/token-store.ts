// Design Ref: §6.3 — Token Store (DB + in-memory cache)
// Plan SC: SC-06 Token 자동 갱신 0 downtime

import { createAdminClient } from '@/lib/supabase/admin'
import { adsConfig } from './api-config'
import type { AmazonTokenSet } from '../types'

// In-memory cache
const tokenCache = new Map<string, AmazonTokenSet>()

// Mutex to prevent concurrent refreshes
const refreshLocks = new Map<string, Promise<AmazonTokenSet>>()

export class TokenStore {
  // Get valid access token — refresh if expired
  async getAccessToken(profileId: string): Promise<string> {
    const cached = tokenCache.get(profileId)

    // Valid token in cache (60s buffer)
    if (cached && cached.expires_at > Date.now() + 60_000) {
      return cached.access_token
    }

    // Refresh with mutex lock
    const tokenSet = await this.refreshWithLock(profileId)
    return tokenSet.access_token
  }

  // Store new token set (after OAuth callback or refresh)
  async storeToken(profileId: string, tokenSet: AmazonTokenSet): Promise<void> {
    tokenCache.set(profileId, tokenSet)

    const supabase = createAdminClient()
    await supabase
      .from('ads.marketplace_profiles')
      .update({
        refresh_token: tokenSet.refresh_token,
        access_token_expires_at: new Date(tokenSet.expires_at).toISOString(),
      })
      .eq('profile_id', profileId)
  }

  // Exchange authorization code for token set
  async exchangeCode(authCode: string): Promise<AmazonTokenSet> {
    const res = await fetch(adsConfig.spApi.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: adsConfig.ads.clientId,
        client_secret: adsConfig.ads.clientSecret,
        redirect_uri: adsConfig.ads.redirectUri,
      }),
    })

    if (!res.ok) {
      throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`)
    }

    const data = await res.json() as { access_token: string; refresh_token: string; token_type: string; expires_in: number }
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      expires_at: Date.now() + data.expires_in * 1000,
    }
  }

  // Invalidate cached token
  invalidate(profileId: string): void {
    tokenCache.delete(profileId)
  }

  // Check if OAuth credentials are configured
  isConfigured(): boolean {
    return Boolean(adsConfig.ads.clientId && adsConfig.ads.clientSecret)
  }

  private async refreshWithLock(profileId: string): Promise<AmazonTokenSet> {
    // If another refresh is in progress, wait for it
    const existing = refreshLocks.get(profileId)
    if (existing) return existing

    const promise = this.doRefresh(profileId)
    refreshLocks.set(profileId, promise)

    try {
      return await promise
    } finally {
      refreshLocks.delete(profileId)
    }
  }

  private async doRefresh(profileId: string): Promise<AmazonTokenSet> {
    const supabase = createAdminClient()

    // Look up refresh_token from DB
    const { data: profile } = await supabase
      .from('ads.marketplace_profiles')
      .select('refresh_token')
      .eq('profile_id', profileId)
      .single()

    if (!profile?.refresh_token) {
      throw new Error(`No refresh token for profile ${profileId}`)
    }

    // Call Amazon OAuth refresh
    const res = await fetch(adsConfig.spApi.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: profile.refresh_token,
        client_id: adsConfig.ads.clientId,
        client_secret: adsConfig.ads.clientSecret,
      }),
    })

    if (!res.ok) {
      throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`)
    }

    const data = await res.json() as { access_token: string; refresh_token: string; token_type: string; expires_in: number }
    const tokenSet: AmazonTokenSet = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      expires_at: Date.now() + data.expires_in * 1000,
    }

    await this.storeToken(profileId, tokenSet)
    return tokenSet
  }
}

// Singleton
export const tokenStore = new TokenStore()
