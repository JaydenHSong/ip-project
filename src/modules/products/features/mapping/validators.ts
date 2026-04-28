// Design Ref: §3.3 Request Validation Pipeline + §6.2 Zod validation
// Plan SC: SC-04 (typecheck/lint), supports SC-07 (Contract v1 via schema)
//
// Zod-based request body & CSV row validators. These are the SINGLE SOURCE of
// truth for input shape — server API routes and CSV dry-run parser both use them.

import { z } from 'zod';
import {
  ASIN_REGEX,
  CSV_MAX_ROWS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/modules/products/shared/constants';

// =============================================================================
// Primitives
// =============================================================================

export const marketplaceSchema = z.enum([
  'US', 'CA', 'MX', 'UK', 'DE', 'FR', 'IT', 'ES', 'JP', 'AU', 'SG',
]);

export const lifecycleStatusSchema = z.enum([
  'active', 'new', 'eol', 'discontinued',
]);

export const mappingStatusSchema = z.enum([
  'active', 'paused', 'archived',
]);

// ASIN: 10 chars, starts with 'B', uppercase alphanumeric
export const asinSchema = z
  .string()
  .trim()
  .regex(ASIN_REGEX, 'ASIN은 B로 시작하는 10자리 영숫자여야 합니다 (예: B0EXAMPLE1)');

// SKU: non-empty, trimmed, max 64
export const skuSchema = z
  .string()
  .trim()
  .min(1, 'SKU는 필수입니다')
  .max(64, 'SKU는 64자 이하여야 합니다');

// EAN-13: optional, 8 or 13 digits
export const eanSchema = z
  .string()
  .trim()
  .regex(/^(\d{8}|\d{13})$/, 'EAN은 8자리 또는 13자리 숫자여야 합니다')
  .optional();

// ISO-3166-1 alpha-2 country code (2 uppercase letters)
export const originCountrySchema = z
  .string()
  .trim()
  .length(2, '원산지는 2자리 국가코드 (예: KR)')
  .toUpperCase()
  .optional();

// Version: "V0", "V1", "V2", ...
export const versionSchema = z
  .string()
  .trim()
  .regex(/^V\d+$/i, 'Version 형식은 V0/V1/V2... (예: V1)')
  .optional();

// UUID
export const uuidSchema = z.string().uuid('올바른 UUID 형식이 아닙니다');

// =============================================================================
// CSV Import Row
// =============================================================================

export const csvImportRowSchema = z.object({
  sku: skuSchema,
  asin: asinSchema,
  marketplace: marketplaceSchema,
  is_primary: z.coerce.boolean().optional().default(false),

  // Catalog enrichment fields (all optional — will be filled from products table or Amazon)
  product_name: z.string().trim().min(1).max(255).optional(),
  product_name_ko: z.string().trim().max(255).optional(),
  model_name_ko: z.string().trim().max(128).optional(),
  device_model: z.string().trim().max(128).optional(),
  color: z.string().trim().max(64).optional(),
  version: versionSchema,
  ean_barcode: eanSchema,
  unit_price: z.coerce.number().positive().optional(),
  origin_country: originCountrySchema,
  brand_id: uuidSchema.optional(),
  parent_sku: z.string().trim().max(64).optional(),
});

// =============================================================================
// API Request Bodies
// =============================================================================

// POST /api/products/mapping/dry-run
export const dryRunBodySchema = z.object({
  csvText: z
    .string()
    .min(1, 'csvText는 비어있을 수 없습니다')
    .max(5_000_000, 'csvText는 5MB 이하여야 합니다'), // ~50,000 rows
});

// POST /api/products/mapping  (bulk upsert after dry-run)
export const bulkUpsertBodySchema = z.object({
  rows: z
    .array(csvImportRowSchema)
    .min(1, '최소 1개 행이 필요합니다')
    .max(CSV_MAX_ROWS, `CSV는 ${CSV_MAX_ROWS}행 이하여야 합니다`),
  onConflict: z.enum(['skip', 'overwrite']).default('skip'),
});

// PATCH /api/products/mapping/[id]  (single row edit — admin)
export const patchMappingBodySchema = z
  .object({
    isPrimary: z.boolean().optional(),
    status: mappingStatusSchema.optional(),
    brandMarketId: uuidSchema.nullable().optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: '최소 1개 필드는 변경되어야 합니다' }
  );

// DELETE /api/products/mapping/[id]  (soft delete = status='archived')
// No body required

// POST /api/products/by-asin/[asin]/enrich
export const enrichQuerySchema = z.object({
  marketplace: marketplaceSchema,
});

// =============================================================================
// List / Query Params
// =============================================================================

// GET /api/products/mapping?marketplace=&search=&page=&limit=
export const listMappingQuerySchema = z.object({
  marketplace: marketplaceSchema.optional(),
  search: z.string().trim().max(128).optional(),
  primaryOnly: z.coerce.boolean().optional().default(false),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
});

// GET /api/products/by-asin/[asin]?marketplace=US  (Provider v1)
export const byAsinQuerySchema = z.object({
  marketplace: marketplaceSchema,
});

// GET /api/products/audit  (admin only)
export const auditQuerySchema = z.object({
  mappingId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE']).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

// =============================================================================
// Inferred types (for use in route handlers)
// =============================================================================

export type CsvImportRowInput = z.infer<typeof csvImportRowSchema>;
export type DryRunBody = z.infer<typeof dryRunBodySchema>;
export type BulkUpsertBody = z.infer<typeof bulkUpsertBodySchema>;
export type PatchMappingBody = z.infer<typeof patchMappingBodySchema>;
export type ListMappingQuery = z.infer<typeof listMappingQuerySchema>;
export type ByAsinQuery = z.infer<typeof byAsinQuerySchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
