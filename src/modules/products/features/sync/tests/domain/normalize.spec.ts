// Design Ref: products-sync.design.md §5.3 — normalize.ts
// Plan SC: R2 (suffix delimiter variants ACS06234C / -C / _C)

import test from 'node:test';
import { strict as assert } from 'node:assert';
import { normalizePrefix8, validateEan13, isActiveStatus } from '../../domain/normalize';

test('normalizePrefix8: 8+1 no delimiter → first 8', () => {
  assert.equal(normalizePrefix8('ACS06234C'), 'ACS06234');
});

test('normalizePrefix8: 8+2 no delimiter → first 8', () => {
  assert.equal(normalizePrefix8('ACS06234CA'), 'ACS06234');
});

test('normalizePrefix8: hyphen delimiter stripped', () => {
  assert.equal(normalizePrefix8('ACS06234-C'), 'ACS06234');
});

test('normalizePrefix8: underscore delimiter stripped', () => {
  assert.equal(normalizePrefix8('ACS06234_CA'), 'ACS06234');
});

test('normalizePrefix8: whitespace delimiter stripped', () => {
  assert.equal(normalizePrefix8('ACS06234 C'), 'ACS06234');
});

test('normalizePrefix8: legacy 000-prefix 10-char SKU → first 8', () => {
  assert.equal(normalizePrefix8('000AD20806'), '000AD208');
});

test('normalizePrefix8: legacy 000-prefix 11-char + suffix', () => {
  assert.equal(normalizePrefix8('000AD20806P'), '000AD208');
});

test('normalizePrefix8: short SKU returned as-is', () => {
  assert.equal(normalizePrefix8('ABC123'), 'ABC123');
});

test('validateEan13: 13 digits → return', () => {
  assert.equal(validateEan13('8809466648796'), '8809466648796');
});

test('validateEan13: 12 digits → null', () => {
  assert.equal(validateEan13('880946664879'), null);
});

test('validateEan13: empty/null → null', () => {
  assert.equal(validateEan13(null), null);
  assert.equal(validateEan13(''), null);
});

test('validateEan13: non-numeric → null', () => {
  assert.equal(validateEan13('ABC946664879X'), null);
});

test('validateEan13: trims whitespace', () => {
  assert.equal(validateEan13(' 8809466648796 '), '8809466648796');
});

test('isActiveStatus: null → true', () => {
  assert.equal(isActiveStatus(null), true);
});

test('isActiveStatus: Z3/Z5/Z6 → false', () => {
  assert.equal(isActiveStatus('Z3'), false);
  assert.equal(isActiveStatus('Z5'), false);
  assert.equal(isActiveStatus('Z6'), false);
});

test('isActiveStatus: other values → true (permissive)', () => {
  assert.equal(isActiveStatus('Z1'), true);
  assert.equal(isActiveStatus(''), true);
  assert.equal(isActiveStatus('active'), true);
});
