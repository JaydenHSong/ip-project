// Design Ref: §2.4 TypeScript Types
// Plan SC: SC-07 (Provider Contract v1 — types below define the locked shape)
//
// Conventions:
// - `type` only (interface / enum forbidden — CLAUDE.md convention)
// - camelCase in TS <-> snake_case in DB (mapped via queries.ts serialization)
// - Provider v1 response shapes (ByAsinResponse) are LOCKED — additions OK, removals require v2 endpoint

// =============================================================================
// Enum-like union types
// =============================================================================

export type Marketplace =
  | 'US' | 'CA' | 'MX'
  | 'UK' | 'DE' | 'FR' | 'IT' | 'ES'
  | 'JP' | 'AU' | 'SG';

export type LifecycleStatus = 'active' | 'new' | 'eol' | 'discontinued';

export type MappingStatus = 'active' | 'paused' | 'archived';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export type AuditSource = 'api' | 'csv' | 'trigger';

export type ConflictStrategy = 'skip' | 'overwrite';

export type SpApiRegion = 'NA' | 'EU' | 'FE';

// =============================================================================
// Domain: Product (SKU master)
// =============================================================================

export type Product = {
  id: string;
  // Identity
  sku: string;
  parentSku: string | null;

  // 자재 내역
  productName: string;
  productNameKo: string | null;
  productNameEnShort: string | null;
  modelName: string | null;
  modelNameKo: string | null;

  // Device / Appearance
  deviceModel: string | null;
  color: string | null;

  // Batch / Identifiers
  version: string;
  eanBarcode: string | null;

  // Commerce
  unitPrice: number | null;
  originCountry: string | null;
  brandId: string;
  category: string | null;
  lifecycleStatus: LifecycleStatus;

  // Change tracking
  changeReason: string | null;
  changeDetail: string | null;

  // Operations
  leadTimeDays: number | null;
  inboxQty: number | null;
  outboxQty: number | null;
  itemGrade: string | null;
  inventoryGrade: string | null;
  mrpManager: string | null;

  // Dimensions (mm)
  rawDimWidth: number | null;
  rawDimHeight: number | null;
  rawDimDepth: number | null;
  packageDim: string | null;

  // Organization
  batchCreatedAt: string | null;  // ISO date (yyyy-mm-dd)
  department: string | null;
  orgUnitId: string;

  // Extensibility
  metadata: Record<string, unknown>;

  // Audit metadata
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

// =============================================================================
// Domain: AsinMapping
// =============================================================================

export type AsinMapping = {
  id: string;
  productId: string;
  asin: string;
  marketplace: Marketplace;
  isPrimary: boolean;
  status: MappingStatus;
  brandMarketId: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

// Joined view (asin_mapping + products) used by the /mapping list UI
export type AsinMappingRow = AsinMapping & {
  sku: string;
  productName: string;
  productNameKo: string | null;
  deviceModel: string | null;
  color: string | null;
  modelNameKo: string | null;
  brand?: string;
  eanBarcode: string | null;
  version: string;
};

// =============================================================================
// Domain: Audit
// =============================================================================

export type AuditEntry = {
  id: string;
  mappingId: string | null;
  userId: string;
  action: AuditAction;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  source: AuditSource;
  createdAt: string;
};

// =============================================================================
// CSV Import
// =============================================================================

export type CsvImportRow = {
  sku: string;
  asin: string;
  marketplace: Marketplace;
  is_primary?: boolean;
  product_name?: string;
  product_name_ko?: string;
  model_name_ko?: string;
  device_model?: string;
  color?: string;
  version?: string;
  ean_barcode?: string;
  unit_price?: number;
  origin_country?: string;
  brand_id?: string;
  parent_sku?: string;
};

export type CsvDryRunRowStatus = 'ok' | 'conflict' | 'invalid';

export type CsvDryRunRow = {
  row: number;                               // 1-based CSV line
  status: CsvDryRunRowStatus;
  message?: string;
  existing?: Partial<AsinMapping>;
  incoming: CsvImportRow;
};

export type CsvDryRunResult = {
  summary: {
    total: number;
    valid: number;
    conflicts: number;
    invalid: number;
  };
  rows: CsvDryRunRow[];
};

// =============================================================================
// API Response Shapes (v1 LOCKED for Provider endpoints)
// =============================================================================

export type Pagination = {
  page: number;
  limit: number;
  total: number;
};

export type MappingListResponse = {
  data: AsinMappingRow[];
  pagination: Pagination;
};

export type BulkUpsertResponse = {
  summary: {
    inserted: number;
    updated: number;
    failed: number;
  };
  errors: Array<{ row: number; message: string }>;
};

// ⚠️ Provider v1 — 필드 삭제/이름 변경 금지 (변경 시 /api/products/v2/by-asin 신규 엔드포인트로)
// Additions OK (backward compatible): matched_via, last_synced_at added by products-sync feature.
export type ByAsinResponse = {
  sku: string;
  productName: string;
  brand: string;
  category: string | null;
  marketplace: Marketplace;
  isPrimary: boolean;
  status: MappingStatus;
  // products-sync extensions (FR-14):
  matchedVia: 'ean' | 'prefix8' | 'manual' | 'enrich' | null;
  lastSyncedAt: string | null;
};

export type ByAsinNotFoundResponse = {
  error: 'ASIN not mapped';
  asin: string;
  marketplace: Marketplace;
};

// =============================================================================
// Error shapes
// =============================================================================

export type ApiErrorResponse = {
  error: string;
  fieldErrors?: Record<string, string[]>;
  details?: unknown;
};
