// V3 1차 스캔: 검색 결과 페이지에서 4가지 핵심 위반 탐지
// ① Variation Policy Violation — 베리에이션 5개 이상
// ② Trademark Infringement — Spigen 등록 상표 키워드
// ③ Counterfeit Product — 위조 시그널 키워드
// ④ Image Policy Violation — 썸네일 AI 비전 스캔 (Haiku, 항상 실행)

import type { SearchResult, PreScanResult } from '../types/index.js'
import type { VisionAnalyzer } from './vision-analyzer.js'
import { log } from '../logger.js'

// 위반 유형별 키워드 분류
const SUSPECT_KEYWORDS = {
  // Trademark Infringement — Spigen 등록 상표
  trademark: [
    'spigen', 'tough armor', 'rugged armor', 'ultra hybrid',
    'thin fit', 'liquid air', 'liquid crystal', 'neo hybrid',
    'crystal flex', 'ez fit', 'glas.tr', 'glastr', 'ciel', 'cyrill',
  ],
  // Trademark Infringement — 호환성 오인 유도
  trademark_compatibility: [
    'compatible with spigen', 'fits spigen', 'for spigen',
    'spigen compatible', 'works with spigen',
  ],
  // Counterfeit Product — 위조 시그널
  counterfeit: [
    'oem', 'original quality', 'same as', 'replica',
    'replacement for spigen', 'alternative to spigen',
  ],
} as const

const VARIATION_THRESHOLD = 5

// 키워드 + 베리에이션 기반 1차 스캔
const preScanResult = (result: SearchResult): PreScanResult => {
  // 자사(Spigen) 제품은 항상 non-suspect
  if (result.isSpigen) {
    return { isSuspect: false, suspectReasons: [], score: 0 }
  }

  const reasons: string[] = []
  let score = 0
  const titleLower = result.title.toLowerCase()

  // ① Variation Policy Violation — 베리에이션 5개 이상
  if (result.variationCount !== null && result.variationCount >= VARIATION_THRESHOLD) {
    reasons.push(`Variation Policy Violation: ${result.variationCount} variations (>= ${VARIATION_THRESHOLD})`)
    score += 30
  }

  // ② Trademark Infringement — 등록 상표 키워드
  const trademarkMatched: string[] = []
  for (const keyword of SUSPECT_KEYWORDS.trademark) {
    if (titleLower.includes(keyword.toLowerCase())) {
      trademarkMatched.push(keyword)
    }
  }
  if (trademarkMatched.length > 0) {
    reasons.push(`Trademark Infringement: ${trademarkMatched.join(', ')}`)
    score += 30 * trademarkMatched.length
  }

  // ② Trademark Infringement — 호환성 오인 유도
  const compatMatched: string[] = []
  for (const keyword of SUSPECT_KEYWORDS.trademark_compatibility) {
    if (titleLower.includes(keyword.toLowerCase())) {
      compatMatched.push(keyword)
    }
  }
  if (compatMatched.length > 0) {
    reasons.push(`Trademark Infringement (compatibility): ${compatMatched.join(', ')}`)
    score += 15 * compatMatched.length
  }

  // ③ Counterfeit Product — 위조 시그널
  const counterfeitMatched: string[] = []
  for (const keyword of SUSPECT_KEYWORDS.counterfeit) {
    if (titleLower.includes(keyword.toLowerCase())) {
      counterfeitMatched.push(keyword)
    }
  }
  if (counterfeitMatched.length > 0) {
    reasons.push(`Counterfeit Product: ${counterfeitMatched.join(', ')}`)
    score += 25 * counterfeitMatched.length
  }

  return {
    isSuspect: reasons.length > 0,
    suspectReasons: reasons,
    score: Math.min(score, 100),
  }
}

// 배치 1차 스캔 (검색 결과 전체)
const preScanSearchResults = (results: SearchResult[]): SearchResult[] => {
  let suspectCount = 0

  for (const result of results) {
    const scan = preScanResult(result)
    result.preScanResult = scan
    if (scan.isSuspect) suspectCount++
  }

  log('info', 'pre-scanner', `Pre-scan: ${results.length} total, ${suspectCount} suspect`)
  return results
}

// ④ Image Policy Violation — 썸네일 AI 비전 스캔
// 검색 결과 페이지 스크린샷 1장으로 20개를 한번에 분석
const thumbnailVisionScan = async (
  vision: VisionAnalyzer,
  screenshotBase64: string,
  results: SearchResult[],
): Promise<string[]> => {
  try {
    const aiResult = await vision.scanThumbnails(screenshotBase64)

    if (!aiResult.violations || aiResult.violations.length === 0) {
      log('info', 'pre-scanner', 'Thumbnail vision scan: no violations found')
      return []
    }

    const violatingAsins: string[] = []

    for (const v of aiResult.violations) {
      const match = results.find(r => r.asin === v.asin)
      if (match) {
        violatingAsins.push(v.asin)
        if (!match.preScanResult) {
          match.preScanResult = { isSuspect: false, suspectReasons: [], score: 0 }
        }
        match.preScanResult.isSuspect = true
        match.preScanResult.suspectReasons.push(`Image Policy Violation: ${v.reason}`)
        match.preScanResult.score = Math.min(match.preScanResult.score + 40, 100)
      }
    }

    log('info', 'pre-scanner', `Thumbnail vision scan: ${violatingAsins.length} violations`)
    return violatingAsins
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    log('warn', 'pre-scanner', `Thumbnail vision scan failed: ${msg}`)
    return []
  }
}

export { preScanSearchResults, thumbnailVisionScan, preScanResult }
