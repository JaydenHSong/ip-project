# Crawler 실제 엔진 Planning Document

> **Summary**: Playwright 기반 아마존 리스팅 크롤러 — 캠페인 연동 + Supabase 저장 + BullMQ 스케줄링
>
> **Project**: Sentinel
> **Author**: Claude (PDCA)
> **Date**: 2026-03-02
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

Sentinel Web의 캠페인(keyword + marketplace + frequency)을 기반으로 아마존 리스팅을 **실제로 크롤링**하여 Supabase `listings` 테이블에 저장하는 엔진을 구축한다. 현재 Web UI(캠페인/대시보드/신고 대기열)는 완성되어 있지만, **실제 데이터를 수집하는 크롤러가 없어** 모든 게 Demo 데이터에 의존하고 있다.

### 1.2 Background

- **F01~F05** (Crawler 기능): 기획 완료, 구현 미착수
- 프로젝트 구조상 `crawler/` 별도 패키지로 분리 (CLAUDE.md)
- DB 스키마 이미 준비됨: `campaigns`, `listings`, `campaign_listings` 테이블
- 배포 대상: AWS/Railway (Vercel이 아닌 별도 서버)

### 1.3 Related Documents

- `Sentinel_Project_Context.md` — F01~F05, Crawler 상세 (925행), Anti-bot (1268행)
- `supabase/migrations/001_initial_schema.sql` — listings/campaigns/campaign_listings 테이블
- `CLAUDE.md` — crawler/ 폴더 구조 정의

---

## 2. Scope

### 2.1 In Scope (Phase 1+2)

- [x] **Phase 1 — PoC**: Playwright로 아마존 검색 결과 페이지 파싱
- [x] **Phase 1 — PoC**: 리스팅 상세 페이지에서 전체 데이터 추출
- [x] **Phase 1 — PoC**: 기본 Anti-bot 회피 (랜덤 딜레이, User-Agent 로테이션)
- [x] **Phase 2 — 엔진**: 캠페인 DB 연동 (active 캠페인 조회 → 크롤 실행)
- [x] **Phase 2 — 엔진**: Supabase `listings` + `campaign_listings`에 크롤 결과 저장
- [x] **Phase 2 — 엔진**: BullMQ 기반 잡 스케줄링 (daily/every_12h/every_6h)
- [x] **Phase 2 — 엔진**: 중복 방지 (ASIN + marketplace + 날짜 unique index 활용)
- [x] **Phase 2 — 엔진**: 의심 리스팅 자동 플래그 (keyword 기반 suspect_reasons)
- [x] **Phase 2 — 엔진**: 프록시 환경변수 준비 (실제 프록시 연동은 Optional)
- [x] **Phase 2 — 엔진**: US 마켓플레이스 (amazon.com) 지원
- [x] **Phase 2 — 엔진**: 상세 페이지 증거 스크린샷 캡처 (1280x800) + Supabase Storage 저장

### 2.2 Out of Scope (향후)

- 프록시 로테이션 엔진 (Bright Data/Oxylabs 실 연동)
- Fingerprint 랜덤화 (canvas, WebGL, 폰트 등)
- 마우스 무브먼트 / 스크롤 패턴 모방
- 다국가 마켓플레이스 (UK, JP 등) — F04b
- 팔로업 재방문 크롤링 (F19/F35 — 이미 Web에서 Mock 구현)
- CAPTCHA 자동 해결
- Docker 컨테이너화 / Railway 배포

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status | Feature |
|----|-------------|----------|--------|---------|
| FR-01 | 아마존 키워드 검색 결과에서 ASIN 목록 추출 (1~5 페이지) | High | Pending | F01 |
| FR-02 | 각 ASIN의 상세 페이지에서 전체 데이터 수집 | High | Pending | F02 |
| FR-03 | 랜덤 딜레이 + User-Agent 로테이션 (기본 Anti-bot) | High | Pending | F03 |
| FR-04 | amazon.com (US) 마켓플레이스 파싱 | High | Pending | F04a |
| FR-05 | active 캠페인 조회 → 크롤 작업 자동 생성 | High | Pending | F05 |
| FR-06 | 크롤 결과를 Supabase `listings` 테이블에 저장 | High | Pending | F01 |
| FR-07 | `campaign_listings` 연결 테이블에 페이지/위치 기록 | Medium | Pending | F01 |
| FR-08 | ASIN + marketplace + 날짜 기준 중복 방지 | High | Pending | F26 |
| FR-09 | Spigen 상표 키워드 매칭으로 `is_suspect` + `suspect_reasons` 자동 세팅 | Medium | Pending | F32 |
| FR-10 | BullMQ로 캠페인별 스케줄 잡 등록 (daily/12h/6h) | Medium | Pending | F05 |
| FR-11 | 프록시 환경변수 지원 (PROXY_URL 설정 시 사용) | Low | Pending | F03 |
| FR-12 | 크롤 실패 시 로그 + 재시도 (최대 3회, exponential backoff) | Medium | Pending | F28 |
| FR-13 | 상세 페이지 크롤 시 증거 스크린샷 캡처 (1280x800) → Supabase Storage `screenshots/{asin}/{timestamp}.png` 저장 | High | Pending | F02 |

### 3.2 Non-Functional Requirements

| Category | Criteria |
|----------|----------|
| Performance | 페이지당 3~8초 랜덤 딜레이 (탐지 회피) |
| Reliability | 3회 재시도 후 실패 시 에러 로그 기록 |
| Security | Supabase Service Role Key 사용 (서버 환경변수) |
| Scalability | 캠페인 동시 실행은 1개 (초기), 향후 병렬화 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] `npx tsx crawler/src/index.ts` 로 크롤러 실행 가능
- [ ] active 캠페인의 키워드로 아마존 검색 → 리스팅 수집 → DB 저장
- [ ] Sentinel Web 신고 대기열에서 크롤러 수집 리스팅 표시
- [ ] 중복 ASIN 재수집 시 에러 없이 스킵
- [ ] Spigen 관련 키워드가 포함된 리스팅에 suspect 플래그
- [ ] 각 리스팅 상세 페이지 증거 스크린샷이 Supabase Storage에 저장됨

### 4.2 Quality Criteria

- [ ] TypeScript strict 모드 (`tsconfig.json`)
- [ ] 에러 핸들링: Playwright 타임아웃, 네트워크 오류, 파싱 실패
- [ ] 환경변수 누락 시 명확한 에러 메시지

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 아마존 Bot 탐지 → IP 차단 | High | High | 랜덤 딜레이 3~8초, User-Agent 로테이션, 프록시 환경변수 준비 |
| 아마존 페이지 구조 변경 | High | Medium | 셀렉터를 상수로 분리, 파싱 실패 시 로그 + 스킵 |
| Playwright 메모리 누수 | Medium | Medium | 페이지별 browser context 생성/종료 |
| 법적 리스크 (ToS 위반) | High | Low | 사내 전용 + 브랜드 보호 목적 + 법무 확인 필요 |

---

## 6. Architecture Considerations

### 6.1 패키지 구조

```
crawler/
├── package.json              ← 별도 패키지 (pnpm workspace)
├── tsconfig.json
├── .env.example
└── src/
    ├── index.ts              ← 엔트리포인트 (캠페인 기반 크롤 실행)
    ├── config.ts             ← 환경변수 로딩
    ├── scraper/
    │   ├── search.ts         ← 아마존 검색 결과 파싱
    │   ├── detail.ts         ← 상세 페이지 파싱
    │   └── selectors.ts      ← CSS 셀렉터 상수
    ├── anti-bot/
    │   ├── delay.ts          ← 랜덤 딜레이
    │   ├── user-agents.ts    ← UA 로테이션 리스트
    │   └── proxy.ts          ← 프록시 설정 (환경변수 기반)
    ├── scheduler/
    │   └── queue.ts          ← BullMQ 잡 정의 + 워커
    ├── db/
    │   ├── client.ts         ← Supabase 서버 클라이언트
    │   ├── campaigns.ts      ← active 캠페인 조회
    │   ├── listings.ts       ← 리스팅 upsert + campaign_listings 연결
    │   └── storage.ts        ← 스크린샷 Supabase Storage 업로드
    └── suspect/
        └── flag.ts           ← 의심 키워드 매칭 로직
```

### 6.2 기술 스택

| 영역 | 기술 | 이유 |
|------|------|------|
| 브라우저 자동화 | Playwright | Anti-bot 회피, 다중 브라우저, 스크린샷 |
| 작업 큐 | BullMQ + Redis | 스케줄링, 재시도, 동시성 제어 |
| DB 클라이언트 | @supabase/supabase-js | 기존 스키마 활용 |
| 런타임 | Node.js + tsx | TypeScript 직접 실행 |

### 6.3 환경변수

```env
# 필수
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# 선택 (BullMQ)
REDIS_URL=redis://localhost:6379

# 선택 (프록시)
PROXY_URL=http://user:pass@proxy.brightdata.com:22225
```

---

## 7. 수집 데이터 매핑

### 7.1 아마존 페이지 → listings 테이블

| listings 컬럼 | 아마존 소스 | 파싱 방법 |
|--------------|-----------|----------|
| asin | URL 경로 `/dp/{ASIN}` | 정규식 |
| marketplace | 캠페인 설정값 | 그대로 전달 |
| title | `#productTitle` | innerText |
| description | `#productDescription` | innerText |
| bullet_points | `#feature-bullets li` | 배열 |
| images | `#imgTagWrapperId img` | src 속성 |
| price_amount | `.a-price .a-offscreen` | 파싱 |
| price_currency | 고정 (US=USD) | 마켓플레이스별 |
| seller_name | `#sellerProfileTriggerId` | innerText |
| seller_id | 셀러 링크 URL 파라미터 | 정규식 |
| brand | `#bylineInfo` | innerText |
| rating | `#acrPopover` | 파싱 |
| review_count | `#acrCustomerReviewText` | 파싱 |
| source | 고정 `'crawler'` | — |
| source_campaign_id | 캠페인 ID | 그대로 전달 |
| raw_data | 전체 파싱 결과 JSON | 원본 보존 |
| screenshot_url | Supabase Storage URL | `page.screenshot()` → Storage upload |

### 7.2 의심 플래그 키워드

```typescript
const SUSPECT_KEYWORDS = [
  'spigen', 'tough armor', 'slim armor', 'ultra hybrid',
  'liquid air', 'rugged armor', 'thin fit', 'neo hybrid',
]

// suspect_reasons 예시:
// ['trademark_in_title', 'price_undercut', 'design_copy']
```

---

## 8. Implementation Estimate

| 항목 | 복잡도 |
|------|--------|
| Playwright 설치 + 프로젝트 세팅 | Low |
| 검색 결과 파서 (search.ts) | Medium |
| 상세 페이지 파서 (detail.ts) | Medium |
| Anti-bot 기본 (딜레이 + UA) | Low |
| Supabase 저장 로직 | Low |
| 의심 플래그 로직 | Low |
| BullMQ 스케줄러 | Medium |
| 캠페인 연동 (메인 루프) | Medium |
| 증거 스크린샷 캡처 + Storage 업로드 | Low |
| **전체** | **Medium~High** |

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`/pdca design crawler-engine`)
2. [ ] 구현 시작
3. [ ] PoC 검증 (단일 키워드 크롤링 → DB 저장)
4. [ ] Gap 분석

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-02 | Initial draft — Phase 1+2 scope | Claude (PDCA) |
| 0.2 | 2026-03-02 | FR-13 증거 스크린샷 캡처 추가, Storage 업로드 구조 추가 | Claude (PDCA) |
