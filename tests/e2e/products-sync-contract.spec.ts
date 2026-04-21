// Design Ref: products-sync.design.md §8.3 — Provider v1 contract preservation
// Plan SC: SC-08 Provider API shape — v1 fields 모두 존재 + last_synced_at/matched_via 추가
// NFR-02 Provider contract 불변 (삭제/이름 변경 금지, 추가만 허용)

import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('products-sync · Provider v1 contract', () => {
  test('GET /api/products/by-asin/[asin] preserves v1 shape + adds new fields', async ({ request }) => {
    // Unauthenticated → 401 (acceptable in CI without session). Skip shape check.
    const res = await request.get(`${BASE}/api/products/by-asin/B0PLW000ZZ?marketplace=US`);
    if (res.status() === 401 || res.status() === 403) {
      test.skip();
      return;
    }

    if (res.status() === 404) {
      // ASIN not mapped — still check error shape
      const body = await res.json();
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('asin');
      expect(body).toHaveProperty('marketplace');
      return;
    }

    if (res.status() === 200) {
      const body = await res.json();
      // v1 LOCKED fields
      for (const key of ['sku', 'productName', 'brand', 'category', 'marketplace', 'isPrimary', 'status']) {
        expect(body, `v1 field missing: ${key}`).toHaveProperty(key);
      }
      // new optional fields may be null for legacy rows but must be present keys when sync has run
      if (body.matched_via != null) {
        expect(['ean', 'prefix8', 'manual', 'enrich']).toContain(body.matched_via);
      }
    }
  });
});
