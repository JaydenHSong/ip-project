# Crawler Persona System — Design

> Plan: `docs/01-plan/features/crawler-persona.plan.md`

## 1. Dynamic Persona Generator v2

### 1.1 Range Definition

모든 페르소나 파라미터를 `[min, max]` 범위로 정의한다. 생성 시 각 필드는 이 범위 내에서 균등 랜덤 값을 뽑는다.

**File**: `crawler/src/anti-bot/persona-ranges.ts`

```typescript
// 범위 타입: [최솟값, 최댓값]
type Range = [number, number]

type PersonaRanges = {
  typing: {
    charDelayMin: Range      // [50, 600]
    charDelayMax: Range      // [100, 800]
    pauseProbability: Range   // [0.02, 0.25]
    pauseDurationMin: Range   // [100, 1000]
    pauseDurationMax: Range   // [400, 2500]
    typoProbability: Range    // [0.01, 0.15]
  }
  scroll: {
    pixelsPerStepMin: Range   // [30, 600]
    pixelsPerStepMax: Range   // [80, 900]
    stepDelayMin: Range       // [10, 500]
    stepDelayMax: Range       // [40, 2000]
    reverseScrollProbability: Range  // [0.03, 0.25]
  }
  click: {
    preferImage: Range        // [0.15, 0.90]
    skipSponsoredProbability: Range  // [0.30, 0.95]
    hoverBeforeClick: Range   // [0, 1] → > 0.5 = true
    openInNewTab: Range       // [0, 1] → > 0.8 = true (낮은 확률)
  }
  dwell: {
    searchResultDwellMin: Range   // [200, 2000]
    searchResultDwellMax: Range   // [800, 5000]
    detailPageDwellMin: Range     // [1500, 10000]
    detailPageDwellMax: Range     // [4000, 30000]
    browseGallery: Range          // [0, 1] → > 0.5 = true
    scrollToReviews: Range        // [0, 1] → > 0.4 = true
  }
  navigation: {
    homeToSearchDelayMin: Range   // [600, 4000]
    homeToSearchDelayMax: Range   // [1500, 10000]
    searchToClickDelayMin: Range  // [800, 5000]
    searchToClickDelayMax: Range  // [2000, 12000]
    backToNextClickDelayMin: Range // [400, 3000]
    backToNextClickDelayMax: Range // [1200, 8000]
    betweenPagesDelayMin: Range   // [1000, 5000]
    betweenPagesDelayMax: Range   // [2500, 12000]
    productsToViewPerPage: Range  // [2, 10]
    useBackButton: Range          // [0, 1] → > 0.3 = true (대부분 true)
  }
}
```

### 1.2 Default Ranges

**File**: `crawler/src/anti-bot/persona-ranges.ts` (export `DEFAULT_RANGES`)

전체 범위를 커버하는 기본값. AI 학습 전 초기 단계에서 사용.

### 1.3 Persona Generator v2

**File**: `crawler/src/anti-bot/persona.ts` (rewrite)

```typescript
import { DEFAULT_RANGES } from './persona-ranges.js'

// 범위에서 랜덤 값 생성
const randInRange = (range: Range): number => {
  const [min, max] = range
  return min + Math.random() * (max - min)
}

// 범위에서 정수 랜덤 값 생성
const randIntInRange = (range: Range): number => {
  return Math.round(randInRange(range))
}

// boolean 결정 (threshold 기반)
const randBool = (range: Range, threshold: number): boolean => {
  return randInRange(range) > threshold
}

const generatePersona = (
  ranges: PersonaRanges = DEFAULT_RANGES,
  successRanges?: PersonaRanges | null,
): CrawlPersona => {
  // 성공 범위가 있으면 70% 확률로 사용, 30%는 탐색
  const useSuccess = successRanges && Math.random() < 0.7
  const r = useSuccess ? successRanges : ranges

  // 각 필드에서 min < max 보장하며 랜덤 생성
  const charDelayMin = randIntInRange(r.typing.charDelayMin)
  const charDelayMax = Math.max(charDelayMin + 20, randIntInRange(r.typing.charDelayMax))

  // ... 모든 필드 동일 패턴 (min < max 보장)

  return {
    name: `dyn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    typing: { charDelayMin, charDelayMax, ... },
    scroll: { ... },
    click: { ... },
    dwell: { ... },
    navigation: { ... },
  }
}
```

**핵심 규칙**:
- `name`은 `dyn_` + timestamp + 랜덤 suffix → 모든 세션 유니크
- min/max 쌍은 항상 min < max 유지 (최소 gap 보장)
- boolean 필드는 Range [0, 1]에서 뽑은 값과 threshold 비교
- 기존 `CrawlPersona` 타입 시그니처는 변경 없음 → 호출부 수정 불필요

### 1.4 Success Ranges Loading

`generatePersona()` 호출 시 성공 범위를 선택적으로 전달:

```typescript
// jobs.ts에서
const successRanges = await loadSuccessRanges(sentinelClient)
const persona = generatePersona(DEFAULT_RANGES, successRanges)
```

**`loadSuccessRanges()`**: `/api/ai/persona-ranges` 엔드포인트에서 최신 학습 결과 조회.
없으면 null → 전체 범위에서 생성 (exploration mode).

---

## 2. Campaign Result Tracking

### 2.1 DB Schema

**File**: `supabase/migrations/015_campaign_results.sql`

```sql
-- 014에서 이미 추가된 컬럼: last_crawled_at, total_listings, last_result
-- 추가로 필요한 컬럼:
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_sent integer DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_violations integer DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS success_rate numeric DEFAULT 0;

NOTIFY pgrst, 'reload schema';
```

### 2.2 Campaign Result API

**File**: `src/app/api/crawler/campaigns/[id]/result/route.ts`

```typescript
// PATCH /api/crawler/campaigns/:id/result
// Auth: SERVICE_TOKEN (crawler only)
// Body: CampaignResultUpdate
type CampaignResultUpdate = {
  found: number
  sent: number
  duplicates: number
  errors: number
  spigen_skipped: number
  pages_crawled: number
  violations_suspected: number
  duration_ms: number
  persona_name: string
  success: boolean
}
```

**로직**:
1. `last_crawled_at` = now()
2. `total_listings` += found
3. `total_sent` += sent
4. `total_violations` += violations_suspected
5. `last_result` = request body (JSON)
6. `success_rate` = 최근 10회 크롤링 성공률 계산 (crawler_logs에서)

### 2.3 Sentinel Client 변경

**File**: `crawler/src/api/sentinel-client.ts`

```typescript
// 추가 메서드
updateCampaignResult: async (
  campaignId: string,
  result: CampaignResultUpdate,
): Promise<void> => {
  await fetchWithRetry(
    `${baseUrl}/api/crawler/campaigns/${campaignId}/result`,
    { method: 'PATCH', headers, body: JSON.stringify(result) },
  )
}
```

### 2.4 Jobs.ts 호출 시점

`jobs.ts`에서 크롤링 완료 후 (Google Chat 알림 직전):

```typescript
// 캠페인 결과 업데이트
await sentinelClient.updateCampaignResult(campaignId, {
  found: totalFound,
  sent: totalSent,
  duplicates,
  errors,
  spigen_skipped: spigenSkipped,
  pages_crawled: pageNum,
  violations_suspected: 0, // Phase 4에서 추가
  duration_ms: duration,
  persona_name: persona.name,
  success: errors === 0 || totalSent > 0,
})
```

---

## 3. Spigen Self-Product Detection

### 3.1 SearchResult 타입 확장

**File**: `crawler/src/types/index.ts`

```typescript
type SearchResult = {
  asin: string
  title: string
  price: string | null
  imageUrl: string | null
  sponsored: boolean
  pageNumber: number
  positionInPage: number
  // 추가
  sellerName: string | null   // 검색 결과에서 보이는 경우
  brand: string | null         // "by Brand" 텍스트
  isSpigen: boolean            // Spigen 자사 제품 여부
}
```

### 3.2 검색 결과 파싱 강화

**File**: `crawler/src/scraper/search-page.ts`

`scrapeSearchPage()` 내부에서 각 아이템 파싱 시:

```typescript
// brand 추출 (검색 결과 카드에 "by Spigen" 등)
const brandEl = await item.$('.a-size-base-plus, .a-color-base:has-text("by ")')
const brandText = brandEl ? (await brandEl.textContent())?.trim() ?? null : null

// seller 추출 (일부 결과에 표시)
const sellerEl = await item.$('.a-size-small .a-color-secondary')
const sellerText = sellerEl ? (await sellerEl.textContent())?.trim() ?? null : null

// Spigen 판별
const isSpigen = isSpigenProduct(title, brandText, sellerText)
```

### 3.3 Spigen 판별 함수

**File**: `crawler/src/anti-bot/persona-ranges.ts` (or utils)

```typescript
const SPIGEN_PATTERNS = [
  /\bspigen\b/i,
  /\bcaseology\b/i,    // Spigen 서브브랜드
  /\bcyrill\b/i,       // Spigen 서브브랜드
  /\btough armor\b/i,  // Spigen 대표 제품라인
]

const isSpigenProduct = (
  title: string,
  brand: string | null,
  seller: string | null,
): boolean => {
  const texts = [title, brand, seller].filter(Boolean) as string[]
  return texts.some(text =>
    SPIGEN_PATTERNS.some(pattern => pattern.test(text))
  )
}
```

**서브브랜드 포함 이유**: Caseology, Cyrill은 Spigen의 서브브랜드. 이것도 자사 제품이므로 스킵.

### 3.4 Jobs.ts 통합

```typescript
// 검색 결과에서 Spigen 필터링
const nonSpigenResults = searchResults.filter(r => !r.isSpigen)
const spigenCount = searchResults.length - nonSpigenResults.length

if (spigenCount > 0) {
  log('info', 'jobs', `Skipped ${spigenCount} Spigen products`, { campaignId })
}
spigenSkipped += spigenCount

// nonSpigenResults로 클릭 대상 선정
```

---

## 4. Smart Click Strategy

### 4.1 Click Target Selection

**File**: `crawler/src/scheduler/click-strategy.ts` (new)

```typescript
type ClickTarget = {
  index: number          // searchResults 배열 인덱스
  asin: string
  reason: 'suspect' | 'innocent'  // 왜 선택했는지
}

const selectClickTargets = (
  results: SearchResult[],
  persona: CrawlPersona,
): ClickTarget[] => {
  const maxProducts = persona.navigation.productsToViewPerPage

  // Spigen 제외된 결과만 받음 (이미 필터링됨)
  if (results.length === 0) return []

  // 전체 셔플
  const shuffled = results
    .map((r, i) => ({ ...r, originalIndex: i }))
    .sort(() => Math.random() - 0.5)

  // 최대 productsToViewPerPage개 선택
  const selected = shuffled.slice(0, maxProducts)

  return selected.map(r => ({
    index: r.originalIndex,
    asin: r.asin,
    reason: 'suspect' as const,  // Phase 4에서 AI 판단 추가 시 분류
  }))
}
```

**Phase 4 확장 시** (AI 위반 의심도 판단):
```typescript
// 선택적: Claude에게 검색 결과 전달하여 의심도 분류
const classifyResults = async (
  results: SearchResult[],
  vision: VisionAnalyzer,
): Promise<Map<string, 'high' | 'medium' | 'low'>> => {
  // Haiku에게 제목/가격 목록 전달
  // 의심 높음 우선 + innocent 혼합 전략
}
```

이 부분은 Phase 1~3 안정화 후 추가. 초기에는 랜덤 셔플만 적용.

### 4.2 Jobs.ts 통합

```typescript
// 기존: productsToVisit = 순서대로 선택
// 변경: selectClickTargets()로 랜덤 셔플 선택

const clickTargets = selectClickTargets(nonSpigenResults, persona)

for (const target of clickTargets) {
  const result = nonSpigenResults[target.index]!
  // ... 기존 상세 진입 로직
}
```

---

## 5. AI Persona Evolution Pipeline

### 5.1 학습 데이터 흐름

```
crawler_logs (기존)
  ├─ type: 'crawl_complete'
  ├─ message: JSON { persona, typing, scroll, dwell, success }
  └─ duration_ms, listings_found, listings_sent, errors
          |
          v
/api/ai/learn-crawler (기존, 프롬프트 확장)
  ├─ 기존: 성공/실패 패턴, 프록시, 타이밍
  └─ 추가: 성공 페르소나의 파라미터 범위 추출
          |
          v
ai_learning_records.metrics (기존 테이블)
  └─ successful_persona_ranges: PersonaRanges  // 추천 범위
          |
          v
/api/ai/persona-ranges (new endpoint)
  └─ 최신 추천 범위 반환 → 크롤러가 로드
          |
          v
generatePersona(DEFAULT_RANGES, successRanges)
```

### 5.2 Learn-Crawler 프롬프트 확장

**File**: `src/app/api/ai/learn-crawler/route.ts`

기존 ANALYSIS_PROMPT에 추가:

```
7. **Persona Range Recommendation**: Based on successful crawls, recommend optimal parameter ranges.
   For each dimension (typing, scroll, click, dwell, navigation), provide:
   - The observed range of successful values
   - A recommended range (±15% expansion from observed)

Output additional field:
"recommended_ranges": {
  "typing": {
    "charDelayMin": [observed_min, observed_max],
    "charDelayMax": [observed_min, observed_max],
    ...
  },
  ...
}
```

### 5.3 Persona Ranges API

**File**: `src/app/api/ai/persona-ranges/route.ts`

```typescript
// GET /api/ai/persona-ranges
// Auth: SERVICE_TOKEN
// Returns: 최신 ai_learning_records에서 recommended_ranges 추출
```

### 5.4 Crawler-side Loading

**File**: `crawler/src/anti-bot/persona-ranges.ts`

```typescript
const loadSuccessRanges = async (
  sentinelClient: SentinelClient,
): Promise<PersonaRanges | null> => {
  try {
    const ranges = await sentinelClient.getPersonaRanges()
    return ranges
  } catch {
    log('warn', 'persona', 'Failed to load success ranges, using defaults')
    return null
  }
}
```

---

## 6. CrawlResult 타입 확장

**File**: `crawler/src/types/index.ts`

```typescript
type CrawlResult = {
  campaignId: string
  totalFound: number
  totalSent: number
  duplicates: number
  errors: number
  duration: number
  // 추가
  spigenSkipped: number
  pagesCrawled: number
  personaName: string
}
```

---

## 7. Implementation Order (구현 순서)

### Batch 1: Persona v2 + Spigen Detection (동시 가능)

| # | File | Change | Deps |
|---|------|--------|------|
| 1 | `crawler/src/anti-bot/persona-ranges.ts` | CREATE: Range 타입 + DEFAULT_RANGES + isSpigenProduct() + loadSuccessRanges() | None |
| 2 | `crawler/src/anti-bot/persona.ts` | REWRITE: 고정 프로파일 삭제 → range 기반 generatePersona() | #1 |
| 3 | `crawler/src/types/index.ts` | MODIFY: SearchResult에 sellerName, brand, isSpigen 추가. CrawlResult에 spigenSkipped, pagesCrawled, personaName 추가 | None |
| 4 | `crawler/src/scraper/search-page.ts` | MODIFY: scrapeSearchPage()에서 brand/seller 추출 + isSpigen 판별 | #1, #3 |

### Batch 2: Campaign Result Tracking

| # | File | Change | Deps |
|---|------|--------|------|
| 5 | `supabase/migrations/015_campaign_results.sql` | CREATE: campaigns에 total_sent, total_violations, success_rate 추가 | DB (수동) |
| 6 | `src/app/api/crawler/campaigns/[id]/result/route.ts` | CREATE: PATCH endpoint | #5 |
| 7 | `crawler/src/api/sentinel-client.ts` | MODIFY: updateCampaignResult() 추가 | #6 |

### Batch 3: Smart Click + Jobs Integration

| # | File | Change | Deps |
|---|------|--------|------|
| 8 | `crawler/src/scheduler/click-strategy.ts` | CREATE: selectClickTargets() | #3 |
| 9 | `crawler/src/scheduler/jobs.ts` | MODIFY: Spigen 필터 + 셔플 클릭 + 캠페인 결과 업데이트 + persona v2 | #1~8 |

### Batch 4: AI Evolution (데이터 축적 후)

| # | File | Change | Deps |
|---|------|--------|------|
| 10 | `src/app/api/ai/learn-crawler/route.ts` | MODIFY: 프롬프트에 범위 추천 추가 | None |
| 11 | `src/app/api/ai/persona-ranges/route.ts` | CREATE: 추천 범위 조회 API | #10 |
| 12 | `crawler/src/api/sentinel-client.ts` | MODIFY: getPersonaRanges() 추가 | #11 |
| 13 | `crawler/src/scheduler/jobs.ts` | MODIFY: 성공 범위 로드 → generatePersona()에 전달 | #12 |

---

## 8. Data Flow Diagram

```
[Crawler Session Start]
       |
       v
  loadSuccessRanges() ──→ GET /api/ai/persona-ranges
       |                         |
       v                         v
  generatePersona(defaults, successRanges?)
       |
       v
  [Crawl Execution]
       |
       ├─ Search Results → filter Spigen → shuffle → select targets
       |
       ├─ Detail Pages → scrape → submit batch → listings table
       |
       v
  [Crawl Complete]
       |
       ├─ submitLog() → crawler_logs (persona config in message)
       |
       ├─ updateCampaignResult() → campaigns table
       |
       └─ Google Chat notification

  [Weekly: /api/ai/learn-crawler]
       |
       v
  Claude analyzes logs → extracts success ranges
       |
       v
  ai_learning_records.metrics.recommended_ranges
       |
       v
  (Next crawler session loads these ranges)
```

---

## 9. Testing Strategy

| Test | Method | Verification |
|------|--------|-------------|
| Persona uniqueness | 1000x generatePersona() → Set으로 name 중복 체크 | 0 duplicates |
| min < max constraint | 1000x generatePersona() → 모든 min/max 쌍 검증 | 100% pass |
| Spigen detection | isSpigenProduct() with 20+ test cases | "Spigen", "spigen", "SPIGEN", "Caseology", "Cyrill", non-Spigen |
| Click strategy shuffle | 100x selectClickTargets() → 순서 엔트로피 측정 | 랜덤 분포 |
| Campaign result API | curl PATCH with SERVICE_TOKEN | 200 + DB 값 확인 |
| E2E: Full crawl | Railway deploy → trigger 1 campaign → verify all outputs | listings + logs + campaign update |

---

## 10. Rollback Plan

| Phase | Rollback |
|-------|----------|
| Persona v2 | `generatePersona()` 시그니처 동일 → 기존 호출부 변경 없음. 문제 시 persona.ts만 revert |
| Campaign result | API 추가일 뿐, 실패해도 크롤링에 영향 없음 (fire-and-forget) |
| Spigen filter | `isSpigen` 플래그 기반 → 필터 로직만 주석 처리하면 원복 |
| Smart click | `selectClickTargets()` → 기존 순서대로 선택하는 함수로 교체 |
| AI evolution | `successRanges` null 전달 → 항상 DEFAULT_RANGES 사용 |
