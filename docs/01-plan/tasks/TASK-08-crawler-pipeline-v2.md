# TASK-08: 크롤러 파이프라인 V2 — 1차 스캔 + AI 연결

## 상태: TODO
## 우선순위: Critical
## 예상 난이도: High
## 담당: Developer C (크롤러 전문)

---

## 배경

현재 크롤러는 리스팅을 수집해서 listings 테이블에 저장만 하고 있음.
AI 위반 분석이 연결되지 않아 리포트가 자동 생성되지 않음.
이번 작업으로 크롤러 → AI 분석 → 리포트 자동 생성 파이프라인을 완성함.

## 핵심 변경: 파이프라인 재설계

### 현재 (V1)
```
키워드 검색 → 결과 20개 → 전부 상세 진입 → 전부 서버 전송 → listings 저장 (끝)
```

### 변경 후 (V2)
```
키워드 검색 → 결과 20개
  → 1차 스캔 (검색 결과 페이지에서, 상세 진입 X)
    ① 베리에이션 7개 이상 → V10 의심
    ② 제목 키워드 필터 → V01, V06 등 의심
    ③ 썸네일 AI 비전 스캔 (Haiku) → V08 의심
  → 의심 건만 상세 진입
    → 데이터 수집 + 스크린샷 캡처
    → AI 2차 분석 (Haiku) → 위반 판정
  → 위반 건만 서버 전송
    → listings 저장 + 스크린샷 Storage 저장
    → AI 정밀 분석 (Sonnet) + 드래프트 생성
    → reports 테이블 draft로 생성
    → 리포트 큐에 자동 표시
```

## 구현 상세

### Phase 1: 검색 결과 1차 스캔 (크롤러)

#### 1-1. 베리에이션 개수 파싱

검색 결과 페이지에서 각 리스팅의 베리에이션 개수를 추출하는 셀렉터 추가.

```typescript
// 검색 결과 아이템에서 variation 정보 추출
type SearchResultItem = {
  asin: string
  title: string
  price: number | null
  thumbnailUrl: string
  variationCount: number  // 신규 필드
  brand: string | null
  sellerName: string | null
}
```

#### 1-2. 키워드 필터

기존 `src/lib/utils/suspect-filter.ts`의 로직을 크롤러에도 적용.
- 제목에서 금지 키워드 체크
- Spigen 자사 제품 필터링 (isSpigen → 스킵)

#### 1-3. 썸네일 AI 비전 스캔 (선택적)

검색 결과 페이지 전체 스크린샷 1장을 Haiku에 전송.
- 메인 이미지 위반 탐지: 텍스트 삽입, 비순백 배경, 배지/워터마크
- 20개 썸네일을 한번에 분석 → 비용 효율적

```typescript
// Haiku 프롬프트 예시
"Analyze these Amazon search result thumbnails.
For each product, check if the main image violates Amazon's image policy:
- Text overlay on product image
- Non-white background
- Badges, watermarks, or promotional text
- Lifestyle image as main image
Return the ASIN of any violating products."
```

### Phase 2: 의심 건 상세 진입 (크롤러)

1차 스캔에서 의심으로 분류된 ASIN만 상세 페이지 진입:
- 자연스러운 클릭 네비게이션 유지 (봇 탐지 방지)
- 상세 페이지에서 전체 데이터 수집:
  - bullet_points, description (V01, V14 탐지용)
  - 모든 이미지 (V08 탐지용)
  - 베리에이션 상세 (V10 탐지용 — 각 베리에이션의 모델명/호환기기)
  - seller_name, brand (필수)
  - rating, review_count
- 스크린샷 캡처 (전체 페이지)

### Phase 3: AI 2차 분석 (크롤러 내 Haiku)

상세 데이터 + 스크린샷으로 Haiku 위반 판정:

```typescript
type CrawlerAiResult = {
  is_violation: boolean
  violation_types: ViolationCode[]  // V01, V08, V10 등
  confidence: number                // 0~100
  reasons: string[]
  evidence_summary: string
}
```

- confidence < 30 → 버림
- confidence >= 30 → 서버 전송 대상

### Phase 4: 위반 건 서버 전송

기존 `/api/crawler/listings/batch` 엔드포인트 활용하되:
- `is_suspect: true` 고정 (이미 크롤러에서 판정 완료)
- `suspect_reasons` 포함
- `screenshot_base64` 포함
- 크롤러 Haiku 분석 결과 포함 (`crawler_ai_result`)

### Phase 5: 서버 측 처리 (웹)

#### 5-1. listings 저장 + 스크린샷 Storage 업로드

```
/api/crawler/listings/batch
  → listings INSERT
  → screenshot_base64 → Supabase Storage 업로드 → URL 획득
  → listings.screenshot_url 업데이트
```

#### 5-2. AI 정밀 분석 + 드래프트 자동 생성

기존 `job-processor.ts` 파이프라인 활용:
- Sonnet으로 정밀 분석 (크롤러 Haiku 결과 참고)
- 드래프트 자동 생성 (draft_title, draft_body, draft_evidence)
- reports 테이블 INSERT (status: 'draft')
- Google Chat 알림

### Phase 6: 비위반 리스팅 처리

- 1차 스캔 통과 못한 리스팅: **저장 안 함** (서버 전송 X)
- 2차 AI 분석에서 비위반 판정: **저장 안 함** (서버 전송 X)
- DB에는 위반 의심/확정 건만 존재

## 위반 탐지 대상 (7개 유형)

| 코드 | 위반 유형 | 1차 스캔 탐지 | 2차 상세 탐지 |
|------|---------|-------------|-------------|
| V01 | Trademark Infringement | 제목 키워드 | bullet_points, description |
| V04 | Counterfeit Product | 브랜드/셀러 | 이미지 + 상세 분석 |
| V08 | Image Policy Violation | 썸네일 AI 비전 | 전체 이미지 분석 |
| V10 | Variation Policy Violation | 베리에이션 >= 7개 | 베리에이션 상세 비교 |
| V11 | Review Manipulation | — | 리뷰 패턴 분석 |
| V14 | Resale Violation | — | description 분석 |
| V15 | Bundling Violation | — | 번들 구성 확인 |

## 환경 설정

크롤러(Railway)에 이미 `ANTHROPIC_API_KEY` 환경변수 존재 ✅
- Haiku 모델 사용: `claude-haiku-4-5-20251001`
- 비용: 리스팅당 ~$0.003 (텍스트) + ~$0.01 (이미지 포함)

## 수정 파일

### 크롤러 (crawler/)
1. `crawler/src/scraper/` — 검색 결과 파싱에 variationCount 추가
2. `crawler/src/scheduler/jobs.ts` — 1차 스캔 로직 추가, 의심 건만 상세 진입
3. 신규: `crawler/src/ai/` — Haiku 분석 호출 모듈
4. `crawler/package.json` — @anthropic-ai/sdk 의존성 추가 (없으면)

### 웹 (src/)
5. `src/app/api/crawler/listings/batch/route.ts` — 스크린샷 Storage 업로드 추가
6. `src/lib/ai/job-processor.ts` — 크롤러 AI 결과 참고 로직 추가
7. `src/lib/ai/analyze.ts` — 크롤러 사전 분석 결과 활용

## 테스트

- [ ] 검색 결과에서 베리에이션 개수 정상 파싱
- [ ] 베리에이션 7개 이상 리스팅만 상세 진입
- [ ] 키워드 필터 정상 동작
- [ ] 썸네일 AI 스캔 정상 (선택적)
- [ ] 위반 건만 서버 전송
- [ ] 스크린샷 Supabase Storage 저장
- [ ] AI 정밀 분석 후 리포트 draft 자동 생성
- [ ] 리포트 큐에서 자동 생성된 리포트 확인
- [ ] 비위반 리스팅은 DB에 없음
