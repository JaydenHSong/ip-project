// Design Ref: products-sync.design.md §5.2 — Matching Algorithm (Layer 4 Domain, PURE)
// Plan SC: SC-01 (≥80% 자동 매칭, 샘플링 실측 97-100%), D3 (prefix 충돌 → EAN retry → queue)
// Checkpoint 2 Decision D3: prefix-8 ambiguous → EAN retry → unmapped_queue
//
// PURE FUNCTIONS. NO I/O. NO Supabase. Test with deterministic ErpRow + ChannelRow inputs.

import type { ChannelRow, ErpIndex, ErpRow, MatchResult } from './types';
import { isActiveStatus, normalizePrefix8, validateEan13 } from './normalize';

/**
 * Build ERP lookup index once per pipeline run.
 * In-memory map ~20k rows × ~500 bytes ≈ 10MB (within Vercel 128MB).
 *
 * - byEan: EAN (13-digit) → single SKU (ERP EAN uniqueness assumed)
 * - byPrefix8: first 8 chars → all SKUs sharing that prefix (variants)
 *
 * Inactive SKUs (material_status ∈ {Z3, Z5, Z6}) are skipped.
 */
export function buildErpIndex(rows: ErpRow[]): ErpIndex {
  const byEan = new Map<string, string>();
  const byPrefix8 = new Map<string, string[]>();

  for (const r of rows) {
    if (!isActiveStatus(r.materialStatus)) continue;
    if (!r.material) continue;

    const ean = validateEan13(r.eanBarcode);
    if (ean && !byEan.has(ean)) {
      byEan.set(ean, r.material);
    }

    const pfx = normalizePrefix8(r.material);
    if (pfx.length === 8) {
      const existing = byPrefix8.get(pfx);
      if (existing) {
        if (!existing.includes(r.material)) existing.push(r.material);
      } else {
        byPrefix8.set(pfx, [r.material]);
      }
    }
  }

  return { byEan, byPrefix8 };
}

/**
 * Core matching function. Applies priority:
 *   1. EAN exact match (primary, works across legacy + current SKU schemes)
 *   2. prefix-8 exact match (single candidate → auto-match)
 *   3. prefix-8 multi-candidate → EAN retry (D3 policy)
 *   4. Still ambiguous → unmapped_queue with reason='prefix_ambiguous'
 *   5. No EAN + no prefix → reason='no_ean_no_prefix'
 *   6. seller_sku NULL or non-Spigen pattern → reason='invalid_sku_format'
 */
export function matchChannelRow(row: ChannelRow, idx: ErpIndex): MatchResult {
  // Priority 1: EAN exact match (always try first)
  const ean = validateEan13(row.ean);
  if (ean) {
    const sku = idx.byEan.get(ean);
    if (sku) return { kind: 'matched', sku, via: 'ean' };
  }

  // seller_sku required for prefix-8 path
  if (!row.sellerSku || row.sellerSku.trim().length === 0) {
    return { kind: 'unmapped', reason: 'invalid_sku_format' };
  }

  const pfx = normalizePrefix8(row.sellerSku);
  if (pfx.length < 8) {
    return { kind: 'unmapped', reason: 'invalid_sku_format' };
  }

  const candidates = idx.byPrefix8.get(pfx) ?? [];

  // Priority 2: single prefix-8 candidate
  if (candidates.length === 1) {
    return { kind: 'matched', sku: candidates[0], via: 'prefix8' };
  }

  // Priority 3: ambiguous prefix → EAN retry within candidates
  if (candidates.length > 1) {
    if (ean) {
      const eanSku = idx.byEan.get(ean);
      if (eanSku && candidates.includes(eanSku)) {
        return { kind: 'matched', sku: eanSku, via: 'ean' };
      }
    }
    return { kind: 'unmapped', reason: 'prefix_ambiguous', candidates };
  }

  // Priority 4: nothing matched
  return { kind: 'unmapped', reason: 'no_ean_no_prefix' };
}

/**
 * Summary statistics for a batch (used by orchestrator to populate sync_runs).
 */
export type MatchBatchStats = {
  matched: number;
  matchedViaEan: number;
  matchedViaPrefix: number;
  unmapped: number;
  unmappedByReason: Record<string, number>;
};

export function summarizeBatch(results: MatchResult[]): MatchBatchStats {
  const stats: MatchBatchStats = {
    matched: 0,
    matchedViaEan: 0,
    matchedViaPrefix: 0,
    unmapped: 0,
    unmappedByReason: {},
  };
  for (const r of results) {
    if (r.kind === 'matched') {
      stats.matched += 1;
      if (r.via === 'ean') stats.matchedViaEan += 1;
      else stats.matchedViaPrefix += 1;
    } else {
      stats.unmapped += 1;
      stats.unmappedByReason[r.reason] = (stats.unmappedByReason[r.reason] ?? 0) + 1;
    }
  }
  return stats;
}
