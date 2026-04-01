// OAuth token manager for Amazon Ads API (multi-account, with cache)
// TODO: Implement when Amazon Ads API authorization is granted

import type { AmazonTokenSet } from './types'

// In-memory token cache keyed by profile_id
const tokenCache = new Map<string, AmazonTokenSet>()

export class TokenManager {
  private clientId: string
  private clientSecret: string
  private redirectUri: string

  constructor() {
    this.clientId = process.env.AMAZON_ADS_CLIENT_ID ?? ''
    this.clientSecret = process.env.AMAZON_ADS_CLIENT_SECRET ?? ''
    this.redirectUri = process.env.AMAZON_ADS_REDIRECT_URI ?? ''
  }

  // Exchange authorization code for token set
  // TODO: Implement OAuth token exchange
  async exchangeCode(_authCode: string): Promise<AmazonTokenSet> {
    throw new Error('Not implemented: Waiting for Amazon Ads API authorization')
  }

  // Refresh an expired access token
  // TODO: Implement token refresh
  async refreshToken(_refreshToken: string): Promise<AmazonTokenSet> {
    throw new Error('Not implemented: Waiting for Amazon Ads API authorization')
  }

  // Get a valid access token for a profile, refreshing if expired
  async getAccessToken(profileId: string): Promise<string> {
    const cached = tokenCache.get(profileId)

    if (cached && cached.expires_at > Date.now() + 60_000) {
      return cached.access_token
    }

    // TODO: Look up refresh_token from ads.marketplace_profiles table
    // TODO: Call refreshToken() and update cache + DB
    throw new Error(`Not implemented: No valid token for profile ${profileId}`)
  }

  // Store token set in cache and persist to DB
  // TODO: Implement DB persistence
  async storeToken(profileId: string, tokenSet: AmazonTokenSet): Promise<void> {
    tokenCache.set(profileId, tokenSet)
    // TODO: Persist to ads.marketplace_profiles table
  }

  // Remove token from cache (on logout or revocation)
  invalidateToken(profileId: string): void {
    tokenCache.delete(profileId)
  }

  // Check if credentials are configured
  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.redirectUri)
  }
}

// Singleton instance
export const tokenManager = new TokenManager()
