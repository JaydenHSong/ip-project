// Design Ref: §4.2 snake_case DB <-> camelCase TS boundary
// Small pure mappers. Kept in shared/ so both catalog and mapping queries reuse.

import type {
  Product,
  AsinMapping,
  AsinMappingRow,
  AuditEntry,
  LifecycleStatus,
  MappingStatus,
  Marketplace,
  AuditAction,
  AuditSource,
} from './types';

// DB row shapes (snake_case) — narrow, intentionally local to this file.
type ProductRow = Readonly<{
  id: string;
  sku: string;
  parent_sku: string | null;
  product_name: string;
  product_name_ko: string | null;
  product_name_en_short: string | null;
  model_name: string | null;
  model_name_ko: string | null;
  device_model: string | null;
  color: string | null;
  version: string;
  ean_barcode: string | null;
  unit_price: string | number | null; // Supabase returns numeric as string
  origin_country: string | null;
  brand_id: string;
  category: string | null;
  lifecycle_status: LifecycleStatus;
  change_reason: string | null;
  change_detail: string | null;
  lead_time_days: number | null;
  inbox_qty: number | null;
  outbox_qty: number | null;
  item_grade: string | null;
  inventory_grade: string | null;
  mrp_manager: string | null;
  raw_dim_width: string | number | null;
  raw_dim_height: string | number | null;
  raw_dim_depth: string | number | null;
  package_dim: string | null;
  batch_created_at: string | null;
  department: string | null;
  org_unit_id: string;
  metadata: Record<string, unknown>;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}>;

type AsinMappingDbRow = Readonly<{
  id: string;
  product_id: string;
  asin: string;
  marketplace: Marketplace;
  is_primary: boolean;
  status: MappingStatus;
  brand_market_id: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}>;

type AuditDbRow = Readonly<{
  id: string;
  mapping_id: string | null;
  user_id: string;
  action: AuditAction;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  source: AuditSource;
  created_at: string;
}>;

function toNum(v: string | number | null): number | null {
  if (v === null || v === undefined) return null;
  return typeof v === 'number' ? v : Number(v);
}

export function rowToProduct(r: ProductRow): Product {
  return {
    id: r.id,
    sku: r.sku,
    parentSku: r.parent_sku,
    productName: r.product_name,
    productNameKo: r.product_name_ko,
    productNameEnShort: r.product_name_en_short,
    modelName: r.model_name,
    modelNameKo: r.model_name_ko,
    deviceModel: r.device_model,
    color: r.color,
    version: r.version,
    eanBarcode: r.ean_barcode,
    unitPrice: toNum(r.unit_price),
    originCountry: r.origin_country,
    brandId: r.brand_id,
    category: r.category,
    lifecycleStatus: r.lifecycle_status,
    changeReason: r.change_reason,
    changeDetail: r.change_detail,
    leadTimeDays: r.lead_time_days,
    inboxQty: r.inbox_qty,
    outboxQty: r.outbox_qty,
    itemGrade: r.item_grade,
    inventoryGrade: r.inventory_grade,
    mrpManager: r.mrp_manager,
    rawDimWidth: toNum(r.raw_dim_width),
    rawDimHeight: toNum(r.raw_dim_height),
    rawDimDepth: toNum(r.raw_dim_depth),
    packageDim: r.package_dim,
    batchCreatedAt: r.batch_created_at,
    department: r.department,
    orgUnitId: r.org_unit_id,
    metadata: r.metadata ?? {},
    createdBy: r.created_by,
    updatedBy: r.updated_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function rowToMapping(r: AsinMappingDbRow): AsinMapping {
  return {
    id: r.id,
    productId: r.product_id,
    asin: r.asin,
    marketplace: r.marketplace,
    isPrimary: r.is_primary,
    status: r.status,
    brandMarketId: r.brand_market_id,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Joined row: asin_mapping + selected product fields (from catalog). */
type JoinedMappingRow = AsinMappingDbRow & {
  products?: Partial<ProductRow> | null;
};

export function rowToMappingRow(r: JoinedMappingRow): AsinMappingRow {
  const p = r.products ?? {};
  return {
    ...rowToMapping(r),
    sku: p.sku ?? '',
    productName: p.product_name ?? '',
    productNameKo: p.product_name_ko ?? null,
    deviceModel: p.device_model ?? null,
    color: p.color ?? null,
    modelNameKo: p.model_name_ko ?? null,
    eanBarcode: p.ean_barcode ?? null,
    version: p.version ?? 'V1',
  };
}

export function rowToAudit(r: AuditDbRow): AuditEntry {
  return {
    id: r.id,
    mappingId: r.mapping_id,
    userId: r.user_id,
    action: r.action,
    before: r.before,
    after: r.after,
    source: r.source,
    createdAt: r.created_at,
  };
}

export type { ProductRow, AsinMappingDbRow, AuditDbRow, JoinedMappingRow };
