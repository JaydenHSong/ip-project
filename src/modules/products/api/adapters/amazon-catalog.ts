// Design Ref: §7.1 Amazon SP-API Catalog Items v2022-04-01
// Plan: FR-08 — SP-API Catalog adapter with rate limiting and region routing.
// Plan SC: supports SC-03 (Data Accuracy — enrichment feeds product_name/brand)
//
// Responsibilities:
//   - OAuth access token caching (per region, until expires_at)
//   - Region routing (NA/EU/FE) based on marketplace
//   - Rate limiting via shared src/lib/rate-limiter.ts
//   - Fail-safe fallback to UI-level message on 429 / 5xx
//
// ⚠️ Module Isolation: does NOT import from modules/ads/*. The rate-limiter
//    pattern lives in src/lib/rate-limiter.ts (shared, extracted per Design §6.3).

import { createRateLimiter, type RateLimiter } from '@/lib/rate-limiter';
import {
  SP_API_REGIONS,
  SP_API_ENDPOINTS,
  SP_API_CATALOG_RATE_LIMIT,
} from '@/modules/products/shared/constants';
import type { Marketplace, SpApiRegion } from '@/modules/products/shared/types';

// =============================================================================
// Types
// =============================================================================

export type EnrichedFields = {
  productName: string;
  brand: string;
  imageUrl?: string;
};

export type CatalogFetchResult =
  | { ok: true; data: EnrichedFields }
  | { ok: false; reason: 'not_found' | 'rate_limited' | 'network' | 'auth'; message: string };

type AccessTokenCache = { token: string; expiresAt: number };

// =============================================================================
// Config (read from env; caller responsible for setting these)
// =============================================================================

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) {
    throw new Error(`[amazon-catalog] Missing env: ${key}`);
  }
  return v;
}

function refreshTokenForRegion(region: SpApiRegion): string {
  switch (region) {
    case 'NA':
      return requireEnv('AMAZON_SP_API_REFRESH_TOKEN_US');
    case 'EU':
      return requireEnv('AMAZON_SP_API_REFRESH_TOKEN_EU');
    case 'FE':
      // FE may use a JP-specific token if set; fall back to EU/US as configured.
      return process.env.AMAZON_SP_API_REFRESH_TOKEN_JP
        ?? requireEnv('AMAZON_SP_API_REFRESH_TOKEN_UK');
  }
}

// =============================================================================
// State (module-scoped — resets on cold start)
// =============================================================================

const tokenCache = new Map<SpApiRegion, AccessTokenCache>();

const limiter: RateLimiter = createRateLimiter({
  requestsPerSecond: SP_API_CATALOG_RATE_LIMIT.requestsPerSecond,
  burst: SP_API_CATALOG_RATE_LIMIT.burst,
  maxQueue: 200,
});

// =============================================================================
// Auth
// =============================================================================

async function getAccessToken(region: SpApiRegion): Promise<string> {
  const cached = tokenCache.get(region);
  const now = Date.now();
  if (cached && cached.expiresAt > now + 60_000) {
    return cached.token;
  }

  const refreshToken = refreshTokenForRegion(region);
  const clientId = requireEnv('AMAZON_CLIENT_ID');
  const clientSecret = requireEnv('AMAZON_CLIENT_SECRET');

  const res = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`[amazon-catalog] Token refresh failed: ${res.status}`);
  }

  const body = (await res.json()) as { access_token: string; expires_in: number };
  const entry: AccessTokenCache = {
    token: body.access_token,
    expiresAt: now + body.expires_in * 1000,
  };
  tokenCache.set(region, entry);
  return entry.token;
}

// =============================================================================
// Catalog Items fetch
// =============================================================================

const MARKETPLACE_IDS: Record<Marketplace, string> = {
  US: 'ATVPDKIKX0DER',
  CA: 'A2EUQ1WTGCTBG2',
  MX: 'A1AM78C64UM0Y8',
  UK: 'A1F83G8C2ARO7P',
  DE: 'A1PA6795UKMFR9',
  FR: 'A13V1IB3VIYZZH',
  IT: 'APJ6JRA9NG5V4',
  ES: 'A1RKKUPIHCS9HS',
  JP: 'A1VC38T7YXB528',
  AU: 'A39IBJ37TRP1C6',
  SG: 'A19VAU5U5O7RUS',
};

type CatalogApiResponse = {
  asin: string;
  summaries?: Array<{ marketplaceId: string; itemName?: string; brand?: string }>;
  images?: Array<{ marketplaceId: string; images: Array<{ link: string }> }>;
};

export async function fetchCatalogItem(
  asin: string,
  marketplace: Marketplace
): Promise<CatalogFetchResult> {
  const region = SP_API_REGIONS[marketplace];
  const marketplaceId = MARKETPLACE_IDS[marketplace];

  try {
    return await limiter.run(region, async () => {
      const token = await getAccessToken(region);
      const url = `${SP_API_ENDPOINTS[region]}/catalog/2022-04-01/items/${asin}?marketplaceIds=${marketplaceId}&includedData=summaries,images`;

      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        SP_API_CATALOG_RATE_LIMIT.timeoutMs
      );

      const res = await fetch(url, {
        headers: {
          'x-amz-access-token': token,
          Accept: 'application/json',
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (res.status === 404) {
        return { ok: false, reason: 'not_found', message: 'ASIN not found in Amazon Catalog' };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, reason: 'auth', message: `Auth failure: ${res.status}` };
      }
      if (res.status === 429) {
        return { ok: false, reason: 'rate_limited', message: 'SP-API rate limit' };
      }
      if (!res.ok) {
        return { ok: false, reason: 'network', message: `HTTP ${res.status}` };
      }

      const body = (await res.json()) as CatalogApiResponse;
      const summary = body.summaries?.find((s) => s.marketplaceId === marketplaceId);
      const imageUrl = body.images
        ?.find((i) => i.marketplaceId === marketplaceId)
        ?.images?.[0]?.link;

      if (!summary || !summary.itemName || !summary.brand) {
        return {
          ok: false,
          reason: 'not_found',
          message: 'Catalog returned incomplete summary',
        };
      }

      return {
        ok: true,
        data: {
          productName: summary.itemName,
          brand: summary.brand,
          imageUrl,
        },
      };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: 'network', message };
  }
}

// For diagnostics / health endpoint (admin only, optional).
export function catalogRateStats() {
  return limiter.stats();
}
