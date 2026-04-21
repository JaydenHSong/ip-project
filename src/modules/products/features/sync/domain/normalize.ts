// Design Ref: products-sync.design.md §5.3 — Normalizer (Layer 4 Domain, pure)
// Plan SC: SC-01 (prefix-8 variant matching), R2 (suffix delimiter variants)
//
// Pure helpers used by matcher AND adapters. No I/O.

/**
 * Extract first 8 chars of SKU after stripping suffix delimiters.
 * Handles Spigen suffix patterns:
 *   - 'ACS06234C'   → 'ACS06234'  (no delimiter)
 *   - 'ACS06234-C'  → 'ACS06234'  (hyphen)
 *   - 'ACS06234_CA' → 'ACS06234'  (underscore)
 *   - 'ACS06234 C'  → 'ACS06234'  (whitespace)
 *   - '000AD20806P' → '000AD208'  (legacy 000-prefix, first 8 regardless)
 */
export function normalizePrefix8(sku: string): string {
  const trimmed = sku.trim().replace(/[-_\s]+.*$/, '');
  return trimmed.substring(0, 8);
}

/**
 * Validate 13-digit EAN. Returns the string if valid, else null.
 * Does NOT verify checksum — source DB is trusted.
 */
export function validateEan13(s: string | null): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (!/^\d{13}$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * ERP material_status values that indicate an inactive / deleted SKU.
 * These are excluded from matcher index to prevent matching archived products.
 */
const INACTIVE_STATUS_VALUES = new Set(['Z3', 'Z5', 'Z6']);

export function isActiveStatus(status: string | null): boolean {
  if (status === null) return true; // null = no status set = treat as active (conservative)
  return !INACTIVE_STATUS_VALUES.has(status);
}
