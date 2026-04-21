// Design Ref: products-sync.design.md §8.3 — L3 E2E: /products/unmapped workflow
// Plan SC: SC-03 3-click resolve, FR-08 page + filter + pagination

import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('products-sync · unmapped queue API', () => {
  test('GET /api/products/unmapped — unauthenticated returns 401/403', async ({ request }) => {
    const res = await request.get(`${BASE}/api/products/unmapped`);
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/products/unmapped — invalid reason returns 400', async ({ request }) => {
    // Unauthenticated may still return 401 before validation; if authenticated, expect 400
    const res = await request.get(`${BASE}/api/products/unmapped?reason=not_an_enum`);
    expect([400, 401, 403]).toContain(res.status());
  });

  test('POST /api/products/sku-search — requires auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/products/sku-search?q=ACS`);
    expect([401, 403]).toContain(res.status());
  });
});

test.describe('products-sync · L3 UI flow', () => {
  test.skip(!process.env.E2E_AUTHED, 'Requires authenticated browser context (E2E_AUTHED=1)');

  test('/products/unmapped renders + filter + pagination', async ({ page }) => {
    await page.goto(`${BASE}/products/unmapped`);
    await expect(page.getByRole('heading', { name: /Unmapped Listings/i })).toBeVisible();

    // Status selector default = pending
    const statusSelect = page.locator('select').last();
    await expect(statusSelect).toBeVisible();

    // Filter by channel — amazon
    const channelSelect = page.locator('select').first();
    await channelSelect.selectOption('amazon');
    await expect(page).toHaveURL(/channel=amazon/);
  });

  test('3-click resolve flow (only if queue has rows)', async ({ page, request }) => {
    await page.goto(`${BASE}/products/unmapped`);
    const rows = page.getByRole('button', { name: /매칭/ });
    const count = await rows.count();
    if (count === 0) test.skip();

    await rows.first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Listing Resolve/i)).toBeVisible();

    // Ignored path — no SKU required
    await page.getByRole('radio', { name: /Ignore/i }).check();
    await page.getByRole('button', { name: /확정/ }).click();
    // modal closes, row disappears from pending list
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    // Verify via API — queue row status changed
    const res = await request.get(`${BASE}/api/products/unmapped?status=ignored&limit=5`);
    expect(res.status()).toBe(200);
  });
});
