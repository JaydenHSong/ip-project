# Crawler V3: 4가지 핵심 위반 집중 탐지 — Design Document

> **Plan 문서**: `docs/01-plan/features/crawler-v3-4-violations.plan.md`
>
> **Project**: Sentinel
> **Version**: 0.9.0-beta
> **Author**: CTO Lead (AI)
> **Date**: 2026-03-19
> **Status**: Draft

---

## 1. 변경 요약

| 파일 | 변경 유형 | 설명 |
|------|:--------:|------|
| `crawler/src/scheduler/jobs.ts` | **수정** | V3 파이프라인: Phase 1(검색 판별) → Phase 2(증거 수집) 분리 |
| `crawler/src/ai/pre-scanner.ts` | **수정** | suspectReasons에서 V코드 제거, 위반 유형 실제 이름 사용 |
| `crawler/src/ai/prompts.ts` | **수정** | THUMBNAIL_SCAN_PROMPT 전문화 (이미지 정책 위반 집중) |
| `crawler/src/scheduler/click-strategy.ts` | **수정** | innocent visit 이미지 차단 옵션 |
| `crawler/src/ai/violation-scanner.ts` | **비활성화** | 2차 AI 분석 제거 (상세 진입 시 호출 안 함) |

---

## 2. 상세 설계

### 2.1 jobs.ts — V3 파이프라인

#### 현재 (V2) 흐름
```
검색 루프:
  scrapeSearchPage → preScanSearchResults → [조건부 thumbnailVisionScan]
  → selectClickTargets (suspect + innocent)
  → 상세 진입 루프:
    clickIntoProduct → scrapeDetailPage → captureScreenshot
    → scanViolation (2차 AI) → 위반이면 listings.push
    → goBack
```

#### V3 흐름
```
검색 루프:
  scrapeSearchPage → preScanSearchResults → thumbnailVisionScan (항상)
  → violations = suspect 건만 추출
  → 증거 수집 루프 (violations만):
    clickIntoProduct → scrapeDetailPage → captureScreenshot
    → listings.push (2차 AI 없이, 1차 결과 전달)
    → goBack
  → innocent visit (이미지 차단 상태로 1-2건)
```

#### 핵심 변경 3가지

**(1) thumbnailVisionScan 항상 실행**

```typescript
// V2 (현재): 키워드 매칭 의심 건이 없을 때만
if (pageSuspects.length === 0) {
  const screenshot = await captureScreenshot(page, 1024, 640, 'scan')
  await thumbnailVisionScan(vision, screenshot, nonSpigenResults)
}

// V3 (변경): 항상 실행
if (vision) {
  const screenshot = await captureScreenshot(page, 1024, 640, 'scan')
  await thumbnailVisionScan(vision, screenshot, nonSpigenResults)
}
```

**(2) 2차 AI 분석(scanViolation) 제거**

```typescript
// V2 (현재): 상세 진입 후 2차 AI 판정
if (vision) {
  crawlerAiResult = await scanViolation(vision, detail, screenshot)
  if (!crawlerAiResult.is_violation) {
    await page.goBack()
    continue  // 비위반이면 스킵
  }
}

// V3 (변경): 1차에서 이미 확정, 2차 AI 없음
// scanViolation 호출 제거
// crawlerAiResult는 1차 preScanResult에서 변환
const crawlerAiResult: CrawlerAiResult = {
  is_violation: true,
  violation_types: result.preScanResult!.suspectReasons,
  confidence: result.preScanResult!.score,
  reasons: result.preScanResult!.suspectReasons,
  evidence_summary: `Detected in search page scan`,
}
```

**(3) Innocent visit 이미지 차단**

```typescript
// V2 (현재): innocent도 동일하게 상세 진입 + 스크린샷
if (target.reason === 'innocent') {
  log('info', 'jobs', `Innocent visit: ${result.asin} (decoy)`, { campaignId })
  await page.goBack()
  continue
}

// V3 (변경): innocent visit 시 이미지 차단
if (target.reason === 'innocent') {
  // 이미지 차단하여 bandwidth 절감
  await page.route('**/*.{png,jpg,jpeg,webp,gif,svg,ico}', (route) => route.abort())
  await clickIntoProduct(page, originalIndex, persona)
  await humanBehavior.delay(persona.dwell.detailPageDwellMin, persona.dwell.detailPageDwellMax)
  await page.unrouteAll()
  await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15_000 })
  continue
}
```

---

### 2.2 pre-scanner.ts — V코드 제거 + 위반 유형명 사용

#### 현재 suspectReasons 형식
```typescript
// V코드 사용 (레거시)
reasons.push(`V10: ${result.variationCount} variations (>= ${VARIATION_THRESHOLD})`)
reasons.push(`V08: ${v.reason}`)
```

#### V3 변경: 실제 위반 유형명 사용
```typescript
// 위반 유형 실제 이름 사용
reasons.push(`Variation Policy Violation: ${result.variationCount} variations (>= ${VARIATION_THRESHOLD})`)

// 키워드 매칭도 카테고리별 위반 유형명 사용
if (trademarkMatched.length > 0) {
  reasons.push(`Trademark Infringement: ${trademarkMatched.join(', ')}`)
  score += 30 * trademarkMatched.length
}
if (counterfeitMatched.length > 0) {
  reasons.push(`Counterfeit Product: ${counterfeitMatched.join(', ')}`)
  score += 25 * counterfeitMatched.length
}
if (compatibilityMatched.length > 0) {
  reasons.push(`Trademark Infringement (compatibility): ${compatibilityMatched.join(', ')}`)
  score += 15 * compatibilityMatched.length
}
```

#### 키워드 분류 재구조화

```typescript
const SUSPECT_KEYWORDS = {
  // 상표 침해 (Trademark Infringement)
  trademark: [
    'spigen', 'tough armor', 'rugged armor', 'ultra hybrid',
    'thin fit', 'liquid air', 'liquid crystal', 'neo hybrid',
    'crystal flex', 'ez fit', 'glas.tr', 'glastr', 'ciel', 'cyrill',
  ],
  // 상표 침해 - 호환성 오인 유도
  trademark_compatibility: [
    'compatible with spigen', 'fits spigen', 'for spigen',
    'spigen compatible', 'works with spigen',
  ],
  // 위조품 (Counterfeit Product)
  counterfeit: [
    'oem', 'original quality', 'same as', 'replica',
    'replacement for spigen', 'alternative to spigen',
  ],
} as const
```

#### thumbnailVisionScan에서도 V코드 제거

```typescript
// 현재
match.preScanResult.suspectReasons.push(`V08: ${v.reason}`)

// V3
match.preScanResult.suspectReasons.push(`Image Policy Violation: ${v.reason}`)
```

---

### 2.3 prompts.ts — THUMBNAIL_SCAN_PROMPT 전문화

현재 `THUMBNAIL_SCAN_PROMPT`를 이미지 정책 위반에 더 집중하도록 개선:

```typescript
const THUMBNAIL_SCAN_PROMPT = `You are an Amazon main image policy violation detector for Spigen brand protection.
Analyze the search result thumbnails for MAIN IMAGE policy violations only.

Respond with ONLY a JSON object, no other text.

{
  "violations": [
    {
      "asin": "ASIN if visible, or position number as string",
      "reason": "specific violation description"
    }
  ]
}

Amazon Main Image Policy Requirements:
- MUST have pure white background (RGB 255,255,255)
- MUST show only the product (no lifestyle/in-use shots)
- MUST NOT have text overlay, badges, or promotional callouts
- MUST NOT have watermarks or added logos
- MUST NOT be a collage or show multiple products
- MUST NOT have before/after comparison
- MUST NOT have colored borders or frames

Focus on:
- Phone cases and screen protectors (Spigen product category)
- Clear violations only — do not flag borderline cases
- If background is off-white or light gray, flag it
- Text on image is always a violation (even small text)

If no violations found, return {"violations": []}.` as const
```

---

### 2.4 click-strategy.ts — Innocent visit 분리

#### 현재: suspect + innocent 혼합
```typescript
// suspect + innocent를 섞어서 하나의 배열 반환
targets.sort(() => Math.random() - 0.5)
return targets.slice(0, maxProducts)
```

#### V3: suspect와 innocent를 분리 반환

```typescript
type ClickTargets = {
  suspects: ClickTarget[]    // 위반 확정 → 상세 진입 + 스크린샷
  innocents: ClickTarget[]   // 디코이 → 이미지 차단 상태로 가볍게 방문
}

const selectClickTargets = (
  results: SearchResult[],
  persona: CrawlPersona,
): ClickTargets => {
  // ... suspect/innocent 분리 (기존과 동일)

  return {
    suspects: suspects.map(s => ({ index: s.index, asin: s.result.asin, reason: 'suspect' as const })),
    innocents: shuffledInnocents
      .slice(0, innocentCount)
      .map(inn => ({ index: inn.index, asin: inn.result.asin, reason: 'innocent' as const })),
  }
}
```

---

### 2.5 violation-scanner.ts — 비활성화

2차 AI 분석을 완전히 삭제하지 않고, import만 제거:

```typescript
// jobs.ts에서 import 제거
// import { scanViolation } from '../ai/violation-scanner.js'  // V3: 비활성화

// violation-scanner.ts 파일은 유지 (향후 재활용 가능)
```

---

## 3. 데이터 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────┐
│                    검색 페이지 (Phase 1)                   │
│                                                           │
│  scrapeSearchPage()                                       │
│       ↓                                                   │
│  Spigen 필터링                                            │
│       ↓                                                   │
│  preScanSearchResults()                                   │
│  ├── Trademark Infringement (키워드)                      │
│  ├── Counterfeit Product (키워드)                          │
│  └── Variation Policy Violation (개수)                     │
│       ↓                                                   │
│  thumbnailVisionScan() ← 항상 실행                        │
│  └── Image Policy Violation (썸네일 AI)                   │
│       ↓                                                   │
│  ┌──────────┬──────────┐                                  │
│  │ suspect  │ innocent │                                  │
│  │ (위반)    │ (디코이)  │                                  │
│  └────┬─────┴────┬─────┘                                  │
└───────┼──────────┼────────────────────────────────────────┘
        ↓          ↓
┌───────────┐ ┌──────────────┐
│  Phase 2  │ │ 이미지 차단    │
│ 상세 진입  │ │ 가볍게 방문    │
│ 스크린샷   │ │ bandwidth 0   │
│ 서버 전송  │ │              │
└───────────┘ └──────────────┘
```

---

## 4. 구현 순서

| Step | 파일 | 작업 | 의존성 |
|:----:|------|------|:------:|
| 1 | `pre-scanner.ts` | V코드 → 위반 유형명, 키워드 재분류 | 없음 |
| 2 | `prompts.ts` | THUMBNAIL_SCAN_PROMPT 전문화 | 없음 |
| 3 | `click-strategy.ts` | suspects/innocents 분리 반환 | 없음 |
| 4 | `jobs.ts` | V3 파이프라인 (핵심 변경 3가지) | Step 1-3 |
| 5 | 테스트 | Railway deploy → bandwidth 모니터링 | Step 4 |

**Step 1-3은 독립적이므로 병렬 작업 가능**, Step 4는 1-3 완료 후 진행.

---

## 5. 변경하지 않는 것

| 파일/모듈 | 이유 |
|-----------|------|
| `search-page.ts` | 검색 파싱 로직 그대로 |
| `detail-page.ts` | 상세 파싱 로직 그대로 |
| `screenshot.ts` | 스크린샷 설정 그대로 (CLAUDE.md 제약) |
| `vision-analyzer.ts` | `scanThumbnails` 인터페이스 그대로 |
| `anti-bot/*` | 페르소나/행동 시스템 그대로 |
| `sentinel-fetch/` | 이미 최적화 완료, 별도 서비스 |
| `br-submit/`, `br-monitor/` | Bright Data 미사용 |

---

## 6. 롤백 전략

V3에서 문제 발생 시:
1. `jobs.ts`에서 `thumbnailVisionScan` 조건 복원 (항상→조건부)
2. `scanViolation` import 복원
3. `click-strategy.ts`에서 통합 배열 반환 복원

**모든 변경이 코드 레벨**이므로 git revert로 즉시 롤백 가능.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-19 | Initial design — V3 파이프라인 상세 설계 | CTO Lead |
