// 2차 분석: 상세 페이지 데이터 + 스크린샷 → Haiku 위반 판정
// 크롤러 내부에서 실행, confidence >= 30이면 서버 전송 대상

import type { ListingDetail, CrawlerAiResult } from '../types/index.js'
import type { VisionAnalyzer } from './vision-analyzer.js'
import { log } from '../logger.js'

const CONFIDENCE_THRESHOLD = 30

const buildListingDataString = (detail: ListingDetail): string => {
  const parts = [
    `ASIN: ${detail.asin}`,
    `Title: ${detail.title}`,
    `Brand: ${detail.brand ?? 'unknown'}`,
    `Seller: ${detail.sellerName ?? 'unknown'}`,
    `Price: ${detail.priceCurrency} ${detail.priceAmount ?? 'N/A'}`,
    `Rating: ${detail.rating ?? 'N/A'} (${detail.reviewCount ?? 0} reviews)`,
  ]

  if (detail.bulletPoints.length > 0) {
    parts.push(`Bullet Points:\n${detail.bulletPoints.map(b => `- ${b}`).join('\n')}`)
  }

  if (detail.description) {
    parts.push(`Description: ${detail.description.slice(0, 500)}`)
  }

  parts.push(`Images: ${detail.images.length} images`)

  return parts.join('\n')
}

const scanViolation = async (
  vision: VisionAnalyzer,
  detail: ListingDetail,
  screenshotBase64: string,
): Promise<CrawlerAiResult> => {
  try {
    const listingData = buildListingDataString(detail)
    const result = await vision.scanViolation(screenshotBase64, listingData)

    log('info', 'violation-scanner', `ASIN ${detail.asin}: violation=${result.is_violation}, confidence=${result.confidence}, types=${result.violation_types.join(',')}`)

    // confidence가 threshold 미만이면 비위반 처리
    if (result.confidence < CONFIDENCE_THRESHOLD) {
      return {
        is_violation: false,
        violation_types: [],
        confidence: result.confidence,
        reasons: [`Below threshold (${result.confidence} < ${CONFIDENCE_THRESHOLD})`],
        evidence_summary: '',
      }
    }

    return result
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    log('error', 'violation-scanner', `Failed to scan ${detail.asin}: ${msg}`)

    return {
      is_violation: false,
      violation_types: [],
      confidence: 0,
      reasons: [`Scan failed: ${msg}`],
      evidence_summary: '',
    }
  }
}

export { scanViolation, buildListingDataString, CONFIDENCE_THRESHOLD }
