# Plan: Extension Passive Collect (익스텐션 패시브 수집)

> 오퍼레이터가 평소 아마존 브라우징 시 자동으로 리스팅 텍스트 데이터를 수집하여 서버에 전송하는 기능

## 1. 배경 및 동기

### 문제
- Sentinel Crawler는 캠페인 키워드 기반으로만 수집 → 오퍼레이터가 실제 보는 리스팅 중 많은 부분이 수집되지 않음
- 오퍼레이터들은 **매일 수십~수백 개의 아마존 상품 페이지**를 방문 (순위 확인, 경쟁사 조사, 서치텀 분석 등)
- 이 브라우징 데이터가 현재 100% 유실됨

### 기회
- 오퍼레이터는 이미 Sentinel Extension을 설치 (신고용)
- 추가 설치 없이 **백그라운드 패시브 수집** 가능
- 이미지 없이 **텍스트만** 수집하면 네트워크 부하 최소화 (건당 ~2-5KB)
- 크롤러 대비 장점: 봇 탐지 위험 0, 프록시 비용 0, 실사용자 브라우징 패턴

## 2. 목표

| ID | 목표 | 측정 기준 |
|----|------|-----------|
| G1 | 오퍼레이터 브라우징 중 자동 리스팅 데이터 수집 | 일일 수집 건수 추적 |
| G2 | 서버 전송 (텍스트만, 이미지 제외) | 건당 payload < 5KB |
| G3 | 사용자 경험 무해 | 페이지 로드 지연 0ms, UI 변경 없음 |
| G4 | 중복 방지 | 같은 ASIN+마켓 24시간 내 중복 전송 차단 |

## 3. 기능 요구사항

### F1: 패시브 수집 (Content Script)
- 아마존 상품 페이지(`/dp/*`) 방문 시 자동으로 DOM 파싱
- **기존 `parser.ts` 재활용** — 이미 ASIN, 제목, 셀러, 가격, 불릿포인트, 브랜드, 평점, 리뷰수 파싱 구현됨
- 이미지 URL 배열은 **수집하지 않음** (텍스트만)
- 파싱 데이터를 Service Worker로 전달

### F2: 배치 전송 (Service Worker)
- 수집된 데이터를 **로컬 큐(chrome.storage.local)**에 저장
- 일정 간격(5분) 또는 일정 개수(10건) 누적 시 서버에 **배치 전송**
- 전송 실패 시 재시도 (최대 3회, 지수 백오프)
- 전송 성공한 데이터는 로컬에서 삭제

### F3: 중복 필터링 (로컬)
- `chrome.storage.local`에 최근 24시간 수집한 ASIN+마켓 해시 저장
- 이미 수집한 페이지는 스킵 → 불필요한 네트워크 요청 방지
- 24시간 지난 해시는 자동 정리 (Service Worker alarm 사용)

### F4: 서버 API (Web)
- 새 엔드포인트: `POST /api/ext/passive-collect`
- 기존 `/api/ext/` 경로 → 미들웨어 인증 스킵 (자체 Bearer 토큰 인증)
- 배치 수신: `{ listings: PassiveListingData[] }`
- 기존 `listings` 테이블에 `source: 'extension_passive'`로 저장
- `checkSuspectListing()` 적용 → 의심 리스팅 자동 AI 분석 트리거

### F6: 검색 결과 페이지 수집 (필수)
- 아마존 검색 결과 페이지(`/s?k=...`)에서 목록 리스팅 기본 정보 일괄 파싱
- 한 페이지에 20~60개 리스팅 수집 가능 → 데이터 수집 효율 극대화
- 수집 데이터: ASIN, 제목, 가격, 브랜드, 평점, 리뷰수, 셀러(스폰서 여부)
- 검색어(search term)도 함께 기록 → 어떤 키워드에서 발견된 리스팅인지 추적
- manifest.json에 검색 결과 URL 패턴 추가: `https://www.amazon.*/s?*`

## 4. 비기능 요구사항

| 항목 | 요구사항 |
|------|----------|
| 성능 | 페이지 로드에 영향 없음 (파싱은 idle callback 사용) |
| 네트워크 | 건당 2-5KB, 배치 전송으로 요청 수 최소화 |
| 저장 | chrome.storage.local 사용 (5MB 제한 내 관리) |
| 보안 | 기존 Auth 토큰 재사용, HTTPS 전송 |
| 프라이버시 | 상품 데이터만 수집 (개인정보 없음) |

## 5. 기술 구현 방향

### Extension 변경
```
extension/src/
  content/
    parser.ts          ← 기존 (변경 없음)
    index.ts           ← 패시브 수집 로직 추가
    search-parser.ts   ← (선택) 검색 결과 파싱
  background/
    service-worker.ts  ← 배치 큐 + 전송 로직 추가
    api.ts             ← passiveCollect API 함수 추가
  shared/
    types.ts           ← PassiveListingData 타입 추가
    storage.ts         ← 큐/중복필터 스토리지 키 추가
    constants.ts       ← 배치 설정 상수
```

### Web (서버) 변경
```
src/app/api/ext/
  passive-collect/route.ts  ← 신규 배치 수신 API
```

### DB 변경
- 변경 없음: 기존 `listings` 테이블 활용
- `source` 컬럼에 `'extension_passive'` 값 추가 (열거형 아닌 text 컬럼이므로 바로 사용 가능)

## 6. 데이터 흐름

```
오퍼레이터 아마존 브라우징
  → Content Script: DOM 파싱 (텍스트만)
  → Service Worker: 로컬 큐 저장 + 중복 체크
  → 10건 또는 5분 도달
  → POST /api/ext/passive-collect (배치)
  → listings 테이블 저장 (source: 'extension_passive')
  → 의심 리스팅 → AI 분석 자동 트리거
```

## 7. 의존성

| 의존 항목 | 상태 | 비고 |
|-----------|------|------|
| Extension Content Script | ✅ 구현됨 | parser.ts 재활용 |
| Extension Auth | ✅ 구현됨 | Google OAuth + 토큰 |
| listings 테이블 | ✅ 존재 | source 컬럼 활용 |
| checkSuspectListing | ✅ 구현됨 | 서버 사이드 필터링 |
| AI 분석 파이프라인 | ✅ 구현됨 | fire-and-forget 트리거 |

## 8. 구현 우선순위

| 순서 | 항목 | 복잡도 | 필수 여부 |
|------|------|--------|-----------|
| 1 | F1: Content Script 패시브 수집 | Low | 필수 |
| 2 | F3: 로컬 중복 필터링 | Low | 필수 |
| 3 | F2: Service Worker 배치 큐 + 전송 | Medium | 필수 |
| 4 | F4: 서버 배치 수신 API | Low | 필수 |
| 5 | F5: 검색 결과 페이지 수집 | Medium | 필수 |

## 9. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| chrome.storage.local 5MB 제한 | 큐 넘침 | 최대 100건 제한 + FIFO 관리 |
| 네트워크 오프라인 | 전송 실패 | 로컬 큐에 유지, 온라인 복귀 시 재시도 |
| 대량 중복 데이터 | DB 부하 | 로컬 24시간 중복 필터 + 서버 UPSERT |
| 서비스 워커 비활성화 | 배치 누락 | chrome.alarms API로 주기적 깨우기 |

## 10. 예상 작업량

- Extension 변경: ~200줄 (Content Script + Service Worker + 타입 + 설정)
- 서버 API: ~80줄 (배치 수신 + 검증 + 저장)
- 총 예상: **~300줄**, 복잡도 Low-Medium
