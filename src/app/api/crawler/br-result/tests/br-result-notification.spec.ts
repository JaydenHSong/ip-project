import { readFileSync } from 'node:fs'
import { strict as assert } from 'node:assert'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(here, '../route.ts'), 'utf8')

const successBranch = source.split('if (body.success) {')[1]?.split('\n  } else {')[0] ?? ''

test('BR result success without a case ID waits for recovery instead of notifying immediately', () => {
  assert.equal(successBranch.includes('notifyBrFailed'), false)
  assert.equal(successBranch.includes('Submitted successfully but case ID not extracted'), false)
  assert.equal(successBranch.includes('br_case_id_retry_count: 0'), true)
  assert.equal(successBranch.includes('br_case_status: null'), true)
})
