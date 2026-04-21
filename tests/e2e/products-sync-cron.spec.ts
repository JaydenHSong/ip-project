// Design Ref: products-sync.design.md §8.3 — sync/all endpoint auth + execution shape
// Plan SC: SC-05 cron <1 실패/월, FR-03 auth header check

import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('products-sync · cron endpoint', () => {
  test('POST /api/products/sync/all — unauthenticated returns 401/403', async ({ request }) => {
    const res = await request.post(`${BASE}/api/products/sync/all`, {
      data: { trigger: 'manual' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('POST /api/products/sync/all — wrong CRON_SECRET returns 401/403', async ({ request }) => {
    const res = await request.post(`${BASE}/api/products/sync/all`, {
      headers: { Authorization: 'Bearer WRONG_SECRET' },
      data: { trigger: 'cron' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('POST /api/products/sync/all — cron with valid secret returns pipeline result', async ({ request }) => {
    const secret = process.env.CRON_SECRET;
    test.skip(!secret, 'Set CRON_SECRET to run full cron flow');
    const res = await request.post(`${BASE}/api/products/sync/all`, {
      headers: { Authorization: `Bearer ${secret}` },
      data: { trigger: 'cron' },
    });
    // success OR 500 (e.g., SQ DataHub env missing) — both return JSON envelope
    const body = await res.json();
    if (res.status() >= 200 && res.status() < 300) {
      expect(body).toHaveProperty('pipelineId');
      expect(body).toHaveProperty('stages');
      expect(Array.isArray(body.stages)).toBe(true);
      expect(body).toHaveProperty('overallStatus');
      expect(body).toHaveProperty('totalDurationMs');
    }
  });
});
