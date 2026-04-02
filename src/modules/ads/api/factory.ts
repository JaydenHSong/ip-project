// Design Ref: §7 — DI Container (Feature flag → adapter selection)
// Plan SC: SC-01 Mock↔Real 무중단 전환

import { adsConfig } from './infra/api-config'
import { rateLimiter } from './infra/rate-limiter'
import { tokenStore } from './infra/token-store'
import { MockAdsAdapter } from './adapters/mock-ads-adapter'
import { MockSpAdapter } from './adapters/mock-sp-adapter'
import type { AdsPort } from './ports/ads-port'
import type { SpApiPort } from './ports/sp-api-port'

export function createAdsPort(profileId: string): AdsPort {
  if (adsConfig.isEnabled()) {
    // Real adapter will be added in module-3 (after API authorization)
    // For now, fall back to mock even if flag is true but adapter not available
    try {
      // Dynamic import to avoid build error when adapter doesn't exist yet
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AmazonAdsAdapter } = require('./adapters/amazon-ads-adapter') as { AmazonAdsAdapter: new (profileId: string, rl: typeof rateLimiter, ts: typeof tokenStore) => AdsPort }
      return new AmazonAdsAdapter(profileId, rateLimiter, tokenStore)
    } catch {
      // Adapter not yet implemented — fall back to mock
      return new MockAdsAdapter(profileId)
    }
  }
  return new MockAdsAdapter(profileId)
}

export function createSpApiPort(profileId: string): SpApiPort {
  if (adsConfig.isSpApiEnabled()) {
    try {
      const { AmazonSpAdapter } = require('./adapters/amazon-sp-adapter') as { AmazonSpAdapter: new (profileId: string, ts: typeof tokenStore) => SpApiPort }
      return new AmazonSpAdapter(profileId, tokenStore)
    } catch {
      return new MockSpAdapter(profileId)
    }
  }
  return new MockSpAdapter(profileId)
}

// Convenience: check if running in mock mode
export function isMockMode(): boolean {
  return !adsConfig.isEnabled()
}
