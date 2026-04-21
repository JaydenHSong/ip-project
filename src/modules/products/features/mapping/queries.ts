// Design Ref: §3 API Contract + §4.1 features/mapping
// Plan SC: SC-07 (Provider v1), SC-08 (Audit via DB trigger)
//
// asin_mapping CRUD. CSV parsing lives in ./csv-parser.ts (kept separate for NFR-06).
// Audit log is populated by DB trigger — no app-level audit code here.

import { createAdminClient } from '@/lib/supabase/admin';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  CSV_BATCH_SIZE,
} from '@/modules/products/shared/constants';
import type {
  AsinMapping,
  ByAsinResponse,
  BulkUpsertResponse,
  CsvImportRow,
  ConflictStrategy,
  Marketplace,
  MappingListResponse,
  Pagination,
  MappingStatus,
} from '@/modules/products/shared/types';
import {
  rowToMapping,
  rowToMappingRow,
  type AsinMappingDbRow,
  type JoinedMappingRow,
} from '@/modules/products/shared/row-mappers';
import type { ListMappingQuery } from './validators';

// =============================================================================
// List (joined product fields for grid rendering)
// =============================================================================

const JOIN_COLUMNS =
  'id, product_id, asin, marketplace, is_primary, status, brand_market_id, created_by, updated_by, created_at, updated_at, products:product_id (sku, product_name, product_name_ko, device_model, color, model_name_ko, ean_barcode, version)';

export async function listMapping(q: ListMappingQuery): Promise<MappingListResponse> {
  const db = createAdminClient();
  const page = Math.max(1, q.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, q.limit ?? DEFAULT_PAGE_SIZE));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = db
    .schema('products')
    .from('asin_mapping')
    .select(JOIN_COLUMNS, { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (q.marketplace) query = query.eq('marketplace', q.marketplace);
  if (q.primaryOnly) query = query.eq('is_primary', true);
  if (q.search) {
    const s = q.search.replace(/[%_]/g, '');
    query = query.or(
      `asin.ilike.%${s}%,products.sku.ilike.%${s}%,products.product_name.ilike.%${s}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as JoinedMappingRow[];
  const pagination: Pagination = { page, limit, total: count ?? rows.length };
  return { data: rows.map(rowToMappingRow), pagination };
}

// =============================================================================
// Get by ASIN (Provider v1 — SHAPE LOCKED — do NOT change fields)
// =============================================================================

export async function getByAsin(
  asin: string,
  marketplace: Marketplace
): Promise<ByAsinResponse | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .schema('products')
    .from('asin_mapping')
    .select(
      'asin, marketplace, is_primary, status, products:product_id (sku, product_name, category, brands:brand_id (name))'
    )
    .eq('asin', asin)
    .eq('marketplace', marketplace)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as {
    asin: string;
    marketplace: Marketplace;
    is_primary: boolean;
    status: MappingStatus;
    products: {
      sku: string;
      product_name: string;
      category: string | null;
      brands: { name: string } | null;
    } | null;
  };

  if (!row.products) return null;

  return {
    sku: row.products.sku,
    productName: row.products.product_name,
    brand: row.products.brands?.name ?? '',
    category: row.products.category,
    marketplace: row.marketplace,
    isPrimary: row.is_primary,
    status: row.status,
  };
}

// =============================================================================
// Get by id
// =============================================================================

export async function getMappingById(id: string): Promise<AsinMapping | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .schema('products')
    .from('asin_mapping')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToMapping(data as AsinMappingDbRow) : null;
}

/** Fetch mapping WITH joined catalog fields — used by EditSlidePanel. */
export async function getMappingRowById(id: string) {
  const db = createAdminClient();
  const { data, error } = await db
    .schema('products')
    .from('asin_mapping')
    .select(JOIN_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToMappingRow(data as unknown as JoinedMappingRow);
}

// =============================================================================
// Patch (admin is_primary / status / brand_market_id)
// =============================================================================

export type PatchMappingInput = {
  isPrimary?: boolean;
  status?: MappingStatus;
  brandMarketId?: string | null;
};

export async function patchMapping(
  id: string,
  patch: PatchMappingInput,
  userId: string
): Promise<AsinMapping> {
  const db = createAdminClient();
  const payload: Record<string, unknown> = { updated_by: userId };
  if (patch.isPrimary !== undefined) payload.is_primary = patch.isPrimary;
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.brandMarketId !== undefined) payload.brand_market_id = patch.brandMarketId;

  const { data, error } = await db
    .schema('products')
    .from('asin_mapping')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return rowToMapping(data as AsinMappingDbRow);
}

/** Soft delete → status='archived' (audit trigger records the UPDATE). */
export async function softDeleteMapping(id: string, userId: string): Promise<void> {
  await patchMapping(id, { status: 'archived' }, userId);
}

// =============================================================================
// Bulk upsert (commit after dry-run)
// =============================================================================

export type BulkUpsertInput = {
  rows: Array<CsvImportRow & { product_id: string }>;
  onConflict: ConflictStrategy;
  userId: string;
  orgUnitId: string;
};

export async function bulkUpsert(input: BulkUpsertInput): Promise<BulkUpsertResponse> {
  const db = createAdminClient();
  const errors: Array<{ row: number; message: string }> = [];
  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (let start = 0; start < input.rows.length; start += CSV_BATCH_SIZE) {
    const batch = input.rows.slice(start, start + CSV_BATCH_SIZE);
    const payload = batch.map((r) => ({
      product_id: r.product_id,
      asin: r.asin,
      marketplace: r.marketplace,
      is_primary: r.is_primary ?? false,
      status: 'active' as const,
      created_by: input.userId,
      updated_by: input.userId,
    }));

    const { error } = await db
      .schema('products')
      .from('asin_mapping')
      .upsert(payload, {
        onConflict: 'asin,marketplace',
        ignoreDuplicates: input.onConflict === 'skip',
      });

    if (error) {
      for (let i = 0; i < batch.length; i++) {
        failed += 1;
        errors.push({ row: start + i + 1, message: error.message });
      }
    } else if (input.onConflict === 'overwrite') {
      updated += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { summary: { inserted, updated, failed }, errors };
}
