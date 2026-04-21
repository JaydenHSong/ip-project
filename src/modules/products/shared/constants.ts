// Design Ref: §5.3 Design Tokens + §7.1 SP-API Regions
// Plan SC: SC-07 (Marketplace list must match Provider contract)

import type { Marketplace, LifecycleStatus, MappingStatus, SpApiRegion } from './types';

// =============================================================================
// Marketplaces (ordered by priority for UI tabs)
// =============================================================================

export const MARKETPLACES: readonly Marketplace[] = [
  'US', 'DE', 'UK', 'JP', 'CA', 'MX', 'FR', 'IT', 'ES', 'AU', 'SG',
] as const;

export const MARKETPLACE_LABELS: Record<Marketplace, string> = {
  US: '🇺🇸 United States',
  CA: '🇨🇦 Canada',
  MX: '🇲🇽 Mexico',
  UK: '🇬🇧 United Kingdom',
  DE: '🇩🇪 Germany',
  FR: '🇫🇷 France',
  IT: '🇮🇹 Italy',
  ES: '🇪🇸 Spain',
  JP: '🇯🇵 Japan',
  AU: '🇦🇺 Australia',
  SG: '🇸🇬 Singapore',
};

// =============================================================================
// SP-API regional grouping (refresh token & endpoint separated per region)
// =============================================================================

export const SP_API_REGIONS: Record<Marketplace, SpApiRegion> = {
  US: 'NA', CA: 'NA', MX: 'NA',
  UK: 'EU', DE: 'EU', FR: 'EU', IT: 'EU', ES: 'EU',
  JP: 'FE', AU: 'FE', SG: 'FE',
};

export const SP_API_ENDPOINTS: Record<SpApiRegion, string> = {
  NA: 'https://sellingpartnerapi-na.amazon.com',
  EU: 'https://sellingpartnerapi-eu.amazon.com',
  FE: 'https://sellingpartnerapi-fe.amazon.com',
};

// =============================================================================
// Enum values (for Zod enums + UI dropdowns)
// =============================================================================

export const LIFECYCLE_STATUSES: readonly LifecycleStatus[] = [
  'active', 'new', 'eol', 'discontinued',
] as const;

export const MAPPING_STATUSES: readonly MappingStatus[] = [
  'active', 'paused', 'archived',
] as const;

// =============================================================================
// CSV Template Headers (v1 — 변경 시 사용자에게 마이그레이션 가이드 필요)
// =============================================================================

export const CSV_TEMPLATE_HEADERS: readonly string[] = [
  'sku', 'asin', 'marketplace', 'is_primary',
  'product_name', 'product_name_ko',
  'device_model', 'color', 'model_name_ko',
  'version', 'ean_barcode',
  'unit_price', 'origin_country',
  'brand_id', 'parent_sku',
] as const;

export const CSV_REQUIRED_HEADERS: readonly string[] = [
  'sku', 'asin', 'marketplace',
] as const;

// =============================================================================
// ASIN format
// =============================================================================

export const ASIN_REGEX = /^B[0-9A-Z]{9}$/;

// =============================================================================
// Pagination
// =============================================================================

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 500;

// =============================================================================
// SP-API Rate Limit (Catalog Items API v2022-04-01)
// =============================================================================

export const SP_API_CATALOG_RATE_LIMIT = {
  requestsPerSecond: 5,
  burst: 5,
  timeoutMs: 10_000,
} as const;

// =============================================================================
// CSV import size guards (NFR-01: 1,000 rows < 60s)
// =============================================================================

export const CSV_MAX_ROWS = 10_000;
export const CSV_BATCH_SIZE = 200;  // chunk size for server-side batch insert
