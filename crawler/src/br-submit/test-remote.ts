// BR Dry-Run 테스트 — Railway 서버에서 실행
// 사용법: npx tsx src/br-submit/test-remote.ts [form_type]
// 예: npx tsx src/br-submit/test-remote.ts other_policy
//
// 동작: BR 로그인 → 메뉴 선택 → 폼 필드 채우기 → Send 안 누름
// 결과: 콘솔에 성공/실패 + 세부 로그 출력
// Sentinel API 콜백: POST /api/crawler/br-result (dry-run 결과)

import { config } from 'dotenv'
config({ path: '../.env.local' })
// Railway에서는 env가 이미 설정되어 있으므로 dotenv는 로컬 전용

import { processBrSubmitJob } from './worker.js'
import type { BrSubmitJobData, BrFormType } from './types.js'
import type { Job } from 'bullmq'

const FORM_TYPE = (process.argv[2] || 'other_policy') as BrFormType
const VALID_TYPES: BrFormType[] = ['other_policy', 'incorrect_variation', 'product_review', 'product_not_as_described']

if (!VALID_TYPES.includes(FORM_TYPE)) {
  console.error(`Invalid form type: ${FORM_TYPE}`)
  console.error(`Valid types: ${VALID_TYPES.join(', ')}`)
  process.exit(1)
}

const TEST_DATA: Record<BrFormType, BrSubmitJobData> = {
  other_policy: {
    reportId: 'dry-run-test',
    formType: 'other_policy',
    description: '[DRY-RUN TEST] This seller is listing a product that violates Amazon policy by using misleading product information.',
    productUrls: ['https://www.amazon.com/dp/B0DRYRUN01'],
    sellerStorefrontUrl: 'https://www.amazon.com/sp?seller=A1DRYRUNTEST',
    policyUrl: 'https://sellercentral.amazon.com/help/hub/reference/G200164330',
    dryRun: true,
  },
  incorrect_variation: {
    reportId: 'dry-run-test',
    formType: 'incorrect_variation',
    description: '[DRY-RUN TEST] This product is listed as a variation but is a completely different product.',
    productUrls: ['https://www.amazon.com/dp/B0DRYRUN02'],
    dryRun: true,
  },
  product_review: {
    reportId: 'dry-run-test',
    formType: 'product_review',
    description: '[DRY-RUN TEST] This product has fake reviews that violate the review policy.',
    productUrls: ['https://www.amazon.com/dp/B0DRYRUN03'],
    asins: ['B0DRYRUN03', 'B0DRYRUN04'],
    dryRun: true,
  },
  product_not_as_described: {
    reportId: 'dry-run-test',
    formType: 'product_not_as_described',
    description: '[DRY-RUN TEST] The product received differs from the listing description.',
    productUrls: ['https://www.amazon.com/dp/B0DRYRUN04'],
    sellerStorefrontUrl: 'https://www.amazon.com/sp?seller=A1DRYRUNTEST',
    orderId: '111-0000000-0000000',
    dryRun: true,
  },
}

const run = async (): Promise<void> => {
  console.log('╔══════════════════════════════════════╗')
  console.log(`║  BR Dry-Run Test: ${FORM_TYPE.padEnd(18)} ║`)
  console.log('╚══════════════════════════════════════╝')
  console.log('')

  const jobData = TEST_DATA[FORM_TYPE]
  const fakeJob = { data: jobData, id: 'dry-run-test' } as Job<BrSubmitJobData>

  const startMs = Date.now()
  const result = await processBrSubmitJob(fakeJob)
  const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(1)

  console.log('')
  console.log('════════════════════════════════════════')
  console.log(`Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`)
  console.log(`Form Type: ${FORM_TYPE}`)
  console.log(`Duration: ${elapsedSec}s`)
  if (result.error) console.log(`Error: ${result.error}`)
  console.log('════════════════════════════════════════')

  // Sentinel API에 결과 보고 (선택적)
  const sentinelUrl = process.env['SENTINEL_API_URL']
  const serviceToken = process.env['CRAWLER_SERVICE_TOKEN']
  if (sentinelUrl && serviceToken) {
    try {
      await fetch(`${sentinelUrl}/api/crawler/br-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceToken}`,
        },
        body: JSON.stringify({ ...result, dryRun: true }),
      })
      console.log('📡 Result reported to Sentinel API')
    } catch {
      console.log('⚠️ Could not report to Sentinel API (non-critical)')
    }
  }

  process.exit(result.success ? 0 : 1)
}

run().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
