// Design Ref: §4.1 features/catalog (SKU master CRUD)
// Plan SC: SC-07 Provider Contract — queries here back the /products catalog page.
//
// DB access via createAdminClient() (service_role). Route handlers must call
// withAuth(handler, minRole) BEFORE invoking these functions.

import { createAdminClient } from '@/lib/supabase/admin';
import type { Product, LifecycleStatus } from '@/modules/products/shared/types';
import { rowToProduct, type ProductRow } from '@/modules/products/shared/row-mappers';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/modules/products/shared/constants';

// =============================================================================
// Types
// =============================================================================

export type ProductListQuery = {
  search?: string;            // matches sku / ean / product_name / product_name_ko
  deviceModel?: string;
  brandId?: string;
  lifecycleStatus?: LifecycleStatus;
  latestVersionOnly?: boolean; // default true
  page?: number;
  limit?: number;
};

export type ProductListResult = {
  data: Product[];
  pagination: { page: number; limit: number; total: number };
};

// Fields eligible for upsert from CSV / Quick Add form.
export type ProductUpsertInput = {
  sku: string;
  parentSku?: string | null;
  productName: string;
  productNameKo?: string | null;
  modelName?: string | null;
  modelNameKo?: string | null;
  deviceModel?: string | null;
  color?: string | null;
  version?: string;
  eanBarcode?: string | null;
  unitPrice?: number | null;
  originCountry?: string | null;
  brandId: string;
  category?: string | null;
  lifecycleStatus?: LifecycleStatus;
  changeReason?: string | null;
  changeDetail?: string | null;
  metadata?: Record<string, unknown>;
};

export type UpsertContext = {
  userId: string;     // from withAuth session
  orgUnitId: string;  // from JWT / user preference
};

// =============================================================================
// Queries
// =============================================================================

/** List products with optional filters. Returns latest version by default. */
export async function listProducts(q: ProductListQuery): Promise<ProductListResult> {
  const db = createAdminClient();
  const page = Math.max(1, q.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, q.limit ?? DEFAULT_PAGE_SIZE));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = db
    .schema('products').from('products')
    .select('*', { count: 'exact' })
    .order('sku', { ascending: true })
    .order('version', { ascending: false })
    .range(from, to);

  if (q.search) {
    const s = q.search.replace(/[%_]/g, '');
    query = query.or(
      `sku.ilike.%${s}%,ean_barcode.ilike.%${s}%,product_name.ilike.%${s}%,product_name_ko.ilike.%${s}%`
    );
  }
  if (q.deviceModel) query = query.eq('device_model', q.deviceModel);
  if (q.brandId) query = query.eq('brand_id', q.brandId);
  if (q.lifecycleStatus) query = query.eq('lifecycle_status', q.lifecycleStatus);

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = (data ?? []) as ProductRow[];
  const filtered = q.latestVersionOnly === false ? rows : dedupeToLatestVersion(rows);

  return {
    data: filtered.map(rowToProduct),
    pagination: { page, limit, total: count ?? filtered.length },
  };
}

/** Fetch one product by SKU (latest version) or SKU+version. */
export async function getProductBySku(
  sku: string,
  version?: string
): Promise<Product | null> {
  const db = createAdminClient();
  let query = db.schema('products').from('products').select('*').eq('sku', sku).limit(1);
  if (version) {
    query = query.eq('version', version);
  } else {
    query = query.order('version', { ascending: false });
  }
  const { data, error } = await query;
  if (error) throw error;
  const row = (data?.[0] as ProductRow | undefined) ?? null;
  return row ? rowToProduct(row) : null;
}

/**
 * Upsert by (sku, version). Reject if brand_id missing (Q5 decision).
 * Returns the resolved Product row.
 */
export async function upsertProduct(
  input: ProductUpsertInput,
  ctx: UpsertContext
): Promise<Product> {
  if (!input.brandId) {
    throw new Error('brand_id is required — row rejected (Q5 policy)');
  }

  const db = createAdminClient();
  const payload = {
    sku: input.sku,
    parent_sku: input.parentSku ?? null,
    product_name: input.productName,
    product_name_ko: input.productNameKo ?? null,
    model_name: input.modelName ?? null,
    model_name_ko: input.modelNameKo ?? null,
    device_model: input.deviceModel ?? null,
    color: input.color ?? null,
    version: input.version ?? 'V1',
    ean_barcode: input.eanBarcode ?? null,
    unit_price: input.unitPrice ?? null,
    origin_country: input.originCountry ?? null,
    brand_id: input.brandId,
    category: input.category ?? null,
    lifecycle_status: input.lifecycleStatus ?? 'active',
    change_reason: input.changeReason ?? null,
    change_detail: input.changeDetail ?? null,
    metadata: input.metadata ?? {},
    org_unit_id: ctx.orgUnitId,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  };

  const { data, error } = await db
    .schema('products').from('products')
    .upsert(payload, { onConflict: 'sku,version' })
    .select('*')
    .single();

  if (error) throw error;
  return rowToProduct(data as ProductRow);
}

/** Narrow helper: dedupe rows to the highest version per sku. */
function dedupeToLatestVersion(rows: ProductRow[]): ProductRow[] {
  const seen = new Map<string, ProductRow>();
  for (const r of rows) {
    const prev = seen.get(r.sku);
    if (!prev || compareVersion(r.version, prev.version) > 0) {
      seen.set(r.sku, r);
    }
  }
  return Array.from(seen.values());
}

/** "V2" > "V1" > "V0". Non-V formats fall back to string compare. */
function compareVersion(a: string, b: string): number {
  const re = /^V(\d+)$/i;
  const ma = re.exec(a);
  const mb = re.exec(b);
  if (ma && mb) return Number(ma[1]) - Number(mb[1]);
  return a.localeCompare(b);
}
