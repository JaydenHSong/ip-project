// OAuth token manager — Delegates to infra/token-store
// Design Ref: §2.1 — Rewrite: stub → real delegation

import { tokenStore, TokenStore } from './infra/token-store'
import type { AmazonTokenSet } from './types'

export class TokenManager {
  private store: TokenStore

  constructor() {
    this.store = tokenStore
  }

  async exchangeCode(authCode: string): Promise<AmazonTokenSet> {
    return this.store.exchangeCode(authCode)
  }

  async getAccessToken(profileId: string): Promise<string> {
    return this.store.getAccessToken(profileId)
  }

  async storeToken(profileId: string, tokenSet: AmazonTokenSet): Promise<void> {
    return this.store.storeToken(profileId, tokenSet)
  }

  invalidateToken(profileId: string): void {
    this.store.invalidate(profileId)
  }

  isConfigured(): boolean {
    return this.store.isConfigured()
  }
}

// Singleton (backward compatible with Phase 1 imports)
export const tokenManager = new TokenManager()
