# Crawler Persona System

## Problem

### 1. Hardcoded Persona Profiles = Detectable Patterns

현재 `persona.ts`는 8개 타이핑 x 7개 스크롤 x 6개 클릭 x 6개 체류 x 7개 네비게이션 = 14,112개 조합을 가지지만,
각 프로파일 자체가 **고정 값**이다. `TYPING_SLOW`는 항상 `charDelayMin: 180, charDelayMax: 450`이다.

아마존은 **행동 핑거프린트**를 추적한다. 같은 프록시 IP가 아니더라도,
"어? 이 유저 typing 180-450ms, scroll 40-100px로 움직이는데, 3일 전에도 똑같은 패턴이 있었는데?" → 봇 탐지.

**핵심 문제**: 프로파일을 "고르는" 것이 아니라, **범위에서 매번 새로운 값을 생성**해야 한다.

### 2. Campaign 결과 데이터 미축적

캠페인을 돌리는 목적은 경쟁사 리스팅의 **정책 위반 탐지**인데,
현재 캠페인 테이블에는 크롤링 결과(성공/실패, 발견 건수, 마지막 크롤링 시각)가 저장되지 않는다.

### 3. 무차별 크롤링 → 품질 저하

모든 검색 결과를 순서대로 클릭하는 것은:
- 아마존에게 봇으로 보임 (1번부터 차례로 내려가는 사람은 없다)
- 우리 브랜드(Spigen) 제품도 크롤링해서 시간 낭비
- 위반 가능성 없는 제품도 동일하게 시간 소비

### 4. 크롤러 수집 품질 = 리포트 품질

크롤러의 최종 목적은 **아마존 Seller Central에 신고할 리포트 드래프트**를 만드는 것이다.
리스팅 수집은 수단이지 목적이 아니다.

리포트 포맷에 맞지 않으면 신고 자체가 불가능하므로, 크롤러는 리포트에 필요한 필드를 **빠짐없이** 수집해야 한다.

**리포트 드래프트에 필수인 Listing 필드:**
| 필드 | 리포트 용도 | 수집 실패 시 |
|------|-----------|------------|
| title | 신고 대상 식별 | 리포트 생성 불가 |
| seller_name | 위반자 특정 | 리포트 생성 불가 |
| brand | 브랜드 사칭/상표 침해 판단 | V10, V11 탐지 불가 |
| bullet_points | V01(키워드스터핑), V14(금지주장) | 텍스트 위반 탐지 불가 |
| images + screenshot | V08(이미지조작), SC 증거 첨부 | 이미지 위반 탐지 불가, 증거 부족 |
| price_amount | 가격 비교, 위조품 의심 | 보조 지표 누락 |
| rating, review_count | V15(리뷰조작) | 리뷰 위반 탐지 불가 |
| seller_id | V17(하이재킹) ASIN+seller 대조 | 하이재킹 탐지 불가 |

**SC 신고 포맷 (ScSubmitData):**
```
asin, violation_type_sc, description, evidence_urls, marketplace, sc_rav_url
```
→ 이 중 description은 AI가 작성, evidence_urls는 screenshot에서 생성.

## Goal

1. **Dynamic Persona Generation**: 고정 프로파일 대신 범위 기반으로 매 세션 유니크한 "사람" 생성
2. **AI Persona Evolution**: 성공한 페르소나의 범위를 학습하여 다음 세대 페르소나에 반영
3. **Campaign Result Tracking**: 크롤링 결과를 캠페인에 축적
4. **Smart Crawling Strategy**: AI가 검색 결과에서 위반 의심 리스팅을 선별, 랜덤 순서로 클릭

## Scope

### In Scope

- 동적 페르소나 생성기 (범위 → 랜덤 값 매번 생성)
- AI 주간 학습 파이프라인 (성공 페르소나 분석 → 범위 조정)
- 캠페인 결과 컬럼 정의 및 API 연동
- 스마트 클릭 전략 (AI 선별 + 랜덤 순서 + innocent 혼합)
- Spigen 자사 제품 스킵 로직
- 위반 탐지 대상 정의 (V01, V08, V10, V11, V14, V15, V17)

### Out of Scope

- AI 위반 판단 (별도 피처: 크롤링 후 AI 분석 파이프라인)
- Seller Central 자동 신고
- 크롤러 인프라 스케일링 (다중 인스턴스)
- Extension 연동

## Violation Scope

캠페인 크롤링으로 탐지 가능한 위반 유형 (V01~V19 중 7개):

| Code | Name | Detection Method |
|------|------|-----------------|
| V01 | Keyword Stuffing | 제목/bullet에 과도한 키워드 반복 → 텍스트 분석 |
| V08 | Image Manipulation | 상품과 무관한 이미지, 텍스트 오버레이 → AI 이미지 분석 |
| V10 | Counterfeit/Knockoff | 브랜드 사칭, 유사 로고 → 이미지 + 텍스트 분석 |
| V11 | Trademark Infringement | 상표 무단 사용 → 특허 레지스트리 대조 |
| V14 | Prohibited Claims | 금지된 의료/안전 주장 → 텍스트 분석 |
| V15 | Review Manipulation | 비정상 리뷰 패턴 → 리뷰 수/평점 분석 |
| V17 | Listing Hijacking | 다른 셀러가 우리 리스팅에 올라탐 → ASIN + seller 대조 |

**자사 제품 판별 기준**: seller_name 또는 brand에 "Spigen" 포함 시 스킵.

## Architecture

### 1. Dynamic Persona Generator (v2)

현재 방식 (v1):
```
고정 프로파일 8개 중 택 1 → 같은 프로파일은 항상 같은 값
```

새 방식 (v2):
```
범위(range) 정의 → 매 세션마다 범위 안에서 완전 새로운 값 생성
→ 세상에 같은 페르소나 두 번 없음
```

**Range 구조 예시** (타이핑):
```typescript
type TypingRange = {
  charDelayMin: [50, 600]     // min값의 범위
  charDelayMax: [100, 800]    // max값의 범위
  pauseProbability: [0.02, 0.25]
  pauseDurationMin: [100, 1000]
  pauseDurationMax: [400, 2500]
  typoProbability: [0.01, 0.15]
}
```

생성 시 각 필드에서 랜덤 값을 뽑되, min < max 제약을 유지한다.
결과적으로 매 세션마다 **수학적으로 무한한** 유니크 페르소나가 탄생한다.

### 2. AI Persona Evolution Pipeline

```
크롤러 실행
  → 성공/실패 로그 + 페르소나 config를 crawler_logs에 저장 (현재 구현됨)
  → 주 1회 /api/ai/learn-crawler 호출
  → Claude가 성공 케이스의 페르소나 범위 분석
  → "이 범위에서 성공률 높다" → persona_ranges 테이블에 저장
  → 다음 세대 페르소나 생성 시 성공 범위를 우선 사용 (±10~20% 확장)
```

**학습 사이클**:
1. 초기: 전체 범위에서 균등 랜덤 생성 (탐색 exploration)
2. 2주차~: 성공 범위 60% + 탐색 범위 40% (exploitation + exploration)
3. 4주차~: 성공 범위 70% + 탐색 범위 30% (수렴)
4. 지속: 아마존이 패턴 변경하면 다시 탐색 비율 올림

**빈도**: 초기 주 1회, 안정화 후 조정 가능 (데이터 쌓이는 속도에 따라 판단).

### 3. Campaign Result Tracking

campaigns 테이블에 축적할 데이터:

| Column | Type | Description |
|--------|------|-------------|
| last_crawled_at | timestamptz | 마지막 크롤링 완료 시각 |
| total_listings | integer | 누적 발견 리스팅 수 |
| total_sent | integer | 누적 전송 리스팅 수 |
| total_violations | integer | 누적 위반 의심 건수 |
| success_rate | numeric | 최근 10회 성공률 |
| last_result | jsonb | 마지막 크롤링 결과 상세 |

**last_result JSON 구조**:
```json
{
  "found": 15,
  "sent": 12,
  "duplicates": 3,
  "errors": 0,
  "persona": "dynamic_7a3f",
  "duration_ms": 45000,
  "pages_crawled": 3,
  "violations_suspected": 2,
  "completed_at": "2026-03-05T12:00:00Z"
}
```

**업데이트 시점**: 크롤러 잡 완료 후 `sentinelClient.updateCampaignResult()` 호출.

### 4. Smart Crawling Strategy

```
검색 결과 페이지 로드
  |
  v
[Phase 1] 검색 결과 전체 ASIN + 제목 + 셀러 스캔 (DOM 파싱)
  |
  v
[Phase 2] Spigen 자사 제품 필터링
  - seller_name에 "Spigen" 포함 → skip 리스트
  - brand에 "Spigen" 포함 → skip 리스트
  |
  v
[Phase 3] AI 위반 의심도 판단 (선택, Phase 2 이후)
  - Claude에게 검색 결과 제목/가격 목록 전달
  - "이 중 위반 의심 제품 우선순위 매겨줘"
  - 높음/중간/낮음 분류
  |
  v
[Phase 4] 클릭 순서 결정
  - 의심 높음 3~5개 + 의심 없음 2~3개 = 5~8개 선택
  - 순서를 셔플 (1번부터 순서대로 X)
  - 페르소나의 productsToViewPerPage에 맞춰 조정
  |
  v
[Phase 5] 상세 페이지 방문 + 스크래핑
  - innocent 제품도 동일하게 체류/스크롤 (위장용)
  - 위반 의심 제품: 상세 데이터 저장 → 추후 AI 분석
  - innocent 제품: 데이터 저장하되 priority 낮게 마킹
```

**왜 innocent도 클릭하나?**: 위반 의심 제품"만" 클릭하면 아마존이 패턴 감지.
정상 쇼핑객처럼 관심 있는 것도 보고, 안 관심인 것도 가끔 보는 게 자연스럽다.

## Implementation Order

### Phase 1: Dynamic Persona Generator (v2)
1. `persona.ts` 전면 리팩토링 → range 기반 생성기
2. 기존 타입 유지 (`CrawlPersona`, `TypingProfile` 등)
3. `generatePersona()` 시그니처 동일, 내부만 변경

### Phase 2: Campaign Result API
1. DB 마이그레이션 (campaigns 테이블 컬럼 추가 — 014 마이그레이션에 일부 포함)
2. `sentinelClient.updateCampaignResult()` 메서드 추가
3. `jobs.ts` 완료 시점에 호출

### Phase 3: Spigen Self-Product Detection
1. 검색 결과 파싱 시 seller/brand 필드 추출
2. "Spigen" 매칭 로직 (대소문자 무시, 부분 매칭)
3. skip 처리 + 로그 기록

### Phase 4: Smart Click Strategy
1. 검색 결과에서 전체 리스팅 리스트 추출
2. Spigen 필터링
3. 랜덤 셔플 + innocent 혼합
4. (선택) AI 위반 의심도 판단 추가

### Phase 5: AI Persona Evolution
1. 성공 페르소나 config 로그에서 범위 추출
2. `ai_learning_records`에 추천 범위 저장
3. `generatePersona()` 에서 성공 범위 우선 사용 로직
4. `/api/ai/learn-crawler` 프롬프트에 범위 추천 추가

## DB Changes

### 이미 마이그레이션 작성됨 (014_ai_learning_records.sql)
- `ai_learning_records` 테이블 (AI 학습 결과 저장)
- `campaigns.last_crawled_at`, `campaigns.total_listings`, `campaigns.last_result`
- frequency 제약 조건 업데이트

### 추가 필요
- `campaigns.total_sent` (integer, default 0)
- `campaigns.total_violations` (integer, default 0)
- `campaigns.success_rate` (numeric, default 0)
- `persona_ranges` 테이블 or `ai_learning_records.metrics`에 포함 (결정 필요)

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `crawler/src/anti-bot/persona.ts` | Rewrite | 고정 프로파일 → range 기반 동적 생성 |
| `crawler/src/anti-bot/persona-ranges.ts` | Create | 기본 범위 정의 + 성공 범위 로드 |
| `crawler/src/scheduler/jobs.ts` | Modify | Spigen 필터 + 스마트 클릭 + 캠페인 결과 업데이트 |
| `crawler/src/api/sentinel-client.ts` | Modify | `updateCampaignResult()` 메서드 추가 |
| `crawler/src/scraper/search-page.ts` | Modify | seller/brand 추출 강화 |
| `src/app/api/ai/learn-crawler/route.ts` | Modify | 페르소나 범위 추천 프롬프트 추가 |
| `src/app/api/campaigns/[id]/result/route.ts` | Create | 크롤러 → 캠페인 결과 업데이트 API |
| `supabase/migrations/015_campaign_results.sql` | Create | 캠페인 추가 컬럼 |

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|------------|
| 봇 탐지 회피율 | > 80% (현재 73%) | 성공 크롤링 / 전체 시도 |
| 페르소나 유니크성 | 100% (같은 config 재사용 0건) | 로그 분석 |
| 캠페인 결과 축적 | 100% | 크롤링 완료 시 campaigns 업데이트 확인 |
| Spigen 자사 제품 스킵 | 100% | 자사 리스팅 0건 전송 |
| AI 학습 사이클 | 주 1회 정상 실행 | ai_learning_records 주간 레코드 확인 |
| **수집 품질 (리포트 필수 필드)** | | |
| title 완성도 | > 99% | null 비율 모니터링 |
| seller_name 완성도 | > 95% | AI fallback 포함 |
| brand 완성도 | > 90% | AI fallback 포함 |
| screenshot 완성도 | > 99% | 캡처 실패율 |
| bullet_points 완성도 | > 85% | 빈 배열 비율 |

## Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| 동적 범위가 비현실적 값 생성 | 봇 탐지 | min < max 제약 + 범위 상한/하한 설정 |
| AI 학습 수렴이 아마존 패턴 변경과 충돌 | 성공률 급락 | exploration 비율 항상 30% 이상 유지 |
| 캠페인 결과 API 인증 | 보안 | SERVICE_TOKEN 기반 인증 (기존 패턴) |
| Spigen 매칭 false positive | 정상 제품 스킵 | "Spigen" exact match (대소문자 무시) |
| AI 위반 의심도 판단 비용 | 비용 증가 | Phase 4는 선택 사항, 먼저 Phase 1~3 안정화 |

## Dependencies

- `014_ai_learning_records.sql` 마이그레이션 적용 (Supabase SQL Editor)
- `@anthropic-ai/sdk` (crawler에 이미 설치됨)
- `ANTHROPIC_API_KEY` (Railway에 이미 설정됨)

## Timeline Estimate

Phase 1~3 우선 구현 후 Phase 4~5 순차 진행. 배포 단위:
1. Phase 1 (persona v2) → 단독 배포 가능
2. Phase 2 (campaign result) → DB 마이그레이션 선행 필요
3. Phase 3 (Spigen skip) → Phase 1과 동시 가능
4. Phase 4 (smart click) → Phase 3 의존
5. Phase 5 (AI evolution) → 데이터 축적 2주 후 시작
