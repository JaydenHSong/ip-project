// SC (Seller Central) 제출 데이터 빌드 유틸리티
// Report + Listing 정보로 SC RAV 폼 데이터 생성

import { VIOLATION_TYPES } from '@/constants/violations'
import type { ViolationCode } from '@/constants/violations'
import type { PdSubmitData } from '@/types/reports'

// Violation code → SC RAV category mapping
const SC_VIOLATION_MAP: Record<string, string> = {
  V01: 'Trademark',
  V02: 'Copyright',
  V03: 'Patent',
  V04: 'Counterfeit',
  V05: 'Product Authenticity',
  V06: 'Listing Policy Violation',
  V07: 'Listing Policy Violation',
  V08: 'Listing Policy Violation',
  V09: 'Listing Policy Violation',
  V10: 'Listing Policy Violation',
  V11: 'Review Manipulation',
  V12: 'Review Manipulation',
  V13: 'Listing Policy Violation',
  V14: 'Listing Policy Violation',
  V15: 'Listing Policy Violation',
  V16: 'Product Safety',
  V17: 'Product Safety',
  V18: 'Product Safety',
  V19: 'Regulatory Compliance',
}

// Marketplace → SC RAV base URL
const SC_RAV_URLS: Record<string, string> = {
  US: 'https://sellercentral.amazon.com/reportabuse',
  JP: 'https://sellercentral.amazon.co.jp/reportabuse',
  UK: 'https://sellercentral.amazon.co.uk/reportabuse',
  DE: 'https://sellercentral.amazon.de/reportabuse',
  CA: 'https://sellercentral.amazon.ca/reportabuse',
}

type BuildScDataInput = {
  report: {
    id: string
    user_violation_type: string
    draft_body: string | null
    draft_evidence?: { type: string; url: string; description: string }[]
  }
  listing: {
    asin: string
    marketplace: string
    title?: string | null
  }
}

export const buildPdSubmitData = ({ report, listing }: BuildScDataInput): PdSubmitData => {
  const violationCode = report.user_violation_type as ViolationCode
  const violationType = VIOLATION_TYPES[violationCode]
  const scViolationType = SC_VIOLATION_MAP[violationCode] ?? 'Other'
  const marketplace = listing.marketplace?.toUpperCase() ?? 'US'
  const baseUrl = SC_RAV_URLS[marketplace] ?? SC_RAV_URLS.US

  const evidenceUrls = (report.draft_evidence ?? [])
    .filter((e) => e.url)
    .map((e) => e.url)

  const description = report.draft_body ?? `Violation Type: ${violationType?.name ?? violationCode}`

  return {
    asin: listing.asin,
    violation_type_pd: scViolationType,
    description,
    evidence_urls: evidenceUrls,
    marketplace,
    pd_rav_url: `${baseUrl}?asin=${listing.asin}`,
    prepared_at: new Date().toISOString(),
  }
}
