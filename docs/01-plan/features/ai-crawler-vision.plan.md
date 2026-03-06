# AI-Assisted Crawler Vision

## Problem

현재 크롤러는 하드코딩된 CSS 셀렉터(`#productTitle`, `.a-price` 등)에 100% 의존한다.
- 아마존이 HTML 구조를 바꾸면 전체 크롤링이 깨진다
- 셀렉터가 못 찾으면 null 반환하고 끝 — 판단하는 주체가 없다
- 스크린샷은 찍지만 아무도 보지 않는다
- CAPTCHA 외의 차단 유형(봇 감지 페이지, 리다이렉트, 빈 페이지)을 모른다
- AI 엔진(Claude)이 있는데 크롤링 과정에서 전혀 활용하지 않는다

## Problem 2: 비현실적 네비게이션

현재 검색 URL(`amazon.com/s?k=keyword`)로 직접 이동한다.
정상 유저는 `amazon.com` 홈 → 검색창 클릭 → 키워드 타이핑 → Enter 순서다.
URL 직접 이동은 아마존 봇 탐지의 대표적 시그널이며, 프록시를 써도 차단 확률이 높다.

## Solution

### 1. Human-like Navigation Flow
검색 URL 직접 이동 대신, 실제 사용자 행동을 시뮬레이션한다.

```
amazon.com 홈 접속
  → 랜덤 딜레이 (1~3초)
  → 검색창 클릭 (#twotabsearchtextbox)
  → 키워드를 사람처럼 한 글자씩 타이핑 (50~150ms 간격)
  → Enter 또는 검색 버튼 클릭
  → 검색 결과 로드 대기
```

### 2. AI Vision Fallback Layer
CSS 셀렉터를 1차 시도로 유지하되, 실패/의심 시 Claude Vision API로 스크린샷을 분석하여 데이터를 추출한다.

## Architecture

### Navigation Flow (검색)
```
amazon.com 홈 접속
  → AI: 스크린샷 → "정상 홈페이지인가?" 판단
  |
  ├─ 정상 → 검색창 셀렉터 시도 (#twotabsearchtextbox)
  |   ├─ 성공 → 마우스 이동 → 클릭 → 한 글자씩 타이핑 → Enter
  |   └─ 실패 → AI: "검색창 어디있어?" → 좌표 반환 → 클릭 + 타이핑
  |
  └─ CAPTCHA/차단 → 프록시 교체 + 재시도

검색 결과 로드
  → [1차] CSS 셀렉터 파싱
  → [2차 fallback] AI Vision 분석

2페이지 이동
  → URL 직접 이동 X
  → 페이지네이션 "Next" 버튼 클릭 (사람처럼)
  → 버튼 못 찾으면 AI가 스크린샷에서 위치 판단
```

### Detail Page Flow (상세)
```
검색 결과에서 상품 클릭 (URL 직접 이동 X, 사람처럼 클릭)
  |
  v
[1차] CSS 셀렉터 파싱 (기존 로직, 빠르고 저렴)
  |
  ├─ 성공 + 데이터 충분 → 완료
  |
  └─ 실패 / 데이터 부족 / 의심 상황
       |
       v
     스크린샷 캡처
       |
       v
     [2차] Claude Vision API 분석 (Haiku: 저비용, 빠름)
       |
       ├─ 정상 상품 페이지 → 구조화 데이터 추출
       ├─ CAPTCHA / 봇 차단 → 프록시 교체 + 재시도
       ├─ 404 / 상품 없음 → 스킵 기록
       └─ 알 수 없는 페이지 → 로그 + 스크린샷 저장 (수동 검토용)
```

## AI 개입 시점 (Trigger Conditions)

| 조건 | 설명 |
|------|------|
| `title === ''` | 상품 제목 추출 실패 |
| `images.length === 0` | 이미지 하나도 못 찾음 |
| `bulletPoints.length === 0 && description === null` | 상품 정보 전무 |
| 페이지 로드 후 `document.body.innerText.length < 200` | 페이지 내용이 비정상적으로 적음 |
| HTTP status !== 200 | 비정상 응답 |
| 검색 결과 0건인데 인기 키워드 | 차단 의심 |

## Claude Vision Prompt (상세 페이지)

```
이 아마존 상품 페이지 스크린샷을 분석해주세요.

1. 이 페이지가 정상 상품 페이지인지, CAPTCHA/봇 차단 페이지인지, 404 페이지인지 판단해주세요.

2. 정상 상품 페이지라면 다음 정보를 JSON으로 추출해주세요:
   - title: 상품명
   - brand: 브랜드명
   - price: 가격 (숫자)
   - currency: 통화
   - seller_name: 판매자명
   - rating: 평점 (숫자)
   - review_count: 리뷰 수 (숫자)
   - bullet_points: 주요 특징 (배열)
   - description_summary: 설명 요약 (200자)

3. 차단 페이지라면:
   - block_type: "captcha" | "bot_detection" | "redirect" | "unknown"
   - recommendation: "retry_proxy" | "retry_delay" | "skip"
```

## Claude Vision Prompt (검색 결과)

```
이 아마존 검색 결과 페이지 스크린샷을 분석해주세요.

1. 페이지 상태: 정상 검색 결과 / 결과 없음 / CAPTCHA / 차단
2. 정상이라면 보이는 상품들의 ASIN, 제목, 가격을 JSON 배열로 추출
3. 스폰서 광고 상품과 일반 상품을 구분
4. 다음 페이지 버튼이 있는지 여부
```

## Cost Estimation

| 모델 | 용도 | 비용/호출 | 예상 빈도 |
|------|------|----------|----------|
| Haiku | 스크린샷 분석 (fallback) | ~$0.001 | 셀렉터 실패 시만 (예상 5~15%) |
| Haiku | 페이지 상태 판단 | ~$0.0005 | 모든 페이지 (옵션) |

초기엔 fallback으로만 쓰고, 안정화 후 모든 페이지에 상태 판단을 추가하는 것을 고려.

## Implementation Plan

### Phase 1: Human-like Navigation + AI Fallback (우선)
1. `scraper/search-page.ts` 수정 — URL 직접 이동 → 홈 접속 + 검색창 타이핑 방식으로 변경
2. `anti-bot/human-behavior.ts` 수정 — 검색창 타이핑, 마우스 이동 시뮬레이션 추가
3. `crawler/src/ai/vision-analyzer.ts` — Claude Vision API 호출 모듈
4. `crawler/src/ai/prompts.ts` — 상세/검색 페이지 분석 프롬프트
5. `scraper/detail-page.ts` 수정 — 셀렉터 실패 시 AI fallback 호출
6. `scraper/search-page.ts` 수정 — 검색 결과 0건 + 차단 의심 시 AI 판단

### Phase 2: 페이지 상태 판단 (선택)
5. 모든 페이지 로드 후 AI로 "정상/차단/에러" 상태 판단
6. CAPTCHA 외 차단 유형 자동 감지 및 대응

### Phase 3: 셀렉터 자동 복구 (미래)
7. AI가 추출한 데이터와 셀렉터 추출 데이터 비교
8. 셀렉터 깨진 패턴 감지 시 알림 + AI 기반 새 셀렉터 추천

## Environment Variables (추가)

```
ANTHROPIC_API_KEY=sk-ant-...        # Claude API key (crawler용)
AI_VISION_ENABLED=true              # AI vision fallback 활성화
AI_VISION_MODEL=claude-haiku-4-5-20251001  # 비용 효율 모델
```

## Success Metrics

- 셀렉터 실패 시 AI fallback 성공률 > 90%
- 차단 감지 정확도 > 95% (CAPTCHA + 봇 차단 + 리다이렉트)
- 크롤링 데이터 수집 완성도: title 99%, images 95%, price 90%
- AI 비용: 캠페인당 $0.05 이하

## Dependencies

- `@anthropic-ai/sdk` (crawler package.json에 추가)
- `ANTHROPIC_API_KEY` 환경변수 (Railway에 추가)

## Risk

- Claude API 장애 시 → 기존 셀렉터 전용 모드로 graceful fallback
- 비용 폭증 방지 → 일일 AI 호출 상한 설정 (예: 500회/일)
- 응답 지연 → Haiku 사용 + timeout 10초, 초과 시 셀렉터 결과 그대로 사용
