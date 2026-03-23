# Bright Data Bandwidth Cost Optimization Planning Document

> **Summary**: Bright Data Browser API bandwidth 사용량 분석 및 비용 최적화 전략 수립
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
| **Problem** | Bright Data Browser API의 bandwidth 기반 과금에서 이미지/CSS/JS 등 불필요한 리소스 로딩이 비용의 60-80%를 차지하며, 서비스별 최적화 전략이 부재함 |
| **Solution** | 서비스별 리소스 차단 전략 + waitUntil 최적화 + Extension 스크린샷의 Bright Data 비의존성 확인을 통한 단계적 비용 절감 |
| **Function/UX Effect** | 크롤링 속도 향상 (페이지 로딩 시간 30-50% 단축), 동일 기능 유지하면서 bandwidth 비용 절감 |
| **Core Value** | 월간 Bright Data 비용 50-70% 절감 예상, 동일 예산으로 크롤링 볼륨 2-3배 확대 가능 |

---

## 1. Overview

### 1.1 Purpose

Bright Data Scraping Browser API의 bandwidth 기반 과금 구조에서 불필요한 데이터 전송을 최소화하여 운영 비용을 절감한다.

### 1.2 Background

- Bright Data는 GB당 과금 (Scraping Browser 기준 약 $8-10/GB, 볼륨 할인 시 $3-5/GB)
- 아마존 상품 페이지 1건당 평균 전송량: 약 2-5MB (이미지 포함 시)
- 이미지 미로드 시: 약 0.3-0.8MB로 감소 (70-85% 절감)
- 현재 4개 서비스가 Bright Data를 사용하며, 각각 최적화 가능 수준이 다름

### 1.3 Related Documents

- Sentinel Software Overview: `docs/Sentinel_Software_Overview.md`
- Crawler Architecture: `crawler/src/` (Railway 배포)
- Extension Background Fetch: `extension/src/background/bg-fetch.ts`

---

## 2. 현재 아키텍처 분석

### 2.1 Bright Data 사용 서비스 맵

| # | 서비스 | 코드 위치 | Bright Data 사용 | 주요 트래픽 |
|---|--------|-----------|:----------------:|------------|
| 1 | **sentinel-fetch** | `sentinel-fetch/src/scraper.ts` | **Yes** (connectOverCDP) | 상품 페이지 로딩 |
| 2 | **Crawler (V2)** | `crawler/src/scheduler/jobs.ts` | **Yes** (connectOverCDP) | 검색 + 상품 상세 + 스크린샷 |
| 3 | **BR Submit** | `crawler/src/br-submit/worker.ts` | **No** (로컬 Chromium) | Brand Registry 폼 |
| 4 | **BR Monitor** | `crawler/src/br-monitor/worker.ts` | **No** (로컬 Chromium) | Case Dashboard |
| 5 | **Extension** | `extension/src/background/bg-fetch.ts` | **No** (Chrome 자체 브라우저) | 아마존 페이지 + 스크린샷 |

### 2.2 핵심 발견 사항

#### [발견 1] Extension 스크린샷은 Bright Data를 사용하지 않음

Extension의 `bg-fetch.ts`와 `screenshot.ts`는:
- `chrome.tabs.create()` + `chrome.tabs.captureVisibleTab()` 사용
- 또는 `chrome.debugger` CDP로 직접 캡처
- **Bright Data를 전혀 경유하지 않음** -- 사용자의 실제 Chrome 브라우저에서 직접 실행

따라서 Extension 스크린샷은 **Bright Data 비용과 무관**하며, 최적화 대상에서 제외.

#### [발견 2] BR Submit/Monitor도 로컬 Chromium 사용

- `br-submit/worker.ts`: `chromium.launchPersistentContext()` -- 로컬 Playwright Chromium
- `br-monitor/worker.ts`: `chromium.launchPersistentContext()` -- 로컬 Playwright Chromium
- 두 서비스 모두 `brandregistry.amazon.com`에 직접 접속, Bright Data 미사용

**Bright Data 비용 발생 서비스는 sentinel-fetch와 Crawler V2 두 개뿐.**

#### [발견 3] 실제 Bright Data 사용 지점

**sentinel-fetch** (`sentinel-fetch/src/scraper.ts`):
```
chromium.connectOverCDP(config.browserWs)  // BRIGHTDATA_BROWSER_WS
```
- `waitUntil: 'domcontentloaded'` -- 이미 최적화됨 (load 아닌 DOMContentLoaded)
- 이미지를 파싱하지만 `src` 속성만 읽음 (이미지 자체를 다운로드할 필요 없음)
- 스크린샷 미촬영

**Crawler V2** (`crawler/src/scheduler/jobs.ts`):
```
chromium.connectOverCDP(config.browserWs)  // BRIGHTDATA_BROWSER_WS
```
- 홈페이지 + 검색 + 상세 페이지를 순회
- 각 상세 페이지에서 `evidence` 스크린샷 촬영 (1280x800, JPEG quality 60, max 300KB)
- AI Vision 분석용 `scan` 스크린샷도 촬영 (720x550, quality 40, 150KB)
- 스크린샷을 위해 이미지가 실제 렌더링되어야 함

---

## 3. Bandwidth 소비 추정

### 3.1 아마존 페이지별 전송량 분석

| 리소스 유형 | 검색 페이지 | 상품 상세 페이지 | 비율 |
|-------------|:----------:|:---------------:|:----:|
| HTML | ~200KB | ~300KB | 5-10% |
| CSS | ~300KB | ~400KB | 10-15% |
| JavaScript | ~800KB | ~1MB | 20-30% |
| **이미지** | **~1.5MB** | **~2-3MB** | **50-65%** |
| 폰트/기타 | ~100KB | ~200KB | 3-5% |
| **합계** | **~3MB** | **~4-5MB** | 100% |

### 3.2 서비스별 월간 추정 (가정: 월 1,000 ASIN 크롤링)

| 서비스 | 페이지 수/건 | 건당 전송량 | 월간 전송량 | 비용 ($5/GB) |
|--------|:-----------:|:----------:|:----------:|:-----------:|
| sentinel-fetch | 1 (상세만) | ~4MB | ~4GB | ~$20 |
| Crawler V2 (홈+검색+상세) | ~5-10 | ~20MB | ~20GB | ~$100 |
| **합계** | | | **~24GB** | **~$120** |

> 주의: 실제 비용은 Bright Data Zone 설정, 캐시 정책, 크롤링 볼륨에 따라 크게 변동

---

## 4. 최적화 방안 (우선순위순)

### OPT-1: sentinel-fetch 이미지 차단 [High Impact, Low Risk]

**대상**: `sentinel-fetch/src/scraper.ts`
**현재**: 이미지가 모두 로딩된 후 `src` 속성만 읽음
**개선**: 이미지 실제 로딩을 차단하고, DOM에서 `src` 속성만 추출

**구현 방법**: Playwright Route Interception
```typescript
// page 생성 후 이미지 차단
await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico}', (route) => route.abort())
await page.route('**/*', (route, request) => {
  if (request.resourceType() === 'image') return route.abort()
  return route.continue()
})
```

**주의사항**:
- `src` 속성은 HTML에 있으므로 이미지 다운로드 없이도 추출 가능
- 아마존의 lazy-loading 이미지는 `data-src` 또는 JS 교체 방식이므로 스크롤 후 DOM 확인 필요

| 항목 | 값 |
|------|---|
| 예상 절감률 | **60-70%** (건당 4MB -> 1.2MB) |
| 구현 난이도 | Low (5줄 추가) |
| 봇 감지 위험 | Low (서버에서 이미지 요청 자체를 안 함) |
| 기능 영향 | None (이미지 URL은 DOM 파싱으로 확보) |

---

### OPT-2: Crawler V2 검색 페이지 이미지 차단 [Medium Impact, Low Risk]

**대상**: `crawler/src/scheduler/jobs.ts` -- 홈페이지, 검색 결과 페이지
**현재**: 검색 페이지에서도 모든 이미지 로딩
**개선**: 검색 페이지에서는 이미지 차단, 상세 페이지에서만 이미지 로드

**구현 방법**: 페이지별 라우팅 전략
```typescript
// 검색 페이지: 이미지 차단
await page.route('**/*', (route, request) => {
  if (request.resourceType() === 'image') return route.abort()
  return route.continue()
})

// 상세 페이지 진입 전: 이미지 차단 해제
await page.unrouteAll()
```

**주의사항**:
- 검색 결과에서 `imageUrl`을 수집하지만, 이는 `src` 속성 값 (DOM에 이미 존재)
- AI Vision scan 시 스크린샷이 필요하나, 이미지 없는 스크린샷으로도 텍스트 기반 분석 가능
- 썸네일 Vision scan의 정확도가 떨어질 수 있으나, 1차 필터링 목적이므로 수용 가능

| 항목 | 값 |
|------|---|
| 예상 절감률 | **30-40%** (검색 페이지만, 전체 크롤 세션 기준 15-20%) |
| 구현 난이도 | Medium (페이지 전환 시 route 관리) |
| 봇 감지 위험 | **Medium** -- 이미지 미요청은 봇 시그널이 될 수 있음 |
| 기능 영향 | AI Vision 썸네일 분석 정확도 소폭 하락 가능 |

---

### OPT-3: CSS/Font 차단 (텍스트 전용 크롤링) [Medium Impact, Medium Risk]

**대상**: `sentinel-fetch/src/scraper.ts` (스크린샷 불필요)
**현재**: CSS, 폰트 등 전체 로딩
**개선**: CSS, 폰트, 미디어 리소스 추가 차단

**구현 방법**:
```typescript
await page.route('**/*', (route, request) => {
  const type = request.resourceType()
  if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
    return route.abort()
  }
  return route.continue()
})
```

**주의사항**:
- sentinel-fetch는 텍스트 데이터만 추출하므로 CSS/폰트 불필요
- Crawler V2의 상세 페이지에서는 스크린샷 촬영이 필요하므로 CSS 필요
- 일부 아마존 페이지에서 CSS 미로딩 시 CAPTCHA 트리거 가능성 있음 (주의)

| 항목 | 값 |
|------|---|
| 예상 절감률 | **추가 15-20%** (OPT-1과 합산 시 총 80-85%) |
| 구현 난이도 | Low |
| 봇 감지 위험 | **Medium-High** -- CSS 미요청은 더 강한 봇 시그널 |
| 기능 영향 | None (sentinel-fetch 한정) |

---

### OPT-4: Crawler V2 상세 페이지 이미지 선택적 로딩 [Low-Medium Impact, Medium Risk]

**대상**: `crawler/src/scheduler/jobs.ts` -- 상세 페이지
**현재**: 모든 이미지 로딩 (스크린샷 때문에)
**개선**: 스크린샷 영역 (above-the-fold)에 보이는 이미지만 로드

**구현 방법**: CDP를 통한 선택적 이미지 차단
```typescript
// 메인 상품 이미지만 허용, 나머지 차단
await page.route('**/*', (route, request) => {
  if (request.resourceType() !== 'image') return route.continue()
  const url = request.url()
  // 아마존 메인 상품 이미지만 허용
  if (url.includes('images-na.ssl-images-amazon.com') || url.includes('m.media-amazon.com')) {
    // 썸네일 크기만 허용 (SL500, SL300 등), 원본(SL1500) 차단
    if (url.match(/SL(1[0-9]{3}|[2-9]\d{3})/)) return route.abort()
    return route.continue()
  }
  return route.abort()
})
```

**주의사항**:
- 스크린샷에 빈 이미지 placeholder가 나타날 수 있음
- 메인 이미지 1개 + 썸네일만 허용하면 시각적 완성도 유지 가능
- 아마존의 이미지 URL 패턴이 변경될 수 있음

| 항목 | 값 |
|------|---|
| 예상 절감률 | **20-30%** (상세 페이지 이미지 비용 중) |
| 구현 난이도 | Medium-High (URL 패턴 관리 필요) |
| 봇 감지 위험 | Low (일부 이미지는 로딩하므로) |
| 기능 영향 | 스크린샷에 일부 이미지 누락 가능 |

---

### OPT-5: JavaScript 선택적 차단 [Medium Impact, High Risk]

**대상**: sentinel-fetch (스크린샷 불필요)
**현재**: 모든 JS 실행
**개선**: 불필요한 third-party JS 차단

**구현 방법**:
```typescript
await page.route('**/*', (route, request) => {
  if (request.resourceType() === 'script') {
    const url = request.url()
    // 아마존 핵심 JS만 허용, 광고/트래킹 차단
    if (url.includes('fls-na.amazon') || url.includes('unagi') ||
        url.includes('adsystem') || url.includes('analytics')) {
      return route.abort()
    }
  }
  return route.continue()
})
```

**주의사항**:
- 아마존 페이지의 상당 부분이 JS 렌더링에 의존
- 가격, 셀러 정보 등이 JS로 동적 로딩되는 경우 있음
- **봇 감지 위험이 가장 높음** -- JS 미실행은 headless 브라우저의 대표적 시그널

| 항목 | 값 |
|------|---|
| 예상 절감률 | **20-30%** (JS 비용 중) |
| 구현 난이도 | High (어떤 JS가 필수인지 분석 필요) |
| 봇 감지 위험 | **High** |
| 기능 영향 | **High** -- 동적 콘텐츠 파싱 실패 가능 |

---

### OPT-6: waitUntil 전략 최적화 [Low Impact, Low Risk]

**대상**: 모든 Bright Data 사용 서비스
**현재 상태 분석**:

| 서비스 | 현재 설정 | 최적 설정 | 비고 |
|--------|----------|----------|------|
| sentinel-fetch | `domcontentloaded` | `domcontentloaded` | **이미 최적** |
| Crawler V2 홈 | `domcontentloaded` | `domcontentloaded` | **이미 최적** |
| Crawler V2 상세 | `domcontentloaded` | `domcontentloaded` | **이미 최적** |

**결론**: waitUntil은 이미 모두 `domcontentloaded`로 최적화되어 있음. `networkidle`이나 `load`를 사용하는 곳이 없음.

---

### OPT-7: Bright Data Zone 캐시 활용 [Medium Impact, No Risk]

**대상**: Bright Data 설정 (코드 변경 없음)
**개선**: Bright Data 대시보드에서 Zone 캐시 설정

- 동일 ASIN을 여러 번 크롤링할 때 캐시 히트로 bandwidth 절감
- TTL을 24시간으로 설정하면 같은 날 중복 요청 시 캐시에서 서빙
- Bright Data 자체 제공 기능이므로 코드 변경 불필요

| 항목 | 값 |
|------|---|
| 예상 절감률 | **중복 요청 비율에 비례** (5-15%) |
| 구현 난이도 | None (대시보드 설정) |
| 봇 감지 위험 | None |
| 기능 영향 | 캐시된 데이터가 오래될 수 있음 (TTL 조절로 관리) |

---

## 5. 구현 우선순위 매트릭스

| 우선순위 | 방안 | 절감률 | 난이도 | 위험도 | ROI |
|:--------:|------|:------:|:------:|:------:|:---:|
| **1** | OPT-1: sentinel-fetch 이미지 차단 | 60-70% | Low | Low | **Highest** |
| **2** | OPT-3: sentinel-fetch CSS/Font 차단 | +15-20% | Low | Medium | High |
| **3** | OPT-7: Bright Data Zone 캐시 | 5-15% | None | None | High |
| **4** | OPT-2: Crawler 검색 이미지 차단 | 15-20% | Medium | Medium | Medium |
| **5** | OPT-4: Crawler 상세 이미지 선택적 로딩 | 20-30% | Medium-High | Low | Medium |
| **6** | OPT-5: JS 선택적 차단 | 20-30% | High | **High** | Low |
| **7** | OPT-6: waitUntil 최적화 | 0% | - | - | N/A (이미 최적) |

### 단계별 실행 계획

**Phase 1 (즉시 실행, 위험 최소)** -- 예상 절감: 60-70%
- OPT-1: sentinel-fetch 이미지 차단
- OPT-7: Bright Data Zone 캐시 활성화

**Phase 2 (1주차, 모니터링 후)** -- 추가 절감: 15-20%
- OPT-3: sentinel-fetch CSS/Font 차단 (CAPTCHA 발생률 모니터링)
- OPT-2: Crawler 검색 페이지 이미지 차단

**Phase 3 (2주차, 데이터 축적 후)** -- 추가 절감: 10-20%
- OPT-4: Crawler 상세 이미지 선택적 로딩

**보류**:
- OPT-5: JS 차단 -- 봇 감지 위험이 너무 높아 당분간 보류

---

## 6. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 이미지 차단 시 CAPTCHA 트리거 증가 | High | Low | sentinel-fetch는 단건 요청이라 패턴 감지 어려움. 모니터링 후 롤백 준비 |
| CSS 차단 시 DOM 구조 변경 | Medium | Low | CSS는 렌더링용이라 DOM 파싱에 영향 미미 |
| 아마존 이미지 URL 패턴 변경 | Medium | Medium | URL 패턴 정규식을 설정화하여 빠른 대응 |
| 봇 감지 강화로 전체 차단 | High | Low | 리소스 차단은 점진적으로 적용, 항상 롤백 가능하게 설계 |
| Bright Data Zone 캐시가 stale 데이터 반환 | Low | Medium | TTL을 짧게 (6-12시간) 설정, 중요 크롤은 캐시 우회 |

---

## 7. 예상 비용 절감 시나리오

### 현재 (최적화 전)

| 서비스 | 건당 전송량 | 월 1,000건 기준 | 비용 ($5/GB) |
|--------|:----------:|:--------------:|:-----------:|
| sentinel-fetch | ~4MB | ~4GB | $20 |
| Crawler V2 | ~20MB | ~20GB | $100 |
| **합계** | | **~24GB** | **$120** |

### Phase 1 적용 후

| 서비스 | 건당 전송량 | 월 1,000건 기준 | 비용 ($5/GB) | 절감 |
|--------|:----------:|:--------------:|:-----------:|:----:|
| sentinel-fetch | ~1.2MB | ~1.2GB | $6 | -70% |
| Crawler V2 | ~20MB | ~20GB | $100 | 0% |
| **합계** | | **~21.2GB** | **$106** | **-12%** |

### Phase 1+2 적용 후

| 서비스 | 건당 전송량 | 월 1,000건 기준 | 비용 ($5/GB) | 절감 |
|--------|:----------:|:--------------:|:-----------:|:----:|
| sentinel-fetch | ~0.5MB | ~0.5GB | $2.5 | -87% |
| Crawler V2 | ~14MB | ~14GB | $70 | -30% |
| **합계** | | **~14.5GB** | **$72.5** | **-40%** |

### Phase 1+2+3 적용 후

| 서비스 | 건당 전송량 | 월 1,000건 기준 | 비용 ($5/GB) | 절감 |
|--------|:----------:|:--------------:|:-----------:|:----:|
| sentinel-fetch | ~0.5MB | ~0.5GB | $2.5 | -87% |
| Crawler V2 | ~10MB | ~10GB | $50 | -50% |
| **합계** | | **~10.5GB** | **$52.5** | **-56%** |

---

## 8. Success Criteria

### 8.1 Definition of Done

- [ ] Phase 1 구현 완료 (sentinel-fetch 이미지 차단)
- [ ] Bright Data Zone 캐시 설정 확인
- [ ] CAPTCHA 발생률 모니터링 체계 구축
- [ ] 각 Phase별 A/B 비교 데이터 수집

### 8.2 Quality Criteria

- [ ] 기존 기능 회귀 없음 (크롤링 성공률 95% 이상 유지)
- [ ] CAPTCHA 발생률 현재 대비 +5% 이내
- [ ] bandwidth 절감률 Phase 1 기준 50% 이상

---

## 9. Architecture Considerations

### 9.1 주요 기술적 결정

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 리소스 차단 방식 | Playwright `page.route()` | CDP-level 차단보다 안정적, 코드 관리 용이 |
| 서비스별 전략 | 분리 적용 | sentinel-fetch (공격적 차단) vs Crawler (보수적 차단) |
| 스크린샷 의존 서비스 | 이미지 유지 | Crawler V2 상세 페이지는 evidence 스크린샷이 필수 |
| 캐시 전략 | Bright Data Zone 캐시 | 코드 변경 없이 즉시 적용 가능 |

### 9.2 변경하지 않을 것

- Extension 스크린샷 설정 (CLAUDE.md 제약사항: `BOT_WINDOW_*`, `CAPTURE_*`, `MAX_CAPTURE_BYTES` 변경 금지)
- BR Submit/Monitor -- Bright Data 미사용이므로 최적화 대상 아님
- 봇 감지 회피 로직 (anti-bot 모듈) -- 기존 persona/human-behavior 체계 유지

---

## 10. Next Steps

1. [ ] 유저 승인 후 Phase 1 구현 시작 (`/pdca design`)
2. [ ] Bright Data 대시보드에서 현재 bandwidth 사용량 확인 (실측 데이터)
3. [ ] Phase 1 적용 후 1주일 모니터링
4. [ ] 모니터링 결과 기반 Phase 2 진행 여부 결정

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-19 | Initial draft — 전체 코드 분석 기반 최적화 방안 수립 | CTO Lead |
