// Design Ref: products-sync.design.md §8.1 — Layer 4 Domain unit tests
// Plan SC: SC-01 (matching algorithm correctness), D3 (prefix-ambiguous → EAN retry)
//
// Run: pnpm test:sync  (uses tsx + node:test, 0 new deps)

import test from 'node:test';
import { strict as assert } from 'node:assert';
import { buildErpIndex, matchChannelRow, summarizeBatch } from '../../domain/matcher';
import type { ChannelRow, ErpRow, MatchResult } from '../../domain/types';

const makeErp = (partial: Partial<ErpRow> & { material: string }): ErpRow => ({
  materialDescriptionEn: null,
  materialDescriptionKo: null,
  brand: null,
  brandDescription: null,
  color: null,
  colorDescription: null,
  model: null,
  modelDescriptionEn: null,
  eanBarcode: null,
  upcBarcode: null,
  materialStatus: null,
  sourceUpdatedAt: '2026-04-21T00:00:00Z',
  ...partial,
});

const makeChannel = (partial: Partial<ChannelRow> & { externalId: string }): ChannelRow => ({
  channel: 'amazon',
  marketplace: 'US',
  sourceTable: 'sq_datahub.spg_amazon_all_listings',
  sourceRowId: 1,
  sellerSku: null,
  ean: null,
  productName: null,
  brand: null,
  status: 'Active',
  updatedAt: '2026-04-21T00:00:00Z',
  ...partial,
});

test('T1: EAN exact match → matched.via="ean"', () => {
  const idx = buildErpIndex([
    makeErp({ material: 'ACS06234', eanBarcode: '8809466648796' }),
    makeErp({ material: 'ACS06500', eanBarcode: '8809466650000' }),
  ]);
  const result = matchChannelRow(
    makeChannel({ externalId: 'B0ABC', sellerSku: 'ACS06234C', ean: '8809466648796' }),
    idx,
  );
  assert.equal(result.kind, 'matched');
  if (result.kind === 'matched') {
    assert.equal(result.sku, 'ACS06234');
    assert.equal(result.via, 'ean');
  }
});

test('T2: prefix-8 single candidate → matched.via="prefix8"', () => {
  const idx = buildErpIndex([
    makeErp({ material: 'ACS06234', eanBarcode: null }),
  ]);
  const result = matchChannelRow(
    makeChannel({ externalId: 'B0ABC', sellerSku: 'ACS06234CA', ean: null }),
    idx,
  );
  assert.equal(result.kind, 'matched');
  if (result.kind === 'matched') {
    assert.equal(result.sku, 'ACS06234');
    assert.equal(result.via, 'prefix8');
  }
});

test('T3: prefix-8 multi-candidate + EAN disambiguates → matched.via="ean"', () => {
  const idx = buildErpIndex([
    makeErp({ material: 'ACS06234', eanBarcode: '8809466648796' }),
    makeErp({ material: 'ACS06234B', eanBarcode: '8809466648797' }),
    makeErp({ material: 'ACS06234R', eanBarcode: '8809466648798' }),
  ]);
  const result = matchChannelRow(
    makeChannel({ externalId: 'B0ABC', sellerSku: 'ACS06234CA', ean: '8809466648797' }),
    idx,
  );
  assert.equal(result.kind, 'matched');
  if (result.kind === 'matched') {
    assert.equal(result.sku, 'ACS06234B');
    assert.equal(result.via, 'ean');
  }
});

test('T4: prefix-8 multi-candidate + no EAN → unmapped.reason="prefix_ambiguous"', () => {
  const idx = buildErpIndex([
    makeErp({ material: 'ACS06234' }),
    makeErp({ material: 'ACS06234B' }),
  ]);
  const result = matchChannelRow(
    makeChannel({ externalId: 'B0ABC', sellerSku: 'ACS06234C', ean: null }),
    idx,
  );
  assert.equal(result.kind, 'unmapped');
  if (result.kind === 'unmapped') {
    assert.equal(result.reason, 'prefix_ambiguous');
    assert.ok(result.candidates && result.candidates.length === 2);
  }
});

test('T5: no match at all → unmapped.reason="no_ean_no_prefix"', () => {
  const idx = buildErpIndex([
    makeErp({ material: 'ACS06234', eanBarcode: '8809000000001' }),
  ]);
  const result = matchChannelRow(
    makeChannel({ externalId: 'B0XYZ', sellerSku: 'ZZZ99999X', ean: null }),
    idx,
  );
  assert.equal(result.kind, 'unmapped');
  if (result.kind === 'unmapped') assert.equal(result.reason, 'no_ean_no_prefix');
});

test('T6: seller_sku null → unmapped.reason="invalid_sku_format"', () => {
  const idx = buildErpIndex([makeErp({ material: 'ACS06234' })]);
  const result = matchChannelRow(
    makeChannel({ externalId: 'B0ABC', sellerSku: null, ean: null }),
    idx,
  );
  assert.equal(result.kind, 'unmapped');
  if (result.kind === 'unmapped') assert.equal(result.reason, 'invalid_sku_format');
});

test('T7: inactive SKU (Z3/Z5/Z6) excluded from index', () => {
  const idx = buildErpIndex([
    makeErp({ material: 'ACS06234', materialStatus: 'Z3' }),  // deleted
    makeErp({ material: 'ACS06500' }),                          // active
  ]);
  // prefix ACS06234 should NOT match (inactive)
  const r1 = matchChannelRow(
    makeChannel({ externalId: 'B0A', sellerSku: 'ACS06234C', ean: null }),
    idx,
  );
  assert.equal(r1.kind, 'unmapped');
  // prefix ACS06500 SHOULD match
  const r2 = matchChannelRow(
    makeChannel({ externalId: 'B0B', sellerSku: 'ACS06500Y', ean: null }),
    idx,
  );
  assert.equal(r2.kind, 'matched');
});

test('T8: legacy 000-prefix SKU matched via EAN', () => {
  const idx = buildErpIndex([
    makeErp({ material: '000AD20806', eanBarcode: '8809466648786' }),
  ]);
  const result = matchChannelRow(
    makeChannel({ externalId: 'B0LEG', sellerSku: '000AD20806P', ean: '8809466648786' }),
    idx,
  );
  assert.equal(result.kind, 'matched');
  if (result.kind === 'matched') {
    assert.equal(result.sku, '000AD20806');
    assert.equal(result.via, 'ean');
  }
});

test('T9: summarizeBatch counts matched vs unmapped by reason', () => {
  const results: MatchResult[] = [
    { kind: 'matched', sku: 'ACS01', via: 'ean' },
    { kind: 'matched', sku: 'ACS02', via: 'prefix8' },
    { kind: 'matched', sku: 'ACS03', via: 'ean' },
    { kind: 'unmapped', reason: 'no_ean_no_prefix' },
    { kind: 'unmapped', reason: 'prefix_ambiguous', candidates: ['A', 'B'] },
    { kind: 'unmapped', reason: 'invalid_sku_format' },
  ];
  const stats = summarizeBatch(results);
  assert.equal(stats.matched, 3);
  assert.equal(stats.matchedViaEan, 2);
  assert.equal(stats.matchedViaPrefix, 1);
  assert.equal(stats.unmapped, 3);
  assert.equal(stats.unmappedByReason['no_ean_no_prefix'], 1);
  assert.equal(stats.unmappedByReason['prefix_ambiguous'], 1);
  assert.equal(stats.unmappedByReason['invalid_sku_format'], 1);
});
