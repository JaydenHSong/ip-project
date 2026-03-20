# Crawler V3: 4가지 핵심 위반 집중 탐지

> **Summary**: 크롤러를 검색 페이지 중심으로 전환하여 4가지 핵심 위반만 정확하게 탐지하고, 상세 페이지 진입을 최소화하여 Bright Data bandwidth를 70-80% 절감
>
> **Project**: Sentinel
> **Version**: 0.9.0-beta
> **Author**: CTO Lead (AI)
> **Date**: 2026-03-19
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 현재 Crawler V2는 19개 위반 유형을 탐지하려고 하지만 실질적으로 7개만 가능하고, 모든 의심 건에 상세 페이지 진입 + 스크린샷을 촬영하여 Bright Data bandwidth가 월 14.6GB (약 $73-146) 발생 |
| **Solution** | 4가지 핵심 위반(상표 침해, 위조품, 이미지 정책 위반, 베리에이션 남용)에 집중하고, 검색 페이지에서 1차 판별 완료 후 위반 확정 건만 상세 진입 |
| **Function/UX Effect** | 크롤링 속도 2-3배 향상, 동일 예산으로 더 많은 캠페인 운영 가능, 위반 탐지 정확도 향상 (분산 → 집중) |
| **Core Value** | Bright Data 월 비용 70-80% 절감 (14.6GB → 3-4GB), 4가지 위반의 탐지 품질을 교육/프롬프트 최적화로 극대화 |

---

## 1. Overview

### 1.1 Purpose

Crawler V2의 "넓지만 얕은" 탐지 전략을 **"좁지만 깊은"** 전략으로 전환한다. 검색 페이지에서 모든 판별을 완료하고, 상세 페이지 진입은 증거 수집용으로만 한정한다.

### 1.2 Background

**현재 V2 흐름:**
```
홈 → 검색 → 의심 건 전부 상세 진입 → 스크린샷 + AI 분석 → 위반 판정
```
- 의심 건 30-50%가 상세 진입 → 건당 4-5MB bandwidth
- 7가지 위반을 분산 탐지하지만 프롬프트가 범용적이라 정확도 낮음
- 상세 진입한 건의 대부분이 "비위반"으로 판정 → 낭비

**V3 목표 흐름:**
```
홈 → 검색 → 검색 페이지에서 4가지 위반 판별 완료 → 위반 확정 건만 상세 진입 (증거용)
```

### 1.3 Related Documents

- Bright Data Bandwidth Optimization: `docs/01-plan/features/bright-data-bandwidth-optimization.plan.md`
- AI Crawler Vision: `docs/01-plan/features/ai-crawler-vision.plan.md`
- Violation Types: `src/constants/violations.ts`

---

## 2. 집중 탐지 대상: 4가지 핵심 위반

### 2.1 선정 기준

- 검색 페이지 데이터(제목, 썸네일, 베리에이션 수)만으로 탐지 가능한 것
- Spigen 브랜드 보호에 가장 직접적인 것
- 실무에서 신고 빈도가 높은 것

### 2.2 4가지 위반 상세

| # | 위반 유형 | 탐지 방법 | 데이터 소스 |
|:-:|-----------|----------|:----------:|
| 1 | **Trademark Infringement** (상표 침해) | 제목에 "Spigen", "Tough Armor", "Rugged Armor" 등 Spigen 등록 상표 포함 | 제목 텍스트 |
| 2 | **Counterfeit Product** (위조품) | "replica", "oem", "replacement for spigen", "alternative to spigen" 등 위조 시그널 키워드 | 제목 텍스트 |
| 3 | **Image Policy Violation** (이미지 정책 위반) | 메인 썸네일의 텍스트 오버레이, 비백색 배경, 워터마크, 콜라주 등 | 썸네일 (AI Vision) |
| 4 | **Variation Policy Violation** (베리에이션 남용) | 베리에이션 7개 이상, 무관 제품 묶음 | 베리에이션 수 |

### 2.3 의도적으로 제외하는 위반

| 위반 유형 | 제외 이유 | 향후 추가 가능성 |
|-----------|----------|:--:|
| Copyright Infringement (저작권 침해) | 이미지 원본 비교 DB 없음 | 중기 |
| Design Patent Infringement (디자인 특허 침해) | 디자인 유사도 비교 불가 | 장기 |
| False Advertising (허위 광고) | 사실 확인 불가 | 장기 |
| Review Manipulation (리뷰 조작) | 리뷰 이력 추적 불가 | 중기 |
| Resale Violation (무단 재판매) | 판매자 인증 DB 필요 | 중기 |
| 나머지 (Missing Certification 등) | 물리적 검증/외부 데이터 필요 | 장기 |

---

## 3. V3 크롤 파이프라인

### 3.1 전체 흐름

```
Phase 1: 검색 페이지 탐색
─────────────────────────
홈 → 검색 → 검색 결과 페이지 루프 (maxPages)
  └→ 각 페이지에서:
     ① CSS 파싱: 제목, ASIN, 셀러, 브랜드, 베리에이션 수 추출
     ② Spigen 자사 제품 필터링 (기존과 동일)
     ③ 텍스트 1차 필터: 상표 침해 + 위조품 + 베리에이션 남용
     ④ 썸네일 Vision: 이미지 정책 위반 (Haiku 1회/페이지)
     ⑤ 위반 확정 목록 생성

Phase 2: 증거 수집 (위반 확정 건만)
────────────────────────────────
위반 확정 건만 상세 페이지 진입
  └→ 상세 데이터 추출 (제목/셀러/가격/설명)
  └→ 증거 스크린샷 촬영 (evidence quality)
  └→ 서버 전송

Phase 3: 상세 진입하지 않는 건
────────────────────────────
위반 미확정 건 → 검색 결과 데이터만 서버 전송 (선택)
  └→ 향후 sentinel-fetch로 상세 보완 가능
```

### 3.2 Phase 1 상세: 검색 페이지 판별

```typescript
// 의사 코드
for (pageNum = 1; pageNum <= maxPages; pageNum++) {
  // ① CSS 파싱 (기존 동일)
  const results = await scrapeSearchPage(page, mp, keyword, pageNum)

  // ② Spigen 필터 (기존 동일)
  const nonSpigen = results.filter(r => !r.isSpigen)

  // ③ 텍스트 1차 필터 — 3가지 위반
  preScanSearchResults(nonSpigen)  // 상표 침해 + 위조품 + 베리에이션

  // ④ 썸네일 Vision — 이미지 정책 위반 (항상 실행)
  const screenshot = await captureScreenshot(page, 1024, 640, 'scan')
  await thumbnailVisionScan(vision, screenshot, nonSpigen)

  // ⑤ 위반 확정 = suspect 건 (텍스트 OR Vision)
  const violations = nonSpigen.filter(r => r.preScanResult?.isSuspect)
}
```

**핵심 변경**: 현재는 키워드 매칭 의심 건이 0건일 때만 Vision scan → **V3에서는 항상 Vision scan 실행**

### 3.3 Phase 2 상세: 증거 수집

```typescript
// 위반 확정 건만 상세 진입
for (const violation of violations) {
  await clickIntoProduct(page, violation.index, persona)
  const detail = await scrapeDetailPage(page, mp, violation.asin)
  const screenshot = await captureScreenshot(page, width, height, 'evidence')

  listings.push({
    ...detail,
    screenshot_base64: screenshot,
    crawler_ai_result: {
      is_violation: true,
      violation_types: violation.preScanResult.suspectReasons,
      confidence: violation.preScanResult.score,
      ...
    }
  })

  await page.goBack()
}
```

**핵심 변경**: 2차 AI 분석(scanViolation) 제거 — 1차에서 이미 확정했으므로 상세 진입은 증거만 수집

### 3.4 Innocent Visit 처리

```
현재: innocent visit도 상세 진입 + 스크린샷 → bandwidth 낭비
V3:  innocent visit 시 이미지 차단 (스크린샷 불필요)
     또는 검색 페이지에서 임의 스크롤/딜레이로 대체
```

---

## 4. AI 프롬프트 교육 전략

### 4.1 현재 문제

현재 `VIOLATION_SCAN_PROMPT`는 7가지 위반을 한번에 체크하라고 지시하여:
- 범용적 → 각 위반의 판별 기준이 느슨함
- 판별 기준이 프롬프트에 1줄씩만 → 경계 사례 놓침
- Spigen 특화 지식이 부족

### 4.2 V3 프롬프트: 위반별 전문화

**4가지 전문화된 프롬프트**를 만들고, 각각 판별 기준을 상세하게 교육:

#### (1) Trademark Infringement 전용 프롬프트
- Spigen 등록 상표 전체 목록 포함 (Spigen, Tough Armor, Rugged Armor, Ultra Hybrid, Thin Fit, Liquid Air, Liquid Crystal, Neo Hybrid, Crystal Flex, EZ Fit, Glas.tR, Cyrill, Ciel 등)
- "compatible with" vs "by Spigen" 구분 기준
- 대소문자/오타 변형 대응 (spign, spgien 등)

#### (2) Counterfeit Product 전용 프롬프트
- 위조 시그널 키워드 확장
- 가격 이상 패턴 (정품 대비 50% 이하)
- 셀러 이름 패턴 (중국어 랜덤 문자열 등)

#### (3) Image Policy Violation 전용 프롬프트 (Vision)
- 아마존 메인 이미지 정책 명시 (백색 배경, 제품만, 텍스트 금지)
- Spigen 제품 이미지 특성 교육 (정품 이미지 패턴)
- 위반 사례 유형별 설명 (텍스트 오버레이, 라이프스타일, 콜라주 등)

#### (4) Variation Policy Violation 전용 프롬프트
- 베리에이션 수 + 제목 다양성 조합 분석
- "다른 기기 모델이 색상 옵션으로" 패턴 탐지
- 정상 베리에이션 vs 남용 기준

### 4.3 프롬프트 관리 구조

```
crawler/src/ai/prompts/
├── trademark-scan.ts        ← 상표 침해 전용
├── counterfeit-scan.ts      ← 위조품 전용
├── image-policy-scan.ts     ← 이미지 정책 위반 전용 (Vision)
├── variation-scan.ts        ← 베리에이션 남용 전용
├── page-status.ts           ← 기존 유지
├── search-results.ts        ← 기존 유지
└── index.ts                 ← 통합 export
```

---

## 5. Bandwidth 절감 시뮬레이션

### 5.1 현재 vs V3 비교

| 항목 | V2 (현재) | V3 (개선) | 변화 |
|------|:---------:|:---------:|:----:|
| 검색 페이지 당 bandwidth | ~3MB | ~3MB (이미지 차단 시 ~1MB) | 0% ~ -67% |
| 상세 진입 비율 | 30-50% | **5-10%** (위반 확정만) | **-80%** |
| 상세 페이지 당 bandwidth | ~4-5MB | ~4-5MB (증거용 이미지 유지) | 0% |
| Innocent visit bandwidth | ~4-5MB | **0** (제거 또는 이미지 차단) | **-100%** |
| AI 호출 횟수/페이지 | 상세 건마다 1회 | **검색 페이지당 1회** | **-80%** |

### 5.2 월간 비용 시뮬레이션

**가정**: 월 1,000 ASIN 크롤링, 캠페인 평균 3페이지

| 시나리오 | 월 Bandwidth | 비용 ($5/GB) |
|----------|:----------:|:-----------:|
| V2 현재 | ~14.6GB | ~$73 |
| V3 (검색 이미지 유지) | ~4-5GB | ~$22 |
| V3 (검색 이미지도 차단) | ~2-3GB | ~$12 |

---

## 6. 구현 범위

### 6.1 변경 파일

| 파일 | 변경 내용 | 난이도 |
|------|----------|:------:|
| `crawler/src/scheduler/jobs.ts` | V3 파이프라인 (Phase 1→2 분리) | 중간 |
| `crawler/src/ai/pre-scanner.ts` | 키워드 확장, Vision 항상 실행 | 낮음 |
| `crawler/src/ai/prompts.ts` | 4개 전문화 프롬프트로 분리 | 중간 |
| `crawler/src/ai/vision-analyzer.ts` | 프롬프트 연결 업데이트 | 낮음 |
| `crawler/src/ai/violation-scanner.ts` | 2차 AI 분석 제거 (또는 optional) | 낮음 |
| `crawler/src/scraper/screenshot.ts` | 변경 없음 | - |

### 6.2 변경하지 않는 것

- 검색 페이지 파싱 로직 (`search-page.ts`) — 기존 유지
- 상세 페이지 파싱 로직 (`detail-page.ts`) — 기존 유지
- 안티봇/페르소나 시스템 — 기존 유지
- sentinel-fetch — 별도 서비스, 이미 최적화 완료
- Extension — Bright Data 미사용

---

## 7. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 썸네일 Vision 항상 실행으로 Haiku 비용 증가 | Low | High | 페이지당 ~$0.001, 월 1,000페이지 = ~$1 — bandwidth 절감 대비 무시 수준 |
| 검색 페이지 이미지 차단 시 썸네일 Vision 불가 | High | High | **검색 페이지는 이미지 유지** (Vision 필요), CSS/폰트만 차단 |
| 1차 필터만으로 false positive 증가 | Medium | Medium | 프롬프트 전문화 + confidence threshold 조정으로 정확도 보완 |
| 상세 미진입으로 추가 정보 누락 | Low | Medium | 위반 확정 건은 상세 진입하므로 증거에는 영향 없음 |
| 나머지 위반 유형 미탐지 | Medium | - | 의도적 제외, 4가지 정확도 확보 후 단계적 추가 |

---

## 8. Success Criteria

### 8.1 Definition of Done

- [ ] V3 파이프라인 구현 (검색 판별 → 위반 건만 상세 진입)
- [ ] 4가지 전문화 프롬프트 작성 완료
- [ ] 썸네일 Vision이 매 검색 페이지에서 실행
- [ ] 2차 AI 분석(scanViolation) 제거 또는 비활성화
- [ ] Innocent visit 최적화 (이미지 차단 또는 제거)

### 8.2 Quality Criteria

- [ ] 4가지 위반 탐지 정확도: V2 대비 동등 이상
- [ ] Bandwidth: 일평균 1GB → 0.3GB 이하 (70% 절감)
- [ ] 크롤링 속도: 캠페인당 소요 시간 50% 단축
- [ ] CAPTCHA 발생률: V2 대비 증가 없음

---

## 9. 단계별 실행 계획

| Phase | 작업 | 예상 기간 |
|:-----:|------|:--------:|
| **1** | 4가지 전문화 프롬프트 작성 + 테스트 | 1-2일 |
| **2** | jobs.ts V3 파이프라인 구현 (Phase 1→2 분리) | 1-2일 |
| **3** | thumbnailVisionScan 항상 실행으로 변경 | 0.5일 |
| **4** | Innocent visit 최적화 | 0.5일 |
| **5** | 실 크롤링 테스트 + bandwidth 모니터링 | 2-3일 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-19 | Initial draft — V3 4가지 위반 집중 전략 수립 | CTO Lead |
