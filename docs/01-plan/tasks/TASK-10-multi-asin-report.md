# TASK-10: 멀티 ASIN 신고 지원

## 상태: TODO
## 우선순위: High
## 예상 난이도: Medium
## 담당: Developer B

---

## 배경

현재 리포트는 1:1 (1 리포트 = 1 ASIN) 구조.
레거시 데이터(27,086건) 중 396건(1.5%)이 멀티 ASIN 신고 (최대 41개).
주로 V10(Variation Policy Violation) — 같은 셀러의 위반 ASIN 여러 개를 한 건으로 묶어 신고.

## 현재 구조

```
reports.listing_id (UUID, NOT NULL, FK) → listings.id
```

1 리포트에 1 listing만 연결 가능.

## 변경 사항

### 1. DB 스키마 변경

```sql
-- reports 테이블에 related_asins 컬럼 추가
ALTER TABLE reports ADD COLUMN related_asins JSONB NOT NULL DEFAULT '[]';

-- 형식: [{"asin": "B08VW17BNK", "marketplace": "US", "url": "https://..."}, ...]
-- listing_id는 메인 ASIN으로 유지 (기존 FK 그대로)
-- related_asins는 추가 ASIN 목록 (FK 없음, 단순 데이터)
```

마이그레이션 파일: `supabase/migrations/0XX_add_related_asins.sql`

### 2. TypeScript 타입 추가

```typescript
// src/types/reports.ts
type RelatedAsin = {
  asin: string
  marketplace?: string
  url?: string
}

// Report 타입에 추가
type Report = {
  // ... 기존 필드
  related_asins: RelatedAsin[]
}
```

### 3. 리포트 생성 UI — 멀티 ASIN 입력

#### `src/app/(protected)/reports/new/NewReportForm.tsx`

현재 ASIN 입력이 단일 텍스트 필드. 멀티 입력으로 확장:

- 기본: 메인 ASIN 1개 (기존 필드, 필수)
- "+ Add ASIN" 버튼으로 추가 ASIN 입력 필드 동적 추가
- 각 추가 ASIN 옆에 제거(X) 버튼
- 최대 50개 제한

```
┌─────────────────────────────────────┐
│ Main ASIN *     [B08K42KJM6    ]   │
│                                     │
│ Related ASINs                       │
│ [B08VW17BNK    ] [X]               │
│ [B08TC7X1HY    ] [X]               │
│ [B07RKMSXSZ    ] [X]               │
│                                     │
│ [+ Add ASIN]                        │
└─────────────────────────────────────┘
```

### 4. 리포트 상세 UI — 멀티 ASIN 표시

#### `src/app/(protected)/reports/[id]/ReportDetailContent.tsx`

리스팅 정보 카드에 related_asins 표시:

- 메인 ASIN: 기존대로 표시
- Related ASINs: 아래에 리스트로 표시
- 각 ASIN 클릭 시 아마존 페이지 새 탭 열기

```
┌─ Listing Info ──────────────────────┐
│ Main ASIN: B08K42KJM6  🔗          │
│                                     │
│ Related ASINs (3):                  │
│  • B08VW17BNK  🔗                  │
│  • B08TC7X1HY  🔗                  │
│  • B07RKMSXSZ  🔗                  │
└─────────────────────────────────────┘
```

### 5. 리포트 API 수정

#### `src/app/api/reports/route.ts` (POST)

```typescript
// Request body에 related_asins 추가
type CreateReportRequest = {
  // ... 기존 필드
  related_asins?: RelatedAsin[]  // 선택
}

// INSERT 시 related_asins 포함
```

#### `src/app/api/reports/route.ts` (GET)

- related_asins 필드 SELECT에 포함 (기존 쿼리에 추가)

### 6. 리포트 목록 UI — ASIN 개수 표시

#### `src/app/(protected)/reports/ReportsContent.tsx`

- ASIN 컬럼에 멀티 ASIN 건은 개수 배지 표시
- 예: `B08K42KJM6 (+3)` 형태

### 7. SC 신고 데이터 연동

#### `src/app/api/reports/[id]/approve/route.ts`

`buildScSubmitData()` 에서 related_asins를:
- sc_submit_data.asin에 메인 ASIN
- sc_submit_data.description 본문에 관련 ASIN 목록 나열
- 또는 SC 폼이 멀티 ASIN을 지원하면 해당 필드에 매핑

### 8. 드래프트 본문에 ASIN 목록 포함

AI 드래프트 생성 시 related_asins가 있으면 본문에 자동 포함:

```
The following ASINs are associated with this violation:
- B08VW17BNK
- B08TC7X1HY
- B07RKMSXSZ
```

## 수정 파일

1. `supabase/migrations/0XX_add_related_asins.sql` — 신규
2. `src/types/reports.ts` — RelatedAsin 타입 추가
3. `src/app/(protected)/reports/new/NewReportForm.tsx` — 멀티 ASIN 입력 UI
4. `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` — 멀티 ASIN 표시
5. `src/app/(protected)/reports/ReportsContent.tsx` — ASIN 개수 배지
6. `src/app/api/reports/route.ts` — POST/GET에 related_asins 포함
7. `src/app/api/reports/[id]/approve/route.ts` — SC 데이터에 반영

## TASK-09 연관

TASK-09(레거시 마이그레이션)에서 asin_list에 복수 ASIN이 있는 건은:
- 첫 번째 ASIN → listing_id (메인)
- 나머지 → related_asins 배열

이 태스크가 먼저 완료되어야 TASK-09에서 멀티 ASIN 데이터를 정상 마이그레이션 가능.

## 테스트

- [ ] 신규 리포트 생성 시 관련 ASIN 추가/제거
- [ ] 리포트 상세에서 모든 ASIN 표시 및 링크 동작
- [ ] 리포트 목록에서 멀티 ASIN 배지 (+N) 표시
- [ ] API: related_asins 저장 및 조회
- [ ] 빈 related_asins ([]) 기본값 정상
- [ ] SC 신고 데이터에 관련 ASIN 포함
