// Design Ref: §11.2 bulk upsert orchestration
// Plan SC: SC-01 (CSV <60s), SC-07 (Provider v1)
//
// Orchestrator: resolve each CsvImportRow's product_id (by upserting products.products first),
// then bulk upsert asin_mapping. Keeps API route handlers small and testable.

import { getProductBySku, upsertProduct } from '@/modules/products/features/catalog/queries';
import { bulkUpsert } from './queries';
import type {
  CsvImportRow,
  BulkUpsertResponse,
  ConflictStrategy,
} from '@/modules/products/shared/types';

export type BulkUpsertOrchestratorInput = {
  rows: CsvImportRow[];
  onConflict: ConflictStrategy;
  userId: string;
  orgUnitId: string;
};

/**
 * 1) For each row, ensure a products.products row exists (upsert by sku, version).
 *    Requires brand_id (Q5 policy — reject rows without brand_id).
 * 2) Collect product_id per row.
 * 3) Call bulkUpsert with product_id-enriched rows.
 *
 * Rows missing brand_id OR unable to resolve product_id are failed upfront with
 * clear messages; failed rows still appear in the response's errors array.
 */
export async function orchestrateBulkUpsert(
  input: BulkUpsertOrchestratorInput
): Promise<BulkUpsertResponse> {
  const resolved: Array<CsvImportRow & { product_id: string }> = [];
  const errors: Array<{ row: number; message: string }> = [];
  let failed = 0;

  for (let i = 0; i < input.rows.length; i++) {
    const row = input.rows[i];
    const rowNumber = i + 1;

    try {
      let product = await getProductBySku(row.sku, row.version);

      if (!product) {
        if (!row.brand_id) {
          failed += 1;
          errors.push({
            row: rowNumber,
            message: `brand_id 누락 — 신규 SKU "${row.sku}" 생성 불가 (Q5 policy)`,
          });
          continue;
        }
        product = await upsertProduct(
          {
            sku: row.sku,
            productName: row.product_name ?? row.sku,
            productNameKo: row.product_name_ko ?? null,
            modelNameKo: row.model_name_ko ?? null,
            deviceModel: row.device_model ?? null,
            color: row.color ?? null,
            version: row.version ?? 'V1',
            eanBarcode: row.ean_barcode ?? null,
            unitPrice: row.unit_price ?? null,
            originCountry: row.origin_country ?? null,
            brandId: row.brand_id,
            parentSku: row.parent_sku ?? null,
          },
          { userId: input.userId, orgUnitId: input.orgUnitId }
        );
      }

      resolved.push({ ...row, product_id: product.id });
    } catch (err) {
      failed += 1;
      errors.push({
        row: rowNumber,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (resolved.length === 0) {
    return { summary: { inserted: 0, updated: 0, failed }, errors };
  }

  const result = await bulkUpsert({
    rows: resolved,
    onConflict: input.onConflict,
    userId: input.userId,
    orgUnitId: input.orgUnitId,
  });

  return {
    summary: {
      inserted: result.summary.inserted,
      updated: result.summary.updated,
      failed: result.summary.failed + failed,
    },
    errors: [...errors, ...result.errors],
  };
}
