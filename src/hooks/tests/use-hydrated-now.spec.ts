import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, '../useHydratedNow.ts'), 'utf8');

test('useHydratedNow does not subscribe to a changing external snapshot', () => {
  assert.equal(source.includes('useSyncExternalStore'), false);
});
