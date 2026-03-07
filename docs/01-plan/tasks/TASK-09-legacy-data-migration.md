# TASK-09: 레거시 신고 데이터 마이그레이션 (27,086건)

## 상태: DONE
## 완료일: 2026-03-06
## 우선순위: High
## 예상 난이도: High
## 담당: Developer D (DB/백엔드)

---

## 선행 작업 (필수)

**TASK-10 (멀티 ASIN 신고 지원)을 먼저 완료할 것.**
- `reports.related_asins` JSONB 컬럼이 추가되어야 레거시 멀티 ASIN 데이터 마이그레이션 가능
- `docs/01-plan/tasks/TASK-10-multi-asin-report.md` 참조

## 배경

기존 OMS(spg_amazon_violation_report.csv)에 27,086건의 실제 아마존 위반 신고 이력이 있음.
이 데이터를 Sentinel DB의 reports 테이블에 completed 상태로 마이그레이션하여:
1. Completed Reports 페이지에서 과거 신고 이력 열람 가능
2. AI 스킬 학습 데이터로 활용 (성공한 신고 본문 패턴 학습)

## 데이터 소스

- 파일: `docs/archive/spg_amazon_violation_report.csv`
- 총 건수: 27,086건
- 성공(Closed): 21,883건 (80.8%)
- 신고 본문 평균 길이: 411자

## 데이터 통계

### Status 분포
| Status | 건수 |
|--------|------|
| Closed | 21,883 |
| Submitted | 4,226 |
| Cancelled | 926 |
| Requested | 51 |

### 위반 유형 분포 (V코드 매핑 포함)
| 카테고리 | 건수 | Sentinel V코드 |
|----------|------|---------------|
| Variation (Size/Color/Style) | 17,398 | V10 |
| Image (Hand/Background/Text/Props) | 3,286 | V08 |
| Listing/Category | 4,178 | V07 |
| Review | 1,033 | V11, V12 |
| Other | 178 | V01, V05 등 |

## 마이그레이션 순서

### Step 1: 시스템 유저 생성

마이그레이션 데이터의 `created_by`로 사용할 시스템 유저 필요.

```sql
INSERT INTO users (id, email, name, role, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'legacy-import@sentinel.system',
  'Legacy Import',
  'admin',
  now()
);
```

### Step 2: listings 테이블 INSERT

CSV의 `asin_list` (JSON 배열)에서 ASIN과 URL을 추출하여 listings에 먼저 INSERT.

```
CSV asin_list 형식:
[{"value": "B08K42KJM6", "url": "https://www.amazon.com/.../dp/B08K42KJM6/..."}]
```

```sql
-- listings INSERT 시 필요한 필드
INSERT INTO listings (
  asin,                  -- asin_list[0].value
  marketplace,           -- URL에서 추출 (amazon.com -> US, amazon.co.uk -> UK 등)
  title,                 -- NULL (레거시에 없음)
  seller_name,           -- violation_seller_name
  source,                -- 'legacy'
  source_campaign_id,    -- NULL
  source_user_id,        -- 시스템 유저 ID
  is_suspect,            -- true
  created_at             -- CSV created_at
)
```

**주의**: asin_list에 복수 ASIN이 있을 수 있음 -> 첫 번째 ASIN 사용 또는 각각 분리

### Step 3: violation_detail_name -> V코드 매핑

```javascript
const LEGACY_VIOLATION_MAP = {
  // V10 - Variation Policy Violation (17,398건)
  'Size variation': 'V10',
  'Size variation 1': 'V10',
  'Size variation 2': 'V10',
  'Size variation 3 - dropdown': 'V10',
  'Size variation 4': 'V10',
  'Size variation / style variation': 'V10',
  'Style variation': 'V10',
  'Style variation 2': 'V10',
  'Color variation': 'V10',
  'Color variation - Different type of products': 'V10',
  'Color variation - Different number of packs': 'V10',
  'Color variation - Different material': 'V10',
  'Color variation - Different sizes of products': 'V10',
  'Color variation - different car model': 'V10',
  'Model variation': 'V10',
  'Different size Apple watch cases': 'V10',
  'Different size Apple watch cases - dropdown': 'V10',
  'Different number of packs': 'V10',
  'Different type of products': 'V10',
  'Different products': 'V10',
  'Different ASIN, same product (Same seller)': 'V10',
  'Reviews for different products': 'V10',

  // V08 - Image Policy Violation (3,286건)
  'Person\'s hand': 'V08',
  'Person\'s hand & non-pure white background': 'V08',
  'Non-pure white background': 'V08',
  'Non-product image & background': 'V08',
  'Mannequins & non-pure white background': 'V08',
  'Mannequins': 'V08',
  'Text': 'V08',
  'Text on the product': 'V08',
  'Text + Image': 'V08',
  'Props': 'V08',
  'Best Seller tagged #1': 'V08',
  'Multiple views of a single product': 'V08',
  'Multiple images of the same product': 'V08',
  'Zoomed image': 'V08',
  'Wearable- Main Image Contains Additional Product Images': 'V08',
  'promotional text': 'V08',

  // V07 - Inaccurate Product Info (4,178건)
  'Listing before device announcement': 'V07',
  'Wrong category': 'V07',

  // V11 - Review Manipulation (1,033건)
  'Review before announcement 2': 'V11',
  'Review before device announcement': 'V11',
  'Revised - Review before announcement': 'V11',
  'Review trade-1': 'V11',
  'Suspicious fake review': 'V11',
  'Compensation for reviews': 'V11',

  // V01 - Trademark Infringement
  'A product detail page is unlawfully using my trademark.': 'V01',
  'Others (ex: Samsung logo on the brand page)': 'V01',

  // V02 - Copyright Infringement
  'The image is used without authorization on the Product Detail Page': 'V02',
  'The physical product or its packaging includes unauthorized copyrighted content or images without being pirated': 'V02',

  // V05 - False Advertising (기타)
  'Spigen Beauty': 'V05',
  'Incorrect title information': 'V07',
  'Graphics on the device': 'V08',
  'a doll popping out of the device': 'V08',
  'Prop-Car': 'V08',
  'Device combined': 'V08',
}

// 매핑 안 되는 것: 'Custom', 'Others', 'Multiple offers', '' (빈값) -> V05 fallback
```

### Step 4: reports 테이블 INSERT

```sql
INSERT INTO reports (
  listing_id,                -- Step 2에서 생성한 listing ID
  user_violation_type,       -- Step 3 매핑 결과 (V코드)
  violation_category,        -- V코드에서 자동 결정
  status,                    -- 아래 매핑표 참조
  draft_title,               -- violation_detail_name
  draft_body,                -- violation_detail_template
  draft_evidence,            -- violation_images -> JSON 변환 (없으면 [])
  draft_policy_references,   -- [] (레거시에 없음)
  ai_analysis,               -- { legacy: true, legacy_id: amazon_violation_report_id, legacy_note: violation_note, legacy_comment: violation_reporter_comment, legacy_history: reported_history }
  created_by,                -- 시스템 유저 ID
  created_at,                -- CSV created_at
  updated_at,                -- CSV updated_at
  -- Closed 건 추가 필드
  resolved_at,               -- reporter_closed_at
  sc_submitted_at,           -- reporter_requested_at
  -- Cancelled 건 추가 필드
  cancellation_reason        -- reporter_cancelled_reason
)
```

### Status 매핑

| CSV status | -> reports.status |
|-----------|------------------|
| Closed | resolved |
| Submitted | submitted |
| Cancelled | cancelled |
| Requested | pending_review |

### Step 5: source 컬럼 추가 (신규)

레거시 데이터를 구분하기 위해 reports 테이블에 source 컬럼 추가.

```sql
ALTER TABLE reports ADD COLUMN source TEXT NOT NULL DEFAULT 'sentinel';
-- 값: 'sentinel' (기본, Sentinel에서 생성), 'legacy' (OMS 마이그레이션), 'extension' (익스텐션)

-- 마이그레이션 데이터는 source = 'legacy'
```

### Step 6: 중복 방지

기존 unique index `idx_reports_unique_active`가 있으므로:
- 레거시 데이터는 대부분 resolved/cancelled → unique constraint에 안 걸림
- 그래도 INSERT 시 ON CONFLICT 처리 필요

## 마이그레이션 스크립트

Node.js 스크립트로 작성 권장 (`scripts/migrate-legacy-reports.ts`):

```
1. CSV 파일 읽기 (csv-parse 라이브러리)
2. 배치 단위 처리 (100건씩)
3. 각 건별:
   a. asin_list JSON 파싱 -> ASIN, URL 추출
   b. listings upsert (ASIN + marketplace로 중복 체크)
   c. violation_detail_name -> V코드 매핑
   d. reports INSERT
4. 실패 건 로그 (별도 CSV)
5. 결과 요약 출력
```

## 신고 본문 템플릿 패턴 (AI 스킬 학습용)

### Variation (V10) 템플릿 패턴

```
The seller violated the variation theme policy.

According to Amazon's policy, cell phones & accessories should not include a "size variation".

If you check the seller's listing, there is a size variation.

[iPhone 12 Mini, iPhone 12 Pro, iPhone 12 Pro Max]

Different types of products should be listed separately.

We request you to review the seller's listing and take appropriate action on this seller.
```

### Image (V08) 템플릿 패턴

```
The seller has violated the main image policy.

According to Amazon policy, the main image must not contain a person's hand.
The main image must contain only the product.

If you check the image, there is a person's hand, which is against Amazon policy.

Please investigate the seller's main image and take appropriate action on this seller.
```

### 구조 공통 패턴

```
1. 위반 사실 선언 (The seller violated/has violated...)
2. 아마존 정책 인용 (According to Amazon's policy...)
3. 구체적 증거 (If you check the seller's listing...)
4. 조치 요청 (We request you to review/Please investigate...)
```

## 수정 파일

1. `supabase/migrations/0XX_add_reports_source.sql` — source 컬럼 추가
2. `scripts/migrate-legacy-reports.ts` — 신규, 마이그레이션 스크립트
3. `src/types/reports.ts` — source 필드 추가
4. `src/app/(protected)/reports/ReportsContent.tsx` — 레거시 리포트 표시 (source 배지)
5. `src/lib/ai/skills/` — 레거시 템플릿 패턴을 V08.md, V10.md 등에 반영

## 테스트

- [ ] 마이그레이션 스크립트 실행 (dry-run 모드)
- [ ] 전체 27,086건 INSERT 성공
- [ ] V코드 매핑 정확성 (랜덤 샘플 50건 수동 확인)
- [ ] listings 중복 없음 (같은 ASIN 중복 INSERT X)
- [ ] Completed Reports 페이지에서 레거시 데이터 열람
- [ ] source='legacy' 필터링 동작
- [ ] 기존 Sentinel 리포트에 영향 없음
