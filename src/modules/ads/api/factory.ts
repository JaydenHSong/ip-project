// Design Ref: §7 — DI Container (Feature flag → adapter selection)
// Plan SC: SC-01 Mock↔Real 무중단 전환

import { createAdminClient as createPublicAdminClient, createAdsAdminClient } from '@/lib/supabase/admin'
import { adsConfig } from './infra/api-config'
import { rateLimiter } from './infra/rate-limiter'
import { tokenStore } from './infra/token-store'
import { AmazonAdsAdapter } from './adapters/amazon-ads-adapter'
import { AmazonSpAdapter } from './adapters/amazon-sp-adapter'
import { MockAdsAdapter } from './adapters/mock-ads-adapter'
import { MockSpAdapter } from './adapters/mock-sp-adapter'
import { SyncService } from './services/sync'
import { WriteBackService } from './services/write-back-service'
import { StreamService } from './services/stream-service'
import type { AdsPort } from './ports/ads-port'
import type { SpApiPort } from './ports/sp-api-port'

export function createAdsPort(profileId: string): AdsPort {
  if (adsConfig.isEnabled()) {
    return new AmazonAdsAdapter(profileId, rateLimiter, tokenStore)
  }
  return new MockAdsAdapter(profileId)
}

export function createSpApiPort(profileId: string): SpApiPort {
  if (adsConfig.isSpApiEnabled()) {
    return new AmazonSpAdapter(profileId, tokenStore)
  }
  return new MockSpAdapter(profileId)
}

// Design Ref: §7 — Service factory functions
export function createSyncService(profileId: string): SyncService {
  return new SyncService(
    createAdsPort(profileId),
    createSpApiPort(profileId),
    createAdsAdminClient(),
    createPublicAdminClient(),
  )
}

// Design Ref: §7 — WriteBack + Stream factory
export function createWriteBackService(profileId: string): WriteBackService {
  return new WriteBackService(
    createAdsPort(profileId),
    createAdsAdminClient(),
  )
}

export function createStreamService(): StreamService {
  return new StreamService(createAdsAdminClient())
}

// Convenience: check if running in mock mode
export function isMockMode(): boolean {
  return !adsConfig.isEnabled()
}
