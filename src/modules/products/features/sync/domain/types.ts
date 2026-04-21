// Design Ref: products-sync.design.md §5.1 — Core Types (Layer 4 Domain)
// Plan SC: SC-07 (Provider contract), SC-08 (audit via sync_runs)
//
// Pure domain types. NO I/O, NO Supabase, NO fetch imports here.
// Adapters translate SQ DataHub rows into these shapes before reaching domain logic.

// ─── Source rows (normalized from SQ DataHub) ──────────────────────────────

export type ErpRow = {
  material: string;                    // SAP material = Spigen SKU (e.g., 'ACS06234')
  materialDescriptionEn: string | null;
  materialDescriptionKo: string | null;
  brand: string | null;
  brandDescription: string | null;
  color: string | null;
  colorDescription: string | null;
  model: string | null;
  modelDescriptionEn: string | null;
  eanBarcode: string | null;            // 13 digits when present
  upcBarcode: string | null;
  materialStatus: string | null;        // Z3/Z5/Z6 = inactive/obsolete
  sourceUpdatedAt: string;              // ISO8601 from spg_operation_sis_z1ppr0010_1000.updated_at
};

export type ChannelRow = {
  channel: 'amazon' | 'shopify' | 'ebay' | 'ml';
  marketplace: string;                  // 'US' | 'CA' | ... (Amazon) or 'SHOPIFY' | 'EBAY' | 'ML'
  sourceTable: string;                  // e.g., 'sq_datahub.spg_amazon_all_listings'
  sourceRowId: number;                  // bigint id from source table
  sellerSku: string | null;             // raw SKU from listing (may have suffix)
  externalId: string;                   // ASIN / listing_id / ml_item_id
  ean: string | null;                   // 13-digit when product_id_type='4'
  productName: string | null;
  brand: string | null;
  status: string | null;                // 'Active' / 'Inactive' from source
  updatedAt: string;                    // ISO8601
};

// ─── Matching result ────────────────────────────────────────────────────────

export type MatchMethod = 'ean' | 'prefix8';

export type MatchResult =
  | { kind: 'matched'; sku: string; via: MatchMethod }
  | { kind: 'unmapped'; reason: UnmappedReason; candidates?: string[] };

export type UnmappedReason =
  | 'no_ean_no_prefix'
  | 'prefix_ambiguous'
  | 'invalid_sku_format'
  | 'schema_drift';

// ─── ERP Index (built once per pipeline run) ───────────────────────────────

export type ErpIndex = {
  byEan: Map<string, string>;           // ean (13-digit) → sku
  byPrefix8: Map<string, string[]>;     // first 8 chars of sku → [sku, sku, ...]
};

// ─── Pipeline / Stage results ──────────────────────────────────────────────

export type StageStatus = 'running' | 'success' | 'failed' | 'partial' | 'schema_drift';
export type StageKind = 'erp' | 'channel_match' | 'queue_resolve' | 'manual_csv' | 'schema_drift';
export type TriggerKind = 'cron' | 'manual' | 'api' | 'admin';

export type Stage1Result = {
  runId: string;
  status: StageStatus;
  rowsFetched: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  watermarkBefore: string | null;
  watermarkAfter: string | null;
  durationMs: number;
  errorMessage?: string;
};

export type Stage2Result = {
  runId: string;
  status: StageStatus;
  rowsFetched: number;
  rowsMapped: number;
  rowsUnmapped: number;
  rowsQueued: number;
  watermarkBefore: string | null;
  watermarkAfter: string | null;
  durationMs: number;
  errorMessage?: string;
};

export type PipelineResult = {
  pipelineId: string;
  stages: Array<Stage1Result | Stage2Result>;
  totalDurationMs: number;
  overallStatus: StageStatus;
};

// ─── Unmapped queue row shapes ──────────────────────────────────────────────

export type UnmappedQueueRow = {
  id: string;
  sourceTable: string;
  sourceRowId: number;
  channel: ChannelRow['channel'];
  marketplace: string | null;
  externalId: string;
  sourceSku: string | null;
  sourceEan: string | null;
  productName: string | null;
  brand: string | null;
  detectedAt: string;
  detectedRunId: string | null;
  reason: UnmappedReason | 'manual_flag' | 'schema_drift';
  reasonDetail: { candidates?: string[]; note?: string };
  status: 'pending' | 'resolved' | 'ignored';
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolvedSku: string | null;
  resolvedAction: 'mapped' | 'created_new' | 'ignored' | 'reverted' | null;
  undoExpiresAt: string | null;
};
