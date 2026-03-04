# Completion Report: Extension Passive Collect

> 오퍼레이터가 평소 아마존 브라우징 시 자동으로 리스팅 텍스트 데이터를 수집하여 서버에 전송하는 기능

## 1. PDCA Summary

| Phase | Status | Date |
|-------|--------|------|
| Plan | Completed | 2026-03-03 |
| Design | Completed | 2026-03-03 |
| Do | Completed | 2026-03-03 |
| Check | 99% Match Rate | 2026-03-03 |
| Report | This document | 2026-03-03 |

```
[Plan] ✅ → [Design] ✅ → [Do] ✅ → [Check] ✅ (99%) → [Report] ✅
```

## 2. Feature Overview

### Problem
오퍼레이터들이 매일 아마존에서 수십~수백 개의 상품 페이지를 방문하지만, 이 브라우징 데이터가 100% 유실되고 있었음. Crawler는 캠페인 키워드 기반으로만 수집하여 커버리지에 한계가 있었음.

### Solution
이미 설치된 Sentinel Extension이 **백그라운드에서 자동으로 텍스트 데이터만 수집**하여 서버에 배치 전송. 이미지를 제외하여 건당 2-5KB의 경량 payload를 유지하고, 오퍼레이터의 브라우징 경험에 전혀 영향을 주지 않음.

### Key Metrics
- **수집 범위**: 상품 상세 페이지 (`/dp/*`) + 검색 결과 페이지 (`/s?k=*`)
- **검색 결과**: 한 페이지당 20~60개 리스팅 일괄 수집
- **네트워크**: 건당 2-5KB, 배치 전송 (10건 또는 5분)
- **중복 방지**: 로컬 24시간 dedup + 서버 UPSERT
- **UI 영향**: 없음 (requestIdleCallback 사용)

## 3. Implementation Details

### New Files (4)

| File | Lines | Purpose |
|------|-------|---------|
| `extension/src/content/search-parser.ts` | ~80 | 아마존 검색 결과 DOM 파서 |
| `extension/src/content/search-content.ts` | ~20 | 검색 결과 Content Script 엔트리 |
| `extension/src/background/passive-queue.ts` | ~95 | 배치 큐 + 중복 필터 + 전송 |
| `src/app/api/ext/passive-collect/route.ts` | ~160 | 서버 배치 수신 API |

### Modified Files (9)

| File | Change |
|------|--------|
| `extension/src/shared/types.ts` | PassivePageData, PassiveSearchData, PassiveQueueItem, DedupeEntry 타입 + Storage 키 추가 |
| `extension/src/shared/messages.ts` | PASSIVE_PAGE_DATA, PASSIVE_SEARCH_DATA 메시지 타입 |
| `extension/src/content/index.ts` | idle 타임에 패시브 수집 데이터 전달 |
| `extension/src/background/service-worker.ts` | 패시브 메시지 핸들러 + chrome.alarms (5분 flush, 1시간 dedup 정리) |
| `extension/src/background/api.ts` | `submitPassiveCollect()` API 클라이언트 함수 |
| `extension/manifest.json` | 검색 결과 URL 패턴 8개 + `alarms` 권한 |
| `extension/vite.config.ts` | `search-content` 빌드 엔트리 |
| `src/types/listings.ts` | ListingSource에 `'extension_passive'` 추가 |
| `src/types/api.ts` | PassiveCollect 관련 요청/응답 타입 6개 |

### Total: ~355 lines of new/modified code

## 4. Architecture

```
오퍼레이터 아마존 브라우징
  ├─ /dp/* (상품 상세) → parser.ts → PASSIVE_PAGE_DATA
  └─ /s?k=* (검색 결과) → search-parser.ts → PASSIVE_SEARCH_DATA
       │
       ▼
  Service Worker
    → 로컬 중복 체크 (24h dedup)
    → chrome.storage 큐에 저장 (최대 100건)
    → 10건 누적 or 5분 경과 → 배치 flush
       │
       ▼
  POST /api/ext/passive-collect
    → withAuth (Bearer, viewer+)
    → checkSuspectListing()
    → listings 테이블 (source: 'extension_passive')
    → 의심 리스팅 → AI 분석 자동 트리거
```

## 5. Gap Analysis Results

| Category | Score |
|----------|-------|
| Design Match | 99.4% |
| Architecture Compliance | 100% |
| Convention Compliance | 100% |
| **Overall** | **99%** |

### Gaps (1, Low priority)
- `getQueueSize()` 유틸리티 함수 미구현 — 설계에 포함되었으나 호출처 없음. 모니터링 필요 시 추가 가능.

### Enhancements (9, beyond design)
- `flushInProgress` 동시 실행 방지 가드
- 재귀 flush (남은 건수 > 배치 사이즈)
- 콘텐츠 스크립트 에러 핸들링 (try/catch)
- ASIN 길이 검증 (10자)
- 확장된 DOM 셀렉터 (브랜드, 스폰서, 리뷰수)
- 다국가 통화 파싱 (USD/GBP/JPY/EUR)

## 6. Build Verification

| Check | Result |
|-------|--------|
| Extension Vite Build | ✅ 성공 (search-content.js 2.38KB) |
| Web TypeScript Check | ✅ 에러 없음 |
| DB Schema Change | 불필요 (기존 text 컬럼 활용) |

## 7. Dependencies

모든 의존성이 기존 구현에서 충족됨:
- ✅ Extension Content Script (parser.ts)
- ✅ Extension Auth (Google OAuth)
- ✅ listings 테이블 (source 컬럼)
- ✅ checkSuspectListing (서버 사이드)
- ✅ AI 분석 파이프라인 (fire-and-forget)

## 8. What This Enables

1. **데이터 커버리지 확대**: Crawler + 오퍼레이터 브라우징 = 이중 수집망
2. **검색어 추적**: 어떤 키워드에서 어떤 셀러가 노출되는지 raw_data에 기록
3. **봇 탐지 리스크 0**: 실제 사용자 브라우징이므로 아마존 탐지 불가
4. **추가 비용 0**: 프록시/서버 비용 없이 순수 확장 기능
5. **AI 분석 연계**: 의심 리스팅 자동 탐지 → 신고 파이프라인 자동 진입
